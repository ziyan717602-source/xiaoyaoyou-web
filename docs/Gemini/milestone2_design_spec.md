# 仙剑逍遥游 Web版 - Milestone 2: 技术落地设计文档与测试大纲

> **目标**：彻底解决 Node.js 环境下 AI 执行瞬间穿透导致的体验崩塌问题，引入虚拟客户端与人工延时；并完成牌库在极端耗尽情况下的生命周期重构与安全降级。

---

## 一、AI 虚拟化与时间流控机制（Architecture & Code）

在重构后的架构中，AI 策略层不应直接操纵核心引擎的状态，而应当包装为一个实现了监听/发送接口的 `VirtualAIClient`。在处理 Milestone 1 约定的 `InputRequest` 时，必须强行注水（Artificial Delay），让全服玩家能清晰感知“某角色正在进行决策”。

### 1.1 `VirtualAIClient` 架构设计与 TypeScript 实现

```typescript
// src/server/ai/virtual-ai-client.ts

import { InputRequestOptions, PlayerActionPayload } from '../../shared/game/engine/input-manager';
import { GameSession } from '../game-session';
import { computeAIAction } from './ai-strategy'; // 原有逻辑剥离出的纯策略计算器

/**
 * 虚拟 AI 客户端：模拟人类玩家的网络延迟与思考时间
 */
export class VirtualAIClient {
    constructor(
        public readonly uid: string, 
        public readonly aiLevel: 'Rule' | 'Greedy' | 'Random',
        private session: GameSession 
    ) {}

    /**
     * 引擎通过 InputManager 广播 InputRequest 时，如果 allowedPlayers 包含此 AI，
     * Session 会路由调用此方法。
     */
    public async handleInputRequest(request: InputRequestOptions): Promise<void> {
        // 1. 判断自己是否在允许响应的列表中
        if (!request.allowedPlayers.includes(this.uid)) return;

        // 2. 模拟真实思考，进行第一阶人工延迟 (Artificial Delay)
        // 计算延迟时间：基准 1500ms，加 0~1000ms 随机抖动
        const thinkingTimeMs = 1500 + Math.random() * 1000;
        
        // 3. 向全服广播状态（告知前端展现“思考中...”特效）
        this.session.broadcastUIEvent({
            type: 'ui_event',
            action: 'AI_THINKING',
            uid: this.uid,
            duration: thinkingTimeMs
        });

        // 4. 挂起执行流，等待延时结束
        await this.sleep(thinkingTimeMs);

        // 5. 调用核心策略器计算该如何应对此请求
        const actionPayload: PlayerActionPayload = computeAIAction(this.uid, this.aiLevel, request);

        // 6. 提交最终动作回服务端输入总线
        this.session.submitPlayerAction(this.uid, actionPayload);
    }

    /**
     * 简单的非阻塞延时辅助函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

**与引擎交互流说明**：
- 前端收到 `{"type": "ui_event", "action": "AI_THINKING", "uid": "ai_1"}` 后，将在该 AI 的头像上方展示类似“💬 思考中...”的气泡或骨架屏（Skeleton Loading），缓解人类玩家在等待期间的焦虑感并明示当前行动权归属。

---

## 二、牌库生命周期与重洗机制重构（Engine Logic & Code）

当 56 张初始卡牌（`tuxPile`）抽空时，需要捕获临界并触发洗牌（Shuffle）逻辑，将 `discardPile`（弃牌堆）无缝补入。同时必须拦截极端恶劣情况（例如：所有牌均已发放到玩家手牌和装备槽，导致堆里无牌可洗），防止死循环和抛错。

### 2.1 核心抽牌接口设计与边界拦截

```typescript
// src/shared/game/board.ts (或者专用的 DeckManager)

import { Card } from './card';

export class GameBoard {
    public tuxPile: Card[] = [];
    public discardPile: Card[] = [];

