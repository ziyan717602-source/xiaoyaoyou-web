# 仙剑·逍遥游 Web 版 — 最终架构审计报告

> **编制日期：** 2026-06-01
> **审计方：** MIMO（综合 Codex、Gemini 两份独立审计，结合项目文档与代码现状）
> **审计对象：** `xiaoyaoyou-web` TypeScript + React + Node.js 实现
> **参考文档：**
> - Codex: `docs/Codex/project-audit-architecture-optimization.md`、`docs/Codex/post-audit-implementation-roadmap.md`
> - Gemini: `docs/Gemini/architecture_audit_report.md`、`docs/Gemini/milestone1_design_spec.md`、`docs/Gemini/milestone2_design_spec.md`、`docs/Gemini/milestone3_design_spec.md`
> - 项目: `README.md`、`CLAUDE.md`、`docs/scope.md`、`docs/engine-comparison.md`、`docs/wpf-vs-web-comparison.md`、`docs/dev-log.md`、`docs/consolidated/card-info.md`、`docs/consolidated/game-flow.md`

---

## 0. 执行摘要

### 0.1 项目现状

Web 版逍遥游已完成 **C# WPF 原版效果层的 100% 翻译**：34 英雄、56 手牌、20 怪物、14 事件、26 NPC 的效果函数全部存在，1473 个测试通过，28/28 回合阶段已实现骨架。项目骨架完整，服务端权威架构方向正确。

但从"能稳定跑完一局多人对局"的标准看，当前存在 **6 个 P0 级架构缺陷**，它们不是单点 bug，而是生命周期层面的系统性问题。这些问题在 Codex 和 Gemini 两份独立审计中被**一致识别**，确认为客观存在的架构缺陷而非过度工程化。

### 0.2 核心结论

| 维度 | 评价 |
|------|------|
| 功能覆盖 | ✅ 效果系统 100%，回合阶段 100%（骨架） |
| 架构稳定性 | ❌ 异步阶段未等待、AI 光速推进、牌堆无重洗 |
| 交互正确性 | ❌ ZW 妨碍对象错误、ZD 战牌窗口不完整 |
| 数据协议 | ❌ 手牌未实例化，同名牌无法区分 |
| 前端体验 | ⚠️ 方向正确（InputController），但仍有 DSL 痕迹 |

### 0.3 下一步方向

**停止堆单点效果，转入架构收敛。** 目标：能稳定完成一局 2v2/3v3 服务端权威对局。

---

## 1. P0 缺陷清单

以下 6 个问题经 Codex 和 Gemini 两份独立审计一致确认，按严重程度排序。

### 1.1 异步阶段穿透（最严重）

**现象：** 技能/卡牌/输入请求尚未完成，阶段已经推进到下一阶段。玩家反馈"没有使用战牌和混战的机会"、"事件呼啸而过"。

**根因：** `EventBus.emit()` 同步触发，不等待 Promise。`RoundManager` 中关键路径（ST/SK/ZC/ZD/ZW/BC）使用 `emit()` 而非 `emitAsync()`，导致 async handler 的 Promise 被丢弃。

**影响范围：** `round.ts` 中所有 `eventBus.emit('run:stage')` 和 `eventBus.emit('raise:gmessage')` 调用。

**Codex 原文：** "RoundManager 中多处关键路径使用的是 emit()... 这会直接解释 AI 或技能阶段'看起来触发了'，但 UI 尚未收到/处理就进入下一阶段。"

**Gemini 原文：** "引擎缺乏异步状态挂起机制... 在需要等待人类玩家决策的环节，如果未能强制将引擎挂起，就会导致事件呼啸而过。"

**修复要点：**
- 所有改变规则状态、请求输入、触发技能/卡牌链的事件改为 `await eventBus.emitAsync(...)`
- 保留 `emit()` 只用于日志和纯通知
- 开发期 guard：对 `run:stage`、`raise:gmessage` 等规则事件使用 `emit()` 时打印 warning
- 类型层面区分 `DomainCommand`（必须 await）和 `ViewEvent`（可 fire-and-forget）

**验收标准：** `run:stage` 内部存在 async input 时，阶段不会提前进入下一阶段。

### 1.2 AI 光速推进

