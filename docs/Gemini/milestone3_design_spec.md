# 仙剑逍遥游 Web版 - Milestone 3: 前端技术落地与组件设计文档

> **目标**：彻底告别基于命令行的中央文本弹窗交互，全面适配 Milestone 1 的 JSON 协议，实现“所见即所得”的现代化桌游触控流体验，引入剧场级卡牌展示动画。

---

## 一、核心交互组件重构：两步式“点控”状态机

为了承接 JSON 化的 `InputRequest`，前端必须构建一个中央状态 Hook（或 Store），用以管理**发包前的本地暂存状态**。

### 1.1 `useGameInput` 核心状态机钩子（React / TypeScript 伪代码）

```typescript
// src/client/hooks/useGameInput.ts

import { useState, useCallback, useMemo } from 'react';
import { InputRequest, PlayerActionPayload } from '../../shared/network/protocol';

export function useGameInput(currentRequest: InputRequest | null, sendAction: (payload: PlayerActionPayload) => void) {
    // --- 1. 本地中间状态维护 ---
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
    const [selectedTargetUids, setSelectedTargetUids] = useState<string[]>([]);
    
    // --- 2. 交互状态推导 ---
    // 当前需要进行的动作要求（假设仅处理 PLAY_CARD）
    const playCardDef = currentRequest?.allowedActions.find(a => a.actionType === 'PLAY_CARD');
    
    // 是否处于“待选目标”状态：已经选够了牌，且该牌要求指定目标，但目前还没选够目标
    const isWaitingForTarget = useMemo(() => {
        if (!playCardDef) return false;
        const hasSelectedCard = selectedCardIds.length >= (playCardDef.min || 1);
        const requiresTarget = playCardDef.requiresTarget !== false; // 默认需指定目标
        const hasSelectedTarget = selectedTargetUids.length >= 1; 
        return hasSelectedCard && requiresTarget && !hasSelectedTarget;
    }, [playCardDef, selectedCardIds, selectedTargetUids]);

    // --- 3. 手牌高亮与交互逻辑 ---
    // 判断一张手牌是否允许被点击（点亮它！）
    const isCardSelectable = useCallback((cardId: string) => {
        if (!playCardDef) return false;
        // 如果不在后端的白名单里，禁用
        if (playCardDef.validCardIds && !playCardDef.validCardIds.includes(cardId)) return false;
        // 如果已经选满了最大数量，且此牌未被选中，禁用
        if (selectedCardIds.length >= (playCardDef.max || 1) && !selectedCardIds.includes(cardId)) return false;
        return true;
    }, [playCardDef, selectedCardIds]);

    const toggleCardSelection = useCallback((cardId: string) => {
        if (!isCardSelectable(cardId)) return;
        setSelectedCardIds(prev => {
            if (prev.includes(cardId)) {
                // 取消选中卡牌时，顺便清空已选目标，防脏数据
                setSelectedTargetUids([]);
                return prev.filter(id => id !== cardId);
            }
            return [...prev, cardId];
        });
    }, [isCardSelectable]);

    // --- 4. 目标高亮与交互逻辑 ---
    const isTargetSelectable = useCallback((targetUid: string) => {
        if (!isWaitingForTarget) return false; // 牌都没选好，不准选目标
        if (playCardDef?.validTargetIds && !playCardDef.validTargetIds.includes(targetUid)) return false;
        return true;
    }, [isWaitingForTarget, playCardDef]);

    const toggleTargetSelection = useCallback((targetUid: string) => {
        if (!isTargetSelectable(targetUid)) return;
        setSelectedTargetUids(prev => prev.includes(targetUid) ? [] : [targetUid]);
    }, [isTargetSelectable]);

    // --- 5. Payload 拼装与提交 ---
    const submitAction = useCallback(() => {
        if (!currentRequest) return;
        sendAction({
            type: 'player_action',
            requestId: currentRequest.requestId,
            actionType: 'PLAY_CARD',
            payload: { cardIds: selectedCardIds, targetIds: selectedTargetUids }
        });
        // 提交后立刻清空本地状态
        setSelectedCardIds([]);
        setSelectedTargetUids([]);
    }, [currentRequest, selectedCardIds, selectedTargetUids, sendAction]);

    const skipAction = useCallback(() => {
        if (!currentRequest?.optional) return;
        sendAction({ type: 'player_action', requestId: currentRequest.requestId, actionType: 'SKIP', payload: {} });
    }, [currentRequest, sendAction]);

    return {
        selectedCardIds, toggleCardSelection, isCardSelectable,
        selectedTargetUids, toggleTargetSelection, isTargetSelectable,
        isWaitingForTarget, submitAction, skipAction
    };
}
```

**组件数据绑定链路：**
在 `HandArea`（手牌组件）中，遍历渲染卡牌时，传入 `isSelectable={isCardSelectable(card.id)}`。如果在白名单内，则为其加上流光描边和 `cursor-pointer`。

---

## 二、视觉中心“剧场模式”与信息降噪（Visual Architecture）

彻底清除堆积如山的文本日志记录框，将视觉还给原画，引入现代卡牌的**模态（Modal）打光与悬浮（Hover）设计**。

