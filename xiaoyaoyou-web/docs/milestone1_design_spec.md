# 仙剑逍遥游 Web版 - Milestone 1: 技术落地设计文档与测试大纲

> **目标**：重构核心引擎调度为 Async 挂起式状态机，废除 C# 格式化字符串，全量切换至现代前端友好的 JSON 协议范式。

---

## 一、引擎 Async 重构接口设计（代码级）

为了实现引擎生命周期中的合法挂起，我们需要将原本基于全量回调或事件通知的流程改写为基于 `async/await` 的结构，并统一通过 `InputManager` 来托管阻塞与恢复。

### 1.1 核心等待机制接口定义 (`waitForInput`)

```typescript
// src/shared/game/engine/input-manager.ts

/**
 * 前端可执行的具体动作定义
 */
export interface ActionDefinition {
    actionType: 'PLAY_CARD' | 'USE_SKILL' | 'SELECT_TARGET' | 'CONFIRM' | 'CHOOSE_OPTION';
    // 约束条件（用于后端校验及前端点亮对应的 UI）
    validCardIds?: string[];      // 仅允许打出的卡牌代码（如：ZP01, ZP02）
    validSkillIds?: string[];     // 仅允许触发的技能代码
    validTargetUids?: string[];   // 合法的目标对象（角色、怪物等）
    min?: number;                 // 最少选择数量
    max?: number;                 // 最多选择数量
    options?: { id: string, label: string }[]; // 给定选项（用于阵营选择、分支选择）
}

/**
 * 发起输入请求的参数配置
 */
export interface InputRequestOptions {
    requestId: string;
    phase: string;                // 当前游戏阶段（ZD, ZW, etc.）
    prompt: string;               // 提示文本
    allowedPlayers: string[];     // 有权响应此请求的玩家 UID 列表（阵营隔离核心）
    timeoutMs?: number;           // 超时毫秒数（留空则无限等待，一般必须传）
    optional: boolean;            // 是否允许玩家点“跳过/取消”
    allowedActions: ActionDefinition[]; // 允许的交互动作聚合
}

/**
 * 等待玩家输入的核心方法（挂起当前执行栈）
 * @returns 玩家合法的操作结果，超时或主动跳过返回 null
 */
export async function waitForInput(options: InputRequestOptions): Promise<PlayerActionPayload | null>;
```

### 1.2 主流程重构伪代码示例（以 ZD 战牌阶段为例）

战牌阶段的难点在于：双方轮流出牌（战力低者先出），必须准确挂起，并且一方放弃后需移交操作权，直至双方均放弃。

```typescript
// src/shared/game/engine/phases/combat-zd.ts

import { waitForInput } from '../input-manager';

export async function runZDPhase(context: CombatContext): Promise<void> {
    let bothSkipped = false;
    let skipCount = 0;

    while (!bothSkipped) {
        // 1. 根据当前战力判定哪一方出牌
        const activeTeam = determineLowestPowerTeam(context);
        // 2. 根据阵营获取允许响应的玩家列表
        const allowedPlayers = getAllAliveTeammates(activeTeam); 

        // 3. 构造状态机挂起（阻塞在这里，等待 Socket 响应或超时）
        const action = await waitForInput({
            requestId: `ZD-${Date.now()}`,
            phase: 'ZD',
            prompt: '请打出一张战牌，或跳过',
            allowedPlayers: allowedPlayers,
            timeoutMs: 15000, 
            optional: true,
            allowedActions: [
                {
                    actionType: 'PLAY_CARD',
                    // 在此处实时过滤该队伍所有人手里所有的合法战牌
                    validCardIds: getValidCombatCardsForTeam(activeTeam),
                    min: 1,
                    max: 1
                },
                {
                    actionType: 'USE_SKILL',
                    validSkillIds: getValidCombatSkillsForTeam(activeTeam)
                }
            ]
        });

        if (!action || action.actionType === 'SKIP') {
            // 4. 超时或玩家主动跳过
            skipCount++;
            if (skipCount >= 2) {
                bothSkipped = true; // 双方连续跳过，战牌阶段结束
            }
            continue; 
        }

        // 5. 进行深度校验并执行动作
        if (validateActionInContext(action, context)) {
            await applyAction(action, context);
            skipCount = 0; // 成功打牌，打断跳过计数器
            // 此处可执行短暂的 delay，给前端预留动画播放时间
            await delay(1000); 
        } else {
            // 无效操作：通过独立通道发送报错，循环不中断（由于 waitForInput 内部应挡住明显非法，这属于防作弊层）
            sendErrorToPlayer(action.uid, '操作不合法或目标错误');
        }
    }
}
```

---

## 二、通信协议 JSON 化范式（Schema 设计）

彻底抛弃 `T1(p1p2)` 及 `/Q` 语法，构建由服务端完全定义交互能力（Capabilities）、由前端按图索骥渲染 UI 的 JSON 协议。

### 2.1 服务端下发：`InputRequest` Schema

当服务端执行 `waitForInput` 时，通过 WebSocket 向**所有**客户端广播（或仅向下发给 `allowedPlayers`，视防作弊需求定）。