**现象：** AI 回合瞬间完成多个阶段，客户端只能看到压缩后的状态变化，形成"光速推进"体验。

**根因：** AI 是同步回调，`aiPlayer.getInput()` <5ms 返回，服务端在一个事件循环内跑完多个阶段。没有 EventQueue、没有 artificial delay、没有"AI 正在思考"的可见窗口。

**影响范围：** `game-session.ts` 中 AI 直接绕过 `InputManager`；无 EventQueue 调度。

**Codex 原文：** "AI 绕过 InputManager，直接 aiPlayer.getInput() 同步返回。服务端没有事件播放队列，状态可以在一个 tick 内推进多个阶段。"

**Gemini 原文：** "AI 逻辑以函数的形态内嵌在 Node.js 服务端，运算延迟通常小于 5 毫秒... 人类玩家在视觉上只看到卡牌飞速流失。"

**修复要点：**
- 引入 `Actor` 抽象：`HumanActor` 和 `AIActor` 共用 `requestDecision()` 接口
- AI 加 artificial delay（600-1200ms 思考时间），测试环境用 zero delay
- 引入 `EventQueue`，所有规则事件按 seq 排序广播，事件间应用 minDelay
- AI 思考期间广播 `ai_thinking` 事件，前端展示"思考中"状态

**验收标准：** 多个 AI 连续行动时，前端看到多个 `ai_thinking` 与行动事件，没有一帧内跨多个玩家回合的压缩体验。

### 1.3 牌堆无重洗机制

**现象：** 56 张手牌抽空后，所有依赖 `tuxPiles.dequeue()` 的路径直接停止发牌，游戏物资链崩溃。

**根因：** 抽牌逻辑分散在 `G0DH`、`G0HG`、`G0HQ`、初始发牌等多处代码中，均只判断 `tuxPiles.count > 0`，没有统一的重洗机制。

**影响范围：** `Game.dealCards()`、`GLoop.handleDrawDiscard()`、`GLoop.handleGiveCards()`、`GLoop.handleCardTransfer()`。

**Codex 原文：** "手牌堆抽空时当前代码通常直接停止发牌，没有将弃牌堆洗回牌库；但怪物/NPC 堆抽空在规则中是胜利结算条件，不能简单重洗。"

**Gemini 原文：** "游戏仅挂载了 56 张初始手牌至 tuxPile... 一旦 56 张抽空，整个引擎的物资链即刻崩溃断裂。"

**修复要点：**
- 引入 `DeckManager`，统一抽牌/弃牌/洗牌入口
- 手牌堆空：若 `tuxDises` 非空，洗回 `tuxPiles` 后继续抽
- 事件堆空：对照 C# 原版确认策略（重洗或空过）
- 怪物/NPC 堆空：触发 `G1WJ` 宠物战力结算，**不重洗**
- 所有弃牌必须进入对应 discard pile

**验收标准：** 手牌堆剩 1、弃牌堆 5、抽 3 时能抽满并标记 reshuffled；怪物堆空触发结算而非重洗。

### 1.4 ZW 支援/妨碍对象错误

**现象：** 妨碍者选择只发给敌方第一名存活玩家，而非敌方全队。

**根因：** `onZW()` 中 `hMember` 是所有敌方存活玩家，但妨碍选择请求只发给 `hMember[0]`。在 2v2/3v3 中，"由谁决策"和"可选谁"混在一起。

**影响范围：** `round.ts` 的 `onZW()` 方法。

**Codex 原文：** "妨碍选择只发给 hMember 中第一名存活敌方玩家... 这会导致对象语义混乱。"

**Gemini 原文：** "目前代码在触发妨碍者选择时，往往错误地将判定权交给了触发者，或简单通过硬编码的 opponent 变量选取。"

**修复要点：**
- 建模为 `DecisionRequest`：分离 `recipients`（谁有权响应）和 `candidates`（可选谁）
- 支援：`recipients = [rounder.uid]`，`candidates = aliveSameTeamExceptRounder`
- 妨碍：`recipients = aliveEnemyTeam`，`candidates = aliveEnemyTeam`，`policy = 'first-valid'`
- 服务端校验：候选人仍存活、同队关系正确、未越权

**验收标准：** 妨碍请求发给敌方团队所有成员，非敌方玩家提交无效，不选支援/妨碍仍能正常进入翻怪阶段。