    /**
     * 洗牌算法：使用 Fisher-Yates (Knuth) Shuffle 打乱数组
     */
    private shuffleCards(cards: Card[]): Card[] {
        const array = [...cards];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * 安全抽牌机制，支持自动重洗与防崩降级处理
     * @param count 需要抽取的数量
     * @param uid 目标玩家（用于日志记录）
     */
    public drawTuxSafe(count: number, uid: string): Card[] {
        const drawnCards: Card[] = [];
        let remainingToDraw = count;

        while (remainingToDraw > 0) {
            // 如果主牌堆还有牌，优先抽取
            if (this.tuxPile.length > 0) {
                const drawCount = Math.min(this.tuxPile.length, remainingToDraw);
                // 从牌堆顶端弹出
                drawnCards.push(...this.tuxPile.splice(0, drawCount));
                remainingToDraw -= drawCount;
            } 
            
            // 如果还缺牌，且主牌堆已空，执行重洗逻辑
            if (remainingToDraw > 0 && this.tuxPile.length === 0) {
                if (this.discardPile.length > 0) {
                    // 常规边界：有弃牌可洗
                    console.log(`[Deck System] 牌堆耗尽，将弃牌堆(${this.discardPile.length}张)洗牌后重置入主牌堆...`);
                    this.tuxPile = this.shuffleCards(this.discardPile);
                    this.discardPile = []; // 清空弃牌堆
                    
                    // 可选：触发全服广播，前端展示“洗牌”动效
                    this.broadcastEvent({ type: 'sys_event', action: 'DECK_SHUFFLED' });
                } else {
                    // 极端边界防崩 (Fallback)：主牌堆和弃牌堆全部为空（牌全在场上）
                    console.warn(`[Deck System] 极度枯竭！弃牌堆亦为空，玩家 ${uid} 无法再摸入剩余的 ${remainingToDraw} 张牌。`);
                    break; // 安全跳出循环，放弃剩余的抽卡需求，直接结算已抽到的部分
                }
            }
        }

        return drawnCards;
    }
}
```

---

## 三、Milestone 2 核心测试大纲（Test Cases）

以下 3 个集成测试用例必须覆盖，以确立系统的抗压底线和时序准确性。

### TC-01: AI 延时与 UI 状态广播验证 (Virtual AI Timing Control)
*   **前置条件**：当前正处于事件阶段（EV），轮到 AI 控制的角色。
*   **操作与监听**：
    1. 使用 Mock 定时器（`vi.useFakeTimers()`）。
    2. 断言引擎广播出 `InputRequest` 且被 `VirtualAIClient` 捕获。
    3. 断言立即（立刻）收到全服下发的 `{"type": "ui_event", "action": "AI_THINKING"}` 广播包。
    4. 推进时间 `< 1500ms`，断言服务端未收到 AI 的 `PlayerAction`，引擎仍处于挂起状态。
    5. 推进时间 `> 2500ms`，断言 `PlayerAction` 已被成功生成并提交至 `InputManager`，主引擎挂起结束，流转至下一状态。

### TC-02: 牌库常规边界抽空重洗测试 (Deck Shuffle Reconstitution)
*   **前置条件**：强制设置 `board.tuxPile` 仅剩余 **2 张**牌，设置 `board.discardPile` 为 **10 张**已使用的牌。
*   **操作流**：玩家触发打怪成功，执行 `drawTuxSafe(4, 'player_1')`。
*   **断言要求**：
    1. 方法成功返回 **4 张**牌对象。
    2. `board.tuxPile` 现在的长度应为 `8 张`（2张耗尽 + 10张新洗 - 补充缺失的2张 = 8）。
    3. `board.discardPile` 被成功清空，长度为 `0`。
    4. 触发了一次 `DECK_SHUFFLED` 系统广播事件。

### TC-03: 极端干涸死锁规避测试 (Extreme Deck Depletion Fallback)
*   **前置条件**：极端干预状态机，清空所有的堆：设置 `board.tuxPile = []` 且 `board.discardPile = []`。
*   **操作流**：某技能强行触发了抽取 3 张牌的行为：`drawTuxSafe(3, 'player_1')`。
*   **断言要求**：
    1. 函数执行过程中**绝不应抛出崩溃异常（No Exception Thrown）**，防止导致整个游戏实例卡死或 Crash。
    2. 函数应安全地返回一个空数组 `[]`（抽到了 0 张牌）。
    3. 玩家的手牌数没有增加，状态机平稳进入下方的 `discardPhase`（弃牌阶段）。