```json
{
  "type": "input_request",
  "requestId": "req_zd_98765",
  "phase": "ZD",
  "prompt": "我方战力落后，请打出一张战牌！",
  "timeoutMs": 15000,
  "optional": true,
  "allowedPlayers": ["player_A1", "player_A2"],
  "allowedActions": [
    {
      "actionType": "PLAY_CARD",
      "validCardIds": ["ZP01", "ZP02", "ZP03"], // 前端收到后，将这几张牌高亮，解除禁用
      "min": 1,
      "max": 1,
      "requiresTarget": false // 打战牌(金蚕王等)一般不需要指定目标，直接生效于本方
    },
    {
      "actionType": "USE_SKILL",
      "validSkillIds": ["SK_XJ401_THJ"] // 云天河-天河剑 等战牌阶段技能
    }
  ]
}
```

### 2.2 客户端提交：`PlayerAction` Schema

当前端用户完成“点击手牌 $\rightarrow$ 确认”后，将此 Payload 发回服务器。如果是超时或跳过，则直接发 `SKIP`。

```json
// 场景一：打出卡牌并选定了目标（如果是技牌）
{
  "type": "player_action",
  "requestId": "req_zd_98765",
  "actionType": "PLAY_CARD",
  "payload": {
    "cardIds": ["ZP01"],
    "targetUids": [] // 如果 actionType 规定了 requiresTarget: true 则此处必须传
  }
}

// 场景二：主动放弃操作/跳过
{
  "type": "player_action",
  "requestId": "req_zd_98765",
  "actionType": "SKIP",
  "payload": {}
}
```

**前端 UX 对接说明：**
前端 `InputController` 接收到 JSON 后，不再弹出死板的对话框。
1. 若看到 `PLAY_CARD`，就去触发 `HandArea`（手牌区）的状态变更，将对应 ID 的卡牌设为 `cursor-pointer` 和光效描边。
2. 若看到 `requiresTarget: true`，就在选完牌后，将其他玩家的头像或怪物卡点亮，提示玩家继续点击。
3. 若允许 `optional: true`，则在屏幕右下角渲染一个带有倒计时进度条的 `[跳过本阶段]` 按钮。

---

## 三、Milestone 1 核心测试大纲（Test Cases）

本大纲聚焦于核心调度机制的抗错性与状态一致性。在 Vitest 环境下编写集成测试，模拟完整的异步交互流。

### TC-01: ZD 阶段的超时自动放行测试（Robust Suspend & Timeout）
*   **前置条件**：模拟游戏进入 ZD（战牌阶段），A队战力落后。
*   **操作流**：
    1. 引擎执行 `await waitForInput`，向 A队发起 15 秒 timeout 的请求。
    2. 模拟 Socket 环境在 15 秒内未收到任何 `player_action` 消息。
*   **期望断言**：
    *   计时器触发后，`waitForInput` 自动返回 `null`。
    *   主逻辑不受死锁，进入 B队出牌询问，B队同样超时后，战斗平稳过渡到下一个 `ZN`（战斗结算）阶段。

### TC-02: ZW 阶段的防作弊与阵营鉴权测试（Faction Isolation）
*   **前置条件**：模拟进入 ZW（妨碍者选择阶段），触发者为 A队 李逍遥。
*   **操作流**：
    1. 引擎计算妨碍者应由 B队 选择，`allowedPlayers` 数组仅包含 `['player_B1', 'player_B2']`。
    2. 伪造前端操作，以 A队 玩家（如 `player_A2`）的身份主动发送选定妨碍者的 `player_action`。
*   **期望断言**：
    *   服务端的 `InputManager` 拦截并拒绝此动作（非 allowedPlayers）。
    *   引擎**不退出挂起状态**，此时如果伪造的倒计时还剩 10 秒，系统必须继续等待 B队 的合法操作。
    *   随后由 B队 玩家发送请求，引擎接收，挂起结束并向下执行。

### TC-03: 强制抢断与并发输入仲裁测试（Concurrency & Interrupt）
*   **前置条件**：某玩家受到伤害，触发冰心诀或隐蛊的响应窗口（全局并发）。
*   **操作流**：
    1. 引擎针对所有拥有隐蛊的存活玩家（如 `player_A1` 和 `player_B1`）发起并发请求。
    2. 模拟两个玩家以极短时间差（如相差 5ms）同时发送使用道具的 `player_action`。
*   **期望断言**：
    *   状态机只采纳**第一个**到达请求并解除全员挂起。
    *   针对第二个到达的包，因为 `requestId` 已失效或被消费，引擎作抛弃处理并回复无效响应。
    *   避免“同一道具判定重复结算两次伤害减免”的并发污染。

### TC-04: 输入参数的深度合法性校验闭环（Payload Validation）
*   **前置条件**：请求某玩家出 1 张战牌（如金蚕王）。
*   **操作流**：玩家故意发送非战牌（如装备牌 ID）或者越权传入 `cardIds: ['ZP01', 'ZP02']`（试图一次出两张）。
*   **期望断言**：
    *   内部校验函数（对 `min/max` 及 `validCardIds` 审查）未通过。
    *   向该发包玩家抛出特定的 Warning Error。
    *   状态机内部的 Timeout 计时器不重置或妥善重置，强制要求其纠正输入，直到合法或真正超时。