### 1.5 ZD 战牌阶段不完整

**现象：** ZD 阶段虽然改为 `runStage()`，但 U1 请求未与真实玩家输入闭环；战牌实例与每人限用一次缺少统一校验。

**根因：** `onZD()` 设置了 `poolEnabled` 和 `restZP = 1`，但没有实现"向所有有合法行动的玩家发出行动窗口，玩家选择是否出战牌/技能，服务端校验、消耗实例"的完整状态机。

**影响范围：** `round.ts` 的 `onZD()` 方法；缺少 `BattleActionWindow`。

**Codex 原文：** "ZD 的核心不是阶段开始时自动调用所有 ZP 效果，而是向所有有合法行动的玩家发出行动窗口。"

**修复要点：**
- 实现 `BattleActionWindow`：`collectLegalActions()`、`apply()`、`shouldContinue()`
- 覆盖四张基础战牌：ZP01 金蝉脱壳、ZP02 天罡战气、ZP03 金蚕王、ZP04 天玄五音
- ZP01/ZP02/ZP03：参战且命中者可用
- ZP04：未参战者也可用，但需选择阵营
- `restZP` 只有战牌成功结算后减少
- 每人每场战斗限用 1 张战牌（姜云凡等突破限制的技能另建扩展点）

**验收标准：** 非参战玩家不能打 ZP01/ZP02/ZP03；同一玩家普通情况下不能打第二张战牌；打出战牌后 instanceId 从手牌移除。

### 1.6 手牌未实例化

**现象：** 前端手牌以卡牌代码传输和选择，两张同名 `JP01` 无法区分，React key 冲突，提交的不是实例 ID。

**根因：** `GameSession.getState()` 将 `Player.tux`（内部已是数字 ID）降级为 `string[]` 卡牌代码，前端无法区分同名牌。

**影响范围：** `game-session.ts` 的 `getState()`；`HandArea` 组件；所有涉及手牌选择的协议。

**Codex 原文：** "前端操作未与手牌绑定... 服务端给前端的是 hand: string[] 卡牌代码；前端选择 selectedCards: string[]，重复牌无法区分。"

**修复要点：**
- 协议改为 `CardInstanceState[]`：`{ instanceId, code, name, type, zone, visible }`
- 内部沿用 numeric id，协议层命名为 `instanceId`
- 前端选择 `selectedCardInstanceIds: number[]`
- 所有 Q 段、战牌、弃牌、装备替换都提交 `instanceId`

**验收标准：** 两张同名手牌只选中一个 instanceId；Q 段提交 instanceId，服务端消耗对应物理牌。

---

## 2. P1 缺陷清单

以下问题不阻断核心流程，但影响规则完整性和玩家可理解性。

### 2.1 输入请求缺少 requestId/phaseId

当前 `input_request` 没有唯一请求 ID，客户端提交也没有绑定 requestId，存在陈旧输入污染风险。M2 阶段引入 `DecisionRequest` 后解决。

### 2.2 SkillPanel 裸发技能码

`SkillPanel` 点击直接发送 skill code，不绑定合法行动窗口、技能条件、目标选择。应改为服务端下发 `legalActions`，前端只显示可用技能。

### 2.3 复合格式只处理首段

`format-parser` 支持多段解析，但 `InputController` 只激活首段 UI，`/Q1(...),/T1(...)` 类型的复合请求无法完整处理。

### 2.4 Z2 阶段缺失

WPF 有 Z2 阶段，Web 端缺失。ZF 已包含大部分清理逻辑，影响较小。

### 2.5 断线重连无状态恢复

已有 `reconnect` 消息类型，但引入 EventQueue 后需要 `sinceSeq` 补发事件机制。

### 2.6 选人列表包含 NPC 角色

`listAllSeleable` 过滤逻辑需调整，NPC 不应出现在可选英雄列表中。

### 2.7 事件堆空策略未确认

事件牌堆抽空时是重洗还是空过，需对照 C# 原版确认。

---

## 3. P2 缺陷清单（体验增强）

以下问题不影响规则正确性，在核心闭环验证通过后再处理。