### 2.1 剧场模式（Theater Mode / 3D Reveal）

当监听到核心系统广播 `EV_REVEAL`（翻开事件卡）或 `ZM_REVEAL`（遭遇怪物）时，前端在最高层级（z-index）唤起一个剧场聚焦罩。

**CSS 架构设计：**
```css
/* src/client/styles/theater.css */

.theater-backdrop {
    position: fixed;
    inset: 0;
    /* 强烈的模糊降噪与压暗 */
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.3s ease-out;
}

.theater-card-container {
    perspective: 1000px;
}

.theater-card-flip {
    width: 280px;
    height: 400px;
    transform-style: preserve-3d;
    /* 配合登场音效的 3D 翻转入场 */
    animation: flipInCard 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

/* 金色高光 / 聚光灯效果 */
.theater-card-flip::after {
    content: '';
    position: absolute;
    inset: -20px;
    background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%);
    z-index: -1;
    animation: pulseLight 2s infinite alternate;
}

@keyframes flipInCard {
    0% { transform: translateZ(-500px) rotateY(180deg); opacity: 0; }
    100% { transform: translateZ(0) rotateY(0deg); opacity: 1; }
}
```

**交互流**：当怪兽翻出时，画面变暗，大尺寸精美怪兽原画 3D 翻转震动至屏幕中央，下方仅显示极简文本（如：“遭遇 熔岩兽王！”），2~3 秒后动画结束，卡牌平滑缩小移动并吸附至常规的 `BattleArea` 插槽中。

### 2.2 信息降噪：卡牌信息抽屉（CardTooltip Binding）

**核心痛点**：当前战斗面板把怪兽的“出场/胜利/失败效果”等一大堆文字死硬地渲染在屏幕上，极度占位且丑陋。

**重构思路（Hover Portal）**：
开发一个基于全局 Portal 的 `<CardTooltip />` 组件，无论是在手牌区、还是场上怪物区。
1. **触发机制**：为所有底层 `CardImage` 组件注入 `onMouseEnter` / `onMouseLeave` 事件。
2. **位置捕捉**：使用 `getBoundingClientRect()` 获取当前悬浮卡牌的屏幕绝对坐标。
3. **分层渲染**：向顶部的 React Portal 注入当前卡牌的元数据对象（Metadata），由 Tooltip 组件脱离父容器约束，在卡牌侧边优雅弹出一个**深色玻璃态（Glassmorphism）面板**，内部规整呈现战力、技能、掉落等格式化信息。

---

## 三、Milestone 3 核心验收标准（UI/UX Acceptance Criteria）

这些验收标准是检验重构是否带来真正“手感”的准绳，请在集成联调时逐一通过：

### UI-01: 技牌点选连贯性验证（State Linkage Check）
*   **情景模拟**：进入技牌阶段（允许使用 `偷盗`，需指定目标）。
*   **操作流测试**：
    1. 观察手牌区，非目标手牌应为半透明变暗状态；`偷盗`手牌高亮。
    2. 点击 `偷盗` 卡牌：卡牌应当立刻在 Y 轴上浮（`translateY(-15px)`），且下方出现发光托盘。
    3. 此时观察对手头像区域：应全部自动出现金色准星（高亮），同时手牌区的其余卡牌变灰锁定。
    4. 再次点击 `偷盗` 取消选择：卡牌回落，对手头像的高亮准星消散，恢复到初始态。
    5. （重新选中后）点击有效目标头像：操作面板应瞬间将组装好的 Action Payload 打包上发，随后所有悬浮高亮状态全部清空，等待服务器下一帧渲染。

### UI-02: AI 思考状态防抖锁定（Lock-out & Skeleton）
*   **情景模拟**：引擎分配了操作权给 AI 对手，并向全服广播 `AI_THINKING`。
*   **操作流测试**：
    1. UI 层应立即捕捉到该消息。
    2. 敌方 AI 的头像旁应弹出 `...正在思考...` 的气泡动画。
    3. **关键拦截**：此时人类玩家试图疯狂点击自己手里的【隐蛊】或【战牌】，前端输入钩子必须将其拦截。卡牌拒绝任何 `hover` 或 `click` 事件。
    4. 直至 AI 决策下发且执行动作结束，输入锁才会被释放。

### UI-03: 跳过阶段的二次防呆挽留（Anti-Miss-Click Warning）
*   **情景模拟**：进入 `ZD`（战牌阶段），玩家手中明明持有极为关键的合法战牌（如“金蚕王”）。
*   **操作流测试**：
    1. 玩家未选择任何卡牌，直接点击了屏幕右下角亮起的【直接跳过】按钮。
    2. **预期拦截**：前端探测到 `validCardIds` 数组不为空（即玩家有牌可打却选择空过）。
    3. **反馈**：不要直接发包！必须从按钮上方弹出一个极快动画的轻量级气泡警告（Toast）：“**您手中有可用的战牌，确定要保留并跳过吗？**”，气泡提供 [确认跳过] / [手滑了]。
    4. 此机制旨在拯救由于网络对局或手机触屏导致的高频低级失误。但若玩家手中本来就没有合法战牌，则点击跳过必须丝滑通过，不做任何阻拦。