| 编号 | 问题 | 说明 |
|------|------|------|
| P2-01 | 无卡牌飞行动画 | 翻怪/出牌/伤害无动画反馈 |
| P2-02 | 事件卡翻出无视觉突出 | 仅文本日志，无大图展示 |
| P2-03 | 状态图标为文字标签 | 应改为图标 |
| P2-04 | 弃牌堆无完整查看 | 只有展开能力，无完整列表 |
| P2-05 | 移动端长按无详情 | 卡牌详情仅 hover，移动端需长按 |
| P2-06 | 结束回合无二次确认 | 关键操作缺少防误触 |

---

## 4. 两份审计的对比与取舍

### 4.1 Codex 审计的优势

| 维度 | 评价 |
|------|------|
| 问题诊断 | ✅ 精准，直接定位到代码层面（EventBus.emit、tuxPiles.count、hMember[0]） |
| 路线规划 | ✅ M0→M8 渐进式，保留 legacy adapter，先修生命周期再修 UI |
| 范围控制 | ✅ 严格遵守 scope.md，不引入范围外功能 |
| Actor 设计 | ✅ M2 即引入 Actor 最小抽象，与 DecisionRequest 同步 |
| 协议设计 | ✅ DecisionRequest/DecisionResponse 接口设计合理，有 legacy 兼容层 |

### 4.2 Gemini 审计的优势

| 维度 | 评价 |
|------|------|
| 问题诊断 | ✅ 方向正确，对异步挂起、AI 延迟、牌堆重洗的描述清晰 |
| 代码示例 | ✅ waitForInput、VirtualAIClient、drawTuxSafe 的伪代码有参考价值 |
| 前端交互 | ✅ 两步式点控状态机（useGameInput）设计思路值得采纳 |
| 测试用例 | ✅ TC-01 到 TC-04 的测试大纲可直接转化为 M0 回归测试 |

### 4.3 需要修正的内容

| 来源 | 内容 | 修正 |
|------|------|------|
| Gemini | "废除 C# 格式化字符串，全量切换 JSON 协议" | ❌ 不一次性做。必须有 legacy adapter，M2 新增 DecisionRequest，M7 再清理旧路径 |
| Gemini | AI "伪造 WebSocket 连接"接入 | ❌ 不需要。抽象为 Actor 接口即可，不需要模拟 WebSocket |
| Gemini | "剧场级 3D 翻转动画" | ❌ 不进 P0/P1。scope.md 明确"不做动画特效（仅保留基础过渡动画）" |
| Gemini | "商业潜力"表述 | ❌ 不作为范围依据。项目定位是开源桌游翻译 |
| Codex | EventQueue 在 M5 实现 | ⚠️ M1/M2/M4 期间不能继续依赖同步 AI 瞬间返回的旧语义，需最小化引入 |
| Codex | 前端重构在 M6 | ✅ 正确。但 HandArea 的 key 冲突可在 M3 顺手修 |

### 4.4 最终取舍原则

1. **以 Codex roadmap 为主路线**，吸收 Gemini 的代码示例和测试思路
2. **不做大爆炸重写**，保留 legacy adapter，新旧并存到 M7
3. **先修生命周期，再修界面**：await → DecisionRequest → CardInstance → 战斗窗口 → UI
4. **Actor 抽象不后置**：M2 就让 AI 和真人进入同一 request/response 模型
5. **前端 UI 重构不早于卡牌实例化**：否则仍会重复"同名牌无法区分"的根因

---

## 5. 实施路线

### 5.1 阶段总览

| 阶段 | 名称 | 优先级 | 核心产物 | 依赖 |
|------|------|--------|----------|------|
| **M0** | 回归基线与保护网 | P0 | P0 缺陷复现测试、AI 对局基线 | 无 |
| **M1** | Async 状态机与阶段等待 | P0 | 规则事件可 await；阶段推进不穿透 | M0 |
| **M2** | 结构化输入与 Actor 抽象 | P0 | DecisionRequest/Response、Human/AI Actor 同入口 | M1 |
| **M3** | 卡牌实例与牌堆生命周期 | P0 | CardInstanceState、DeckManager | M2 |
| **M4** | ZW/ZD 战斗行动窗口 | P0 | 支援/妨碍团队决策、战牌合法行动 | M1-M3 |
| **M5** | 时间流控与事件队列 | P1 | GameEvent seq、EventQueue、AI delay | M2-M4 |
| **M6** | 前端操作重构 | P1 | 实例化手牌 Dock、ActionPrompt、SkillDock | M2-M5 |
| **M7** | 收敛清理与验收对局 | P1 | 旧 DSL 降级、2v2/3v3 验收、文档同步 | M6 |
| **M8** | 体验增强 | P2 | 基础动画、详情抽屉、状态图标 | M7 |

### 5.2 M0：回归基线与保护网

**目标：** 把 P0 缺陷固化为测试名，没有保护网就不改状态机。

**新增文件：**
- `src/shared/game/engine/__tests__/regression-audit.test.ts`
- `src/server/__tests__/ai-timing.test.ts`
- `src/client/components/game/__tests__/hand-instance-selection.test.tsx`

**测试清单：**

| 编号 | 测试名 | 断言 |
|------|--------|------|
| M0-01 | async phase should not advance before input resolves | `run:stage` handler 内部 await waitForInput，Promise 未 resolve 前不进入下一阶段 |
| M0-02 | tux deck reshuffles when empty | tuxPiles 剩 1、tuxDises 有 5、抽 3 → 洗回弃牌堆并抽满 3 张 |
| M0-03 | monster deck exhaustion triggers G1WJ | monPiles 空时进入 ZM → 触发 G1WJ 而非重洗 monDises |
| M0-04 | ZW support excludes rounder | 支援候选不包含 rounder |
| M0-05 | ZW hinder targets enemy team | 妨碍候选只包含敌方存活玩家 |
| M0-06 | ZW hinder rejects non-enemy submission | 非敌方玩家提交妨碍响应无效 |
| M0-07 | ZD non-combatant cannot play ZP01/ZP02/ZP03 | 非参战者不能打金蝉/天罡/金蚕 |
| M0-08 | ZD non-combatant can play ZP04 | 非参战者可以打天玄五音 |
| M0-09 | ZD one battle card per player per fight | 同一玩家普通情况下不能打第二张战牌 |
| M0-10 | hand duplicate cards distinguishable by instanceId | 手牌含两个同 code 不同 instanceId → 点击只选中一个 |

**验收标准：** 每个 P0 问题至少一个测试名；未修复项允许 `it.todo`；后续每完成一个 milestone 必须解除对应 todo。

### 5.3 M1：Async 状态机与阶段等待

**目标：** 修复阶段穿透，不改协议，只改引擎生命周期。

**主要文件：**
- `src/shared/game/engine/event-bus.ts`
- `src/shared/game/engine/round.ts`
- `src/shared/game/game.ts`
- `src/shared/game/engine/g-loop.ts`

**必改点：**

1. **EventBus 语义收敛**
   - `emit()` 只用于日志/通知，开发期对规则事件打印 warning
   - `emitAsync()` 用于所有规则状态改变

2. **RoundManager 关键 emit 改 await**
   - ST/SK/ZC/ZD 的 `run:stage` → `await emitAsync`
   - ZW 的 `raise:gmessage G1SG` → `await emitAsync`
   - BC 的 `raise:gmessage G0HT` → `await emitAsync`

3. **GLoop 调用审计**
   - `G0HT → G0DH` 补牌 → await
   - `G1SG` 决策窗口 → await
   - HP 变化、死亡、复活链 → await

**不在 M1 做：** 不改协议、不改 HandArea、不重写 ZD 行动窗口、不接 AI delay。

**验收标准：** `run:stage` 内部存在 async input 时阶段不提前推进；BC 阶段在补牌完成后才进入 QR。

### 5.4 M2：结构化输入与 Actor 抽象

**目标：** 建立真人和 AI 共用的输入请求模型，引擎不再关心"玩家是真人还是 AI"。

**新增类型（`protocol.ts`）：**

```typescript
interface DecisionRequest {
  requestId: string;
  phaseId: string;
  phase: string;
  code: string;
  prompt: string;
  recipients: number[];
  policy: 'single-actor' | 'first-valid' | 'all-pass' | 'captain';
  min: number;
  max: number;
  optional: boolean;
  timeoutMs: number;
  legalActions: LegalAction[];
  candidates?: Candidate[];
  sourceFormat?: string;  // legacy 兼容
}

interface DecisionResponse {
  requestId: string;
  phaseId: string;
  uid: number;
  actionId: string;
  payload: {
    cardInstanceIds?: number[];
    targetUids?: number[];
    optionValues?: string[];
    skillCode?: string;
  };
}
```

**Actor 最小抽象：**

```typescript
interface Actor {
  uid: number;
  kind: 'human' | 'ai';
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null>;
}
```

- `HumanActor`：通过 WebSocket 发 `decision_request`，等待 `decision_response`
- `AIActor`：调用现有策略计算，M2 用 zero delay，M5 加人工延迟
- 两者走同一 `applyDecision` 路径，不直接改引擎状态

**Legacy Adapter：** 旧 `input_request` / `player_input` 通过 adapter 转换为 DecisionRequest/Response。

**新增文件：**
- `src/server/actors/actor.ts`
- `src/server/actors/human-actor.ts`
- `src/server/actors/ai-actor.ts`
- `src/server/actors/actor-registry.ts`
- `src/shared/game/input/format-to-decision.ts`

**验收标准：** 真人和 AI 共用同一 DecisionRequest 类型；过期 requestId 被拒绝；非 recipient 提交被拒绝。

### 5.5 M3：卡牌实例与牌堆生命周期

**目标：** 卡牌代码选择改为物理牌实例选择，抽牌/弃牌/洗牌统一到 DeckManager。

**协议改造：**

```typescript
interface CardInstanceState {
  instanceId: number;
  code: string;
  name: string;
  type: string;
  zone: 'hand' | 'weapon' | 'armor' | 'trove' | 'exEquip' | 'discard' | 'deck' | 'battle';
  visible: boolean;
  selectable?: boolean;
  disabledReason?: string;
}
```

**DeckManager：**

```typescript
class DeckManager {
  drawTux(uid: number, count: number): DrawResult;
  discardTux(cardIds: number[], reason: string): void;
  drawMonsterOrNpc(): DrawResult;
  drawEvent(): DrawResult;
}
```

**替换顺序：** 先替换低风险路径（dealCards → G0DH → G0HG → G0HQ），再替换分散效果。

**验收标准：** 两张同名手牌只选中一个 instanceId；手牌堆空时洗回弃牌堆；怪物堆空触发结算。

### 5.6 M4：ZW/ZD 战斗行动窗口

**目标：** 战斗从"自动触发 handler"变为"服务端生成合法行动窗口 → 玩家/AI 选择 → 服务端校验结算"。

**ZW 改造：**
- 支援：`recipients = [rounder.uid]`，`candidates = aliveSameTeamExceptRounder`
- 妨碍：`recipients = aliveEnemyTeam`，`policy = 'first-valid'`
- 结算后写入 `board.supporter` / `board.hinder`

**ZD 改造：**
- 新增 `BattleActionWindow`：`collectLegalActions()`、`apply()`、`shouldContinue()`
- 覆盖 ZP01-ZP04 四张基础战牌
- 行动循环：依次询问有合法行动者，直到所有人 pass

**验收标准：** ZP04 非参战者可用；ZP01/ZP02/ZP03 非参战者不可用；每人每场战斗限用 1 张战牌。

### 5.7 M5：时间流控与事件队列

**目标：** 解决"AI 回合光速推进"和"客户端看不到过程"。

**核心组件：**
- `GameEvent`：带 seq、type、payload、visibility、minDelayMs
- `EventQueue`：分配 seq、按序广播、应用 delay
- `DelayPolicy`：AI 思考 600-1200ms、阶段切换 300-500ms、翻怪 700-1000ms
- 测试环境用 zero delay

**验收标准：** 多个 AI 连续行动时前端看到顺序事件；没有一帧跨多回合的压缩体验。

### 5.8 M6：前端操作重构

**目标：** 围绕 DecisionRequest 渲染操作，不再暴露 DSL。

**组件改造：**

| 组件 | 改造 |
|------|------|
| `HandArea` | 接收 `CardInstanceState[]`，按 instanceId 选中，非法牌置灰 |
| `InputController` | 改为渲染 DecisionRequest，DSL 仅作兼容层 |
| `SkillPanel` | 只显示 legalActions 中允许的技能 |
| `BattleArea` | 增加 BattleStack：触发者、支援者、妨碍者、战力池 |

**防误操作：** 结束回合、放弃战斗、金蝉脱壳等必须二次确认；确认文案描述结果，不展示技术 code。

**验收标准：** 两张同名牌只选中一个实例；技能按钮非法时不可点击；375px 宽度下核心控件不重叠。

### 5.9 M7：收敛清理与验收对局

**清理清单：**
- 删除或归档 `OperationPanel.tsx`
- 旧 `input_request` / `player_input` 标记 deprecated
- `format-parser` 只保留 legacy adapter 使用
- 更新 README.md、CLAUDE.md、docs/dev-log.md

**验收对局：**
- 2 人：真人 + AI
- 4 人：1 真人 + 3 AI
- 4 人：2 真人 + 2 AI（含妨碍推举）
- 6 人：1 真人 + 5 AI（至少 10 回合无死锁）

### 5.10 M8：体验增强

在 M7 通过后才开始。不做动画掩盖规则问题。

允许：基础翻牌展示、详情抽屉、状态图标、轻量动画。
不允许：音效/音乐、重型 3D 场景、影响规则等待的长动画。

---

## 6. 跨阶段工作原则

### 6.1 先修生命周期，再修界面

```
阶段可挂起 → 输入有 requestId → 真人/AI 同协议 → 卡牌绑定实例 ID
→ 战斗窗口可校验 → 前端按合法行动高亮 → 再做动画
```

### 6.2 保留 legacy adapter，不做大爆炸重写

当前系统仍依赖 G-message、U1/U5、format string 与 InputController。短期目标不是删除它们，而是包一层兼容：

- 旧 `input_request` → `FormatToDecisionAdapter` → `DecisionRequest`
- 旧 `player_input` → `LegacyInputAdapter` → `DecisionResponse`
- 新代码只新增 DecisionRequest 能力，不再扩展纯 DSL 能力
- M7 前允许新旧并存；M7 做清理决定

### 6.3 服务端永远权威

前端可以根据 `legalActions` 做置灰和高亮，但所有操作提交后仍必须由服务端校验：

- 操作人是否在 recipients 中
- requestId 是否仍有效
- phaseId 是否匹配当前阶段
- 卡牌实例是否属于该玩家并仍在对应 zone
- 目标是否仍合法且存活
- 技能/战牌次数限制是否满足

### 6.4 渐进式改造，每步有测试

- M1 不要一次性全改所有 emit，按阶段逐个改，每个改完写回归测试
- M2 的 Actor 先用 zero delay，M5 再加人工延迟
- M3 先改低风险路径（dealCards），再改分散效果
- 每个 milestone 完成后必须运行 `npm run typecheck && npm run test && npm run build`

---

## 7. 测试矩阵

### 7.1 命令

| 命令 | 用途 |
|------|------|
| `npm run typecheck` | 生产代码类型检查 |
| `npm run test` | 全量 Vitest |
| `npm run build` | Vite 构建 |
| `npm run lint` | ESLint |

### 7.2 阶段门禁

| 阶段 | 必跑测试 |
|------|----------|
| M0 | regression-audit.test.ts 可运行，允许 todo |
| M1 | round.test.ts、skill-phase.test.ts、async regression |
| M2 | protocol.test.ts、game-session.test.ts、Actor/InputManager tests |
| M3 | g-handlers.test.ts、牌堆 regression、HandArea instance test |
| M4 | battle-phases.test.ts、battle-action-window.test.ts、ZW/ZD integration |
| M5 | ai-timing.test.ts、EventQueue tests |
| M6 | GamePage.test.tsx、HandArea.test.tsx、useDecisionInput tests |
| M7 | typecheck + test + build + 手动 2v2/3v3 验收 |

### 7.3 关键断言清单

- 阶段 handler 未 resolve 前不会推进
- requestId 过期响应被拒绝
- 非 recipient 响应被拒绝
- AI 与真人通过同一个 submit path
- 手牌同名牌按 instanceId 区分
- 手牌堆空时洗回弃牌堆
- 怪物堆空时结算而非重洗
- ZP04 非参战者可用，ZP01/ZP02/ZP03 非参战者不可用
- 普通玩家每场战斗只可成功使用一张战牌

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|----------|
| M1 改 await 遗漏某个路径 | 高 | 幽灵 bug | 按阶段逐个改，每个写回归测试 |
| 卡牌实例化影响大量效果 | 中 | M3 工作量膨胀 | 内部沿用 numeric id，协议层只加 instanceId |
| 旧 DSL 与新协议长期并存 | 中 | 维护成本 | M2 建 adapter，新功能只接新协议，M7 清理 |
| AI delay 拖慢测试 | 低 | CI 变慢 | DelayPolicy 可注入，测试默认 0ms |
| 协议与引擎同时大改 | 中 | 不稳定 | M1 只改 await，M2 新增协议但保留 legacy，M3 改手牌 payload |

---

## 9. 范围约束提醒

依据 `docs/scope.md`，以下内容**不在范围内**，不应在任何 milestone 中引入：

- 聊天系统、好友系统、排行榜、成就系统
- 观战模式、录像回放
- 音效/音乐、精细动画效果（M8 仅保留基础过渡动画）
- 多语言支持、数据持久化、用户账号系统、应用内购
- AI 对手的产品化（难度系统、AI 个性）—— AI 补位作为测试/补位能力保留，不扩展为产品化 AI 对战

---

## 10. 建议的最小可执行切片

如果资源有限，按以下顺序逐步推进，每步完成后项目都处于可用状态：

1. **新增 M0 regression 测试文件**，把 P0 问题写成测试名（1-2 小时）
2. **修 M1**：把 `round.ts` 中关键 `eventBus.emit` 改为 awaitable，补测试（4-8 小时）
3. **在 `protocol.ts` 新增 DecisionRequest/Response 类型**（1-2 小时）
4. **改 InputManager 支持 requestId**，保留旧 waitForInput 包装（2-4 小时）
5. **新增最小 Actor/HumanActor/AIActor/AIActor**，AI 用 zero delay（2-4 小时）
6. **GameSession.getState() 的 hand 改为 CardInstanceState[]**，同步修前端类型（2-4 小时）
7. **实现 DeckManager.drawTux()**，替换初始发牌与 G0DH（2-4 小时）
8. **重写 ZW 为 DecisionRequest**（2-4 小时）
9. **实现最小 BattleActionWindow**，先覆盖 ZP01-ZP04（4-8 小时）
10. **接入 EventQueue 与 AI delay**（4-8 小时）
11. **前端从 InputController 迁移到 ActionPrompt**（8-16 小时）
12. **跑 M7 验收对局并清理 legacy**（4-8 小时）

完成第 9 步后，项目进入"核心规则闭环验证"；完成第 11 步后，再投入 UI 细节。

---

## 附录 A：与原版 C# 的关键差异

| 维度 | C# WPF | Web TS | 影响 |
|------|--------|--------|------|
| 输入等待 | UI 线程阻塞 | async/await | 需要显式 await，否则穿透 |
| AI 执行 | 同步，但有 UI 线程调度 | 同步，无任何延迟 | 需要 artificial delay |
| 牌堆管理 | 集中在 Board 属性 | 分散在多处 dequeue | 需要 DeckManager 统一 |
| 格式字符串 | 服务端拼接 → 客户端解析 | 同上 | 短期保留，长期转 JSON |
| 卡牌身份 | 对象引用 | 数字 ID（内部）→ code 字符串（协议） | 需要改回 instanceId |

## 附录 B：术语表

| 术语 | 含义 |
|------|------|
| XI | 游戏主循环引擎 |
| G-Loop | 基于字符串命令的事件协议系统 |
| G-message | G-Loop 中的消息格式（如 `G0OH,1,2,3,1`） |
| runStage | 阶段内技能优先级调度 |
| SKE | 技能触发实体（Skill Key Entry） |
| DecisionRequest | 服务端向玩家发出的结构化输入请求 |
| DecisionResponse | 玩家（真人/AI）对 DecisionRequest 的响应 |
| Actor | 真人或 AI 的统一决策接口 |
| DeckManager | 统一管理牌堆抽牌/弃牌/洗牌的组件 |
| BattleActionWindow | 战斗阶段的合法行动窗口管理器 |
| EventQueue | 规则事件的有序广播队列 |
| CardInstanceState | 带 instanceId 的卡牌状态描述 |
| legacy adapter | 旧格式字符串到新 DecisionRequest 的转换层 |
