# 仙剑·逍遥游 Web 版后续开发工作指南与实施路线

> 修订日期：2026-06-01  
> 主依据：`docs/project-audit-architecture-optimization.md`  
> 参考但不优先：`docs/architecture_audit_report.md`、`docs/milestone1_design_spec.md`、`docs/milestone2_design_spec.md`、`docs/milestone3_design_spec.md`  
> 规则依据：`docs/scope.md`、`docs/consolidated/card-info.md`、`docs/consolidated/game-flow.md`  
> 目标读者：后续实现者、测试者、AI 代码代理。

## 0. 修订原则

本文是 `project-audit-architecture-optimization.md` 的执行版。若本文与审计报告冲突，以审计报告为准；若 Gemini 编写的几份 milestone 文档与审计报告冲突，以审计报告为准。

本次修订重点：

- 将 `Actor` / AI 虚拟客户端的最小抽象前移到结构化输入阶段，避免出现“M2 要求真人和 AI 同链路，但 M5 才实现 AI 链路”的矛盾。
- 保留 Gemini 文档中有价值的 Async、JSON 输入、AI 延迟、牌堆重洗、前端点控思路，但不采纳“大爆炸废弃 DSL”“伪造 WebSocket 才算 AI 客户端”“剧场级复杂动画必须实现”等不符合审计报告或 `scope.md` 的表述。
- 对 P0 阶段进一步细化到文件、接口、迁移顺序、验收测试，降低后续执行歧义。

## 1. 最终目标

后续开发的目标不是继续堆单点卡牌效果，而是完成一条可验证的多人桌游闭环：

> 能稳定完成一局 2v2 或 3v3 服务端权威对局；真人和 AI 都通过同一决策协议行动；前端操作绑定真实卡牌实例；阶段推进不会穿透等待点；AI 行动有可见时间节奏；核心流程符合 `game-flow.md` 与 `card-info.md`。

完成定义：

1. 2v2 和 3v3 至少各完成一局无死锁对局。
2. 真人和 AI 都通过 `DecisionRequest` / `DecisionResponse` 行动。
3. AI 不再通过同步 `Game.getInput()` 瞬间连跳多个阶段。
4. 所有手牌操作都绑定 numeric card instance id，而不是只提交卡牌 code。
5. 手牌堆抽空能洗回弃牌堆；怪物/NPC 堆抽空能进入宠物战力结算。
6. ZW 支援/妨碍对象符合阵营规则。
7. ZD 战牌阶段能正确处理四张基础战牌和“每人每场战斗限用 1 张战牌”。
8. 前端主操作入口不再是纯文本命令弹窗。
9. `npm run typecheck`、`npm run test`、`npm run build`、核心 AI 对局脚本通过。

## 2. 与现有文档的取舍关系

| 文档 | 可采纳内容 | 需要修正的内容 |
|---|---|---|
| `project-audit-architecture-optimization.md` | 主依据，所有 P0 根因、路线和验收口径以此为准 | 无 |
| `architecture_audit_report.md` | Async 挂起、团队路由、AI 人工延迟、强类型 JSON、点控式 UI 方向 | “商业潜力”“剧场级体验”等表述不作为范围依据；复杂动画不进入 P0/P1 |
| `milestone1_design_spec.md` | `waitForInput`、结构化输入、ZD 挂起、ZW 阵营鉴权测试 | “废除 C# 格式化字符串，全量切换”不能一次性做；必须有 legacy adapter |
| `milestone2_design_spec.md` | AI 虚拟客户端、人工延迟、牌堆重洗与极端空堆测试 | AI 不应伪造成 WebSocket 才能接入；应抽象为 `Actor`，统一走决策协议 |
| `milestone3_design_spec.md` | 前端两步点控、手牌/目标高亮、防误操作 | “剧场级/3D”只能作为 P2 基础展示，不做复杂动画特效 |

## 3. 路线总览

| 阶段 | 名称 | 优先级 | 核心产物 | 依赖 |
|---|---|---:|---|---|
| M0 | 回归基线与保护网 | P0 | P0 缺陷复现测试、AI 对局基线、关键断言 | 无 |
| M1 | Async 状态机与阶段等待 | P0 | 规则事件可 await；阶段推进不穿透异步效果 | M0 |
| M2 | 结构化输入、Actor 最小抽象与请求生命周期 | P0 | `DecisionRequest` / `DecisionResponse`、requestId/phaseId、Human/AI Actor 同入口 | M1 |
| M3 | 卡牌实例与牌堆生命周期 | P0 | `CardInstanceState`、`DeckManager`、抽弃洗统一入口 | M2 类型可用 |
| M4 | ZW/ZD 战斗行动窗口 | P0 | 支援/妨碍团队决策、战牌合法行动、每人限用一次 | M1-M3 |
| M5 | 时间流控与事件队列 | P1 | `GameEvent seq`、`EventQueue`、AI delay policy、快照校正 | M2-M4 |
| M6 | 前端操作重构 | P1 | 实例化手牌 Dock、`ActionPrompt`、`SkillDock`、`BattleStack` | M2-M5 |
| M7 | 收敛清理与验收对局 | P1 | 旧 DSL 路径降级/清理、2v2/3v3 验收、文档同步 | M6 |
| M8 | 体验增强 | P2 | 基础翻牌展示、详情抽屉、状态图标、轻量动画 | M7 |

关键依赖说明：

- `Actor` 最小抽象不能后置到 M5。M2 就必须让 AI 和真人进入同一 request/response 模型，否则 M2 的“统一输入协议”不成立。
- `EventQueue` 可以在 M5 完整实现，但 M1/M2/M4 期间不能继续依赖“同步 AI 瞬间返回后推进完整阶段”的旧语义。
- 前端 UI 重构不能早于卡牌实例协议，否则仍会重复“同名牌无法区分”的根因。

## 4. 跨阶段工作原则

### 4.1 先修生命周期，再修界面

必须按以下顺序推进：

1. 阶段可挂起。
2. 输入有 requestId/phaseId。
3. 真人和 AI 同协议。
4. 卡牌操作绑定实例 ID。
5. 战斗窗口能服务端校验并结算。
6. 前端按合法行动高亮。
7. 再做动画和视觉增强。

### 4.2 保留 legacy adapter，不做大爆炸重写

当前系统仍依赖 G-message、U1/U5、format string 与 `InputController`。短期目标不是删除它们，而是包一层兼容：

- 旧 `input_request { uid, format, code, arg }` 进入 `FormatToDecisionAdapter`。
- 旧 `player_input { input }` 进入 `LegacyInputAdapter`，转换为 `DecisionResponse`。
- 新代码只新增 `DecisionRequest` 能力，不再扩展纯 DSL 能力。
- M7 前允许新旧并存；M7 做清理决定。

### 4.3 服务端永远权威

前端可以根据 `legalActions` 做置灰和高亮，但所有操作提交后仍必须由服务端校验：

- 操作人是否在 recipients 中。
- requestId 是否仍有效。
- phaseId 是否匹配当前阶段。
- 卡牌实例是否属于该玩家并仍在对应 zone。
- 目标是否仍合法且存活。
- 技能/战牌次数限制是否满足。

## 5. M0：回归基线与保护网

### 5.1 目标

先把审计报告中的 P0 根因固化成测试名或最小复现。没有保护网就改状态机，风险太高。

### 5.2 建议新增文件

- `src/shared/game/engine/__tests__/regression-audit.test.ts`
- `src/server/__tests__/ai-timing.test.ts`
- `src/client/components/game/__tests__/hand-instance-selection.test.tsx`

### 5.3 任务清单

1. 新增异步阶段测试：
   - 构造一个 `run:stage` handler，内部 `await waitForInput`。
   - 断言 Promise 未 resolve 前不会进入下一阶段。
2. 新增牌堆测试：
   - `tuxPiles` 只剩 1 张，`tuxDises` 有 5 张，请求抽 3 张。
   - 断言会洗回弃牌堆并抽满 3 张。
   - `monPiles` 空时进入 ZM，断言触发 `G1WJ` 而不是重洗 `monDises`。
3. 新增 ZW 测试：
   - 支援候选不包含 rounder。
   - 妨碍候选只包含敌方存活玩家。
   - 非敌方玩家提交妨碍响应无效。
4. 新增 ZD 测试名：
   - 非参战者不能打 ZP01/ZP02/ZP03。
   - 非参战者可以打 ZP04。
   - 同一玩家普通情况下不能打第二张战牌。
5. 新增前端实例测试：
   - 手牌包含两个相同 code、不同 instanceId。
   - 点击其中一个只选中该 instanceId。

### 5.4 验收标准

- 每个审计 P0 问题都有至少一个测试名。
- 当前未修复项允许 `it.todo`，但不能只写在文档里。
- 后续每完成一个 milestone，必须解除对应 `todo` 或补成真实断言。

## 6. M1：Async 状态机与阶段等待

### 6.1 目标

修复阶段穿透：任何会改变规则状态、请求输入、触发技能/卡牌链的事件都必须被 await。这个阶段不改前端协议，只改引擎生命周期。

### 6.2 主要文件

- `src/shared/game/engine/event-bus.ts`
- `src/shared/game/engine/round.ts`
- `src/shared/game/game.ts`
- `src/shared/game/engine/g-loop.ts`
- `src/shared/game/engine/__tests__/round.test.ts`
- `src/shared/game/engine/__tests__/skill-phase.test.ts`
- `src/shared/game/engine/__tests__/battle-phases.test.ts`

### 6.3 必改点

#### 6.3.1 EventBus 语义收敛

保留两个入口，但明确约束：

```ts
emit(event, data)       // 只用于日志、UI提示、不会改变规则状态的事件
emitAsync(event, data)  // 用于规则状态改变、G-message、阶段技能、输入请求
```

建议新增开发期 guard：

```ts
const RULE_EVENTS = new Set(['run:stage', 'raise:gmessage']);

emit(event: string, data?: unknown): EventResult {
  if (RULE_EVENTS.has(event)) {
    console.warn(`[EventBus] rule event "${event}" should use emitAsync`);
  }
  ...
}
```

不要在生产中直接抛错，避免旧路径突然崩；测试中可以开启 strict mode。

#### 6.3.2 RoundManager 关键 emit 改 await

必须改为 `await this.eventBus.emitAsync(...)` 的路径：

- ST/SK/ZC/ZD 的 `run:stage`。
- ZW 的 `raise:gmessage G1SG`。
- BC 的 `raise:gmessage G0HT`。
- 任何会影响 `state.isFight`、`board.monster1`、`board.battler`、`board.eve`、HP、手牌、装备的事件。

示例：

```ts
await this.eventBus.emitAsync('run:stage', { stageCode });
```

#### 6.3.3 Game.setupBattleListeners 错误处理

当前 async listener 如果被同步 emit 调用，错误会丢失。M1 后应保证：

- `run:stage` listener 中 `await this.gLoop.runStage(stageCode)` 的异常能被调用方捕获。
- `raise:gmessage` listener 中 `await this.gLoop.raiseGMessage(cmd)`。
- `roundManager.runRound()` 能在错误时终止当前 round 或转为 `game_error`。

#### 6.3.4 GLoop 调用审计

凡调用方依赖结果的 `raiseGMessage` 都必须 await：

- `G0HT -> G0DH` 补牌。
- `G1SG` 决策窗口。
- HP 变化、死亡、复活链。
- 事件牌、NPC、怪物效果。

### 6.4 不在 M1 做

- 不改 `protocol.ts`。
- 不改 `HandArea` 数据结构。
- 不重写 ZD 行动窗口。
- 不接入 AI delay。

M1 只解决“异步是否被等待”。

### 6.5 验收标准

- `run:stage` 内部存在 async input 时，阶段不会提前进入下一阶段。
- BC 阶段在补牌完成后才进入 QR。
- ZW 中 `G1SG` 响应窗口完成后才进入 ZM。
- `npm run test -- skill-phase` 和新增 async regression 通过。

## 7. M2：结构化输入、Actor 最小抽象与请求生命周期

### 7.1 目标

建立真人和 AI 共用的输入请求模型。M2 完成后，引擎不再关心“玩家是真人还是 AI”，只向 `ActorRegistry` 请求决策。

### 7.2 协议类型

建议在 `src/shared/network/protocol.ts` 新增：

```ts
export interface Candidate {
  id: string;
  kind: 'player' | 'card' | 'side' | 'option';
  label: string;
  uid?: number;
  cardInstanceId?: number;
  value?: string;
  disabledReason?: string;
}

export interface LegalAction {
  actionId: string;
  type: 'PLAY_CARD' | 'USE_SKILL' | 'SELECT_TARGET' | 'CHOOSE_OPTION' | 'PASS' | 'CONFIRM';
  actorUid: number;
  cardInstanceIds?: number[];
  skillCodes?: string[];
  targetUids?: number[];
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  requiresConfirm?: boolean;
  disabledReason?: string;
}

export interface DecisionRequest {
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
  sourceFormat?: string;
}

export interface DecisionResponse {
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

字段解释：

- `requestId`：唯一请求 ID，防止旧响应污染新阶段。
- `phaseId`：阶段实例 ID，不只是 `ZD` 这种阶段名。一次 ZD 重入也应有不同 phaseId。
- `recipients`：谁有权响应。
- `policy`：团队/多人输入如何仲裁。
- `legalActions`：服务端计算的可执行动作白名单。
- `sourceFormat`：legacy 兼容字段，方便排查旧 format 转换。

### 7.3 InputManager 改造

当前 `InputManager` 以 uid 管 pending，无法表达多人推举、同一玩家连续请求、过期响应。建议改为：

```ts
interface PendingDecision {
  request: DecisionRequest;
  resolve: (response: DecisionResponse | null) => void;
  timer: ReturnType<typeof setTimeout> | null;
  consumed: boolean;
}
```

核心方法：

```ts
requestDecision(request: DecisionRequest): Promise<DecisionResponse | null>;
submitDecision(response: DecisionResponse): SubmitResult;
cancelDecision(requestId: string): void;
getPendingForUid(uid: number): DecisionRequest[];
```

兼容包装：

```ts
waitForInput(uid, format, code, arg): Promise<string> {
  const request = formatToDecision(uid, format, code, arg);
  const response = await requestDecision(request);
  return decisionToLegacyInput(response);
}
```

### 7.4 Actor 最小抽象

M2 必须新增最小 Actor 层，不能等到 M5。

建议文件：

- `src/server/actors/actor.ts`
- `src/server/actors/human-actor.ts`
- `src/server/actors/ai-actor.ts`
- `src/server/actors/actor-registry.ts`

接口：

```ts
export interface Actor {
  uid: number;
  kind: 'human' | 'ai';
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null>;
}
```

HumanActor：

- 通过 `ConnectionManager.send()` 发 `decision_request`。
- 等待 `InputManager.submitDecision()`。
- 超时返回 `null` 或 pass。

AIActor 最小版：

- 不加真实延迟，使用 `DelayPolicy.zero()`。
- 调用现有 `RuleAI` / `RandomAI` / `GreedyAI` 计算。
- 返回 `DecisionResponse`，不直接改引擎状态。

M5 再给 AIActor 加人工延迟、`ai_thinking` 事件和事件队列。

### 7.5 Legacy Adapter

新增 `src/shared/game/input/format-to-decision.ts` 或等价文件：

必须先覆盖：

- `T`：目标玩家选择。
- `J`：ZW 支援/妨碍候选，如 `J1(pT2pT4)`。
- `Q`：手牌选择，M2 仍可先使用 code，M3 改为 instanceId。
- `Y`：菜单选择。
- `S`：阵营选择。
- `//` 与 `!`：自动确认/字面量。

暂缓但保留 fallback：

- `X` 排序。
- 复杂复合格式。
- `C/Z/M/I/G/F/E/H/V/D` 的高级选择。

### 7.6 服务端消息

新增：

```ts
{ type: 'decision_request', payload: DecisionRequest }
{ type: 'decision_result', payload: { requestId: string; accepted: boolean; reason?: string } }
```

兼容保留：

```ts
{ type: 'input_request', payload: { uid, format, code, arg } }
{ type: 'player_input', payload: { input } }
```

### 7.7 验收标准

- 真人和 AI 都可以消费同一个 `DecisionRequest` 类型。
- 过期 requestId 的响应被拒绝。
- 非 recipient 玩家提交被拒绝。
- 同一 request 重复提交只有第一次生效。
- 旧 `input_request` 能通过 adapter 转换，旧前端不立即失效。
- `GameSession` 不再需要为 AI 直接绕过输入协议。

## 8. M3：卡牌实例与牌堆生命周期

### 8.1 目标

把“卡牌代码选择”改成“物理牌实例选择”，并把抽牌/弃牌/洗牌统一收敛到 `DeckManager`。

### 8.2 当前事实与修正口径

当前内部 `Player.tux` 存的是数字 ID，`TuxLib.decodeTux(id)` 能还原牌定义。这已经是物理牌实例，不需要第一阶段引入 UUID。

错误点在协议层：`GameSession.getState()` 把数字 ID 降级成 `code` 字符串，导致前端无法区分两张同名牌。

M3 采用最小改造：

- 内部继续使用 numeric id。
- 协议层命名为 `instanceId`。
- 前端选择 `instanceId`。
- 后续如需 UUID，再另开任务。

### 8.3 协议改造

```ts
export interface CardInstanceState {
  instanceId: number;
  code: string;
  name: string;
  type: string;
  ownerUid?: number;
  zone: 'hand' | 'weapon' | 'armor' | 'trove' | 'exEquip' | 'discard' | 'deck' | 'battle';
  visible: boolean;
  selectable?: boolean;
  disabledReason?: string;
}

export interface PlayerState {
  hand: CardInstanceState[];
  handCount: number;
}
```

迁移步骤：

1. `protocol.ts` 改 `PlayerState.hand` 类型。
2. `GameSession.getState()` 输出 `{ instanceId, code, name, type, zone: 'hand', visible: true }`。
3. 前端 `HandArea` 接收 `CardInstanceState[]`。
4. `selectedCards: string[]` 改为 `selectedCardInstanceIds: number[]`。
5. `InputController` legacy 模式短期仍可把 instanceId 转回旧 input 字符串。
6. M4 后所有战牌/技牌操作直接提交 instanceId。

### 8.4 DeckManager

建议新增 `src/shared/game/engine/deck-manager.ts`：

```ts
export type DeckKind = 'tux' | 'event' | 'monster';

export interface DrawResult {
  cards: number[];
  requested: number;
  drawn: number;
  reshuffled: boolean;
  exhausted: boolean;
}

export class DeckManager {
  drawTux(uid: number, count: number): DrawResult;
  discardTux(cardIds: number[], reason: string): void;
  drawMonsterOrNpc(): DrawResult;
  drawEvent(): DrawResult;
}
```

策略：

- 手牌堆空：若 `tuxDises` 非空，洗回 `tuxPiles`，继续抽。
- 手牌堆和弃牌堆都空：少抽，返回 `drawn < requested`，不得抛未捕获异常。
- 怪物/NPC 堆空：返回 `exhausted=true`，由调用方触发 `G1WJ`。
- 事件堆空：先对照原版 C#；未确认前用 `empty-noop`，不要擅自洗回。

### 8.5 替换顺序

先替换低风险路径：

1. `Game.dealCards()`
2. `GLoop.handleDrawDiscard()` 的 draw 分支。
3. `GLoop.handleGiveCards()`
4. `GLoop.handleCardTransfer()` type 2。

再替换分散效果：

- NPC/事件/技能效果中直接访问 `board.tuxPiles.dequeue()` 的代码。
- 任何直接 push 到 `tuxDises` 的路径，逐步改走 `discardTux()`。

### 8.6 验收标准

- 两张同名手牌只选中一个 instanceId。
- Q 段提交 instanceId，服务端消耗对应 `player.tux` 数字 ID。
- 手牌堆剩 1、弃牌堆 5、抽 3 时能抽满并标记 reshuffled。
- 手牌堆和弃牌堆都空时不死锁。
- 怪物/NPC 堆空触发 exhaustion 结算，不重洗。

## 9. M4：ZW/ZD 战斗行动窗口

### 9.1 目标

让战斗从“自动触发一批 handler”变成“服务端生成合法行动窗口，玩家/AI 选择，服务端校验并结算”。

### 9.2 ZW：支援/妨碍团队决策

#### 9.2.1 输入请求

支援：

```ts
{
  code: 'ZW_SUPPORT',
  recipients: [rounder.uid],
  candidates: aliveSameTeamExceptRounder,
  policy: 'single-actor',
  min: 0,
  max: 1,
  optional: true
}
```

妨碍：

```ts
{
  code: 'ZW_HINDER',
  recipients: aliveEnemyTeam,
  candidates: aliveEnemyTeam,
  policy: 'first-valid',
  min: 0,
  max: 1,
  optional: true
}
```

#### 9.2.2 仲裁规则

第一阶段采用 `first-valid`：

- 敌方任一 recipient 提交合法候选，立即锁定妨碍者。
- 非 recipient 提交无效。
- 候选人死亡、离场、阵营变化后提交无效。
- 超时或全部 pass 则无妨碍者。

后续如需要更接近桌面协商，可增加 `captain` 或 `majority`，但不进 P0。

#### 9.2.3 写入与广播

结算后：

- `board.supporter = selectedSupporter || null`
- `board.hinder = selectedHinder || null`
- 清理上一场战斗遗留的 support/hinder 状态。
- 广播 `battle_participant_selected` 或等价 `game_event`。

#### 9.2.4 验收标准

- rounder 不能选择自己为支援。
- 妨碍请求发给敌方团队，不是固定第一名敌方玩家。
- 非敌方玩家不能替敌方决定妨碍者。
- 不选支援/妨碍仍能正常进入翻怪或放弃分支。

### 9.3 ZD：战牌/技能行动窗口

#### 9.3.1 最小范围

M4 先覆盖 `card-info.md` 中四张基础战牌：

- ZP01 金蝉脱壳。
- ZP02 天罡战气。
- ZP03 金蚕王。
- ZP04 天玄五音。

英雄技能在 M4 中只接入“可被 ZD legalActions 表达”的部分，不要求一次性完善所有复杂技能分支。

#### 9.3.2 BattleActionWindow

建议新增：

- `src/shared/game/engine/battle-action-window.ts`
- `src/shared/game/engine/__tests__/battle-action-window.test.ts`

接口：

```ts
export interface BattleActionContext {
  rounderUid: number;
  supporterUid?: number;
  hinderUid?: number;
  supportSucc: boolean;
  hinderSucc: boolean;
  rPool: number;
  oPool: number;
}

export class BattleActionWindow {
  collectLegalActions(uid: number): LegalAction[];
  apply(response: DecisionResponse): Promise<BattleActionResult>;
  shouldContinue(): boolean;
}
```

#### 9.3.3 合法性规则

| 战牌 | 允许者 | 额外输入 | 效果 | 限制 |
|---|---|---|---|---|
| ZP01 金蝉脱壳 | 参战者 | 二次确认 | 强制结束战斗，无胜败 | 消耗战牌次数 |
| ZP02 天罡战气 | 参战且命中者 | 无 | 翻倍装备/宠物/技能战力相关值 | 消耗战牌次数 |
| ZP03 金蚕王 | 参战且命中者 | 无 | 本方战力 +3 | 消耗战牌次数 |
| ZP04 天玄五音 | 任意有该牌且合法响应者 | 选择阵营 | 指定一方战力 +2 | 消耗战牌次数 |

注意：

- “未参战亦可使用”只适用于 ZP04，不适用于 ZP01/ZP02/ZP03。
- 支援/妨碍未命中者仍算参战，但 ZP02/ZP03 需要“参战且命中生效”。
- `restZP` 只有战牌成功结算后减少。
- 姜云凡等突破次数限制的技能另建扩展点，不在基础规则里硬编码。

#### 9.3.4 行动循环

最小实现可以按“所有有合法行动者依次询问，直到所有人 pass 或无合法行动”为准；后续再细化战力低者优先。

伪流程：

```ts
while (!window.shouldStop()) {
  const recipients = window.getActiveRecipients();
  const request = window.buildDecisionRequest(recipients);
  const response = await actorRegistry.request(request);
  if (!response) {
    window.markPass(recipients);
    continue;
  }
  await window.apply(response);
  await refreshBattlePower();
}
```

#### 9.3.5 验收标准

- ZP04 使用后必须选择阵营，战力池正确 +2。
- 非参战玩家不能打 ZP01/ZP02/ZP03。
- 同一玩家普通情况下不能打第二张战牌。
- 打出战牌后对应 instanceId 从手牌移除。
- 金蝉脱壳能终止战斗并跳过胜败效果。
- 真人或 AI 未响应前，ZD 不进入 ZN。

## 10. M5：时间流控与事件队列

### 10.1 目标

在 M2 的 Actor 同入口基础上，解决“AI 回合光速推进”和“客户端看不到过程”的体验问题。M5 不再负责建立 Actor 基础抽象，只负责时间流控、事件排序和广播节奏。

### 10.2 DelayPolicy

```ts
export interface DelayPolicy {
  aiThinkMs(request: DecisionRequest): number;
  eventMs(event: GameEvent): number;
}
```

建议配置：

| 环境 | AI 思考 | 普通事件 | 翻怪/事件/结算 |
|---|---:|---:|---:|
| test | 0ms | 0ms | 0ms |
| dev | 300-600ms | 100-250ms | 300-600ms |
| local play | 600-1200ms | 250-400ms | 700-1000ms |

### 10.3 GameEvent

```ts
export interface GameEvent {
  seq: number;
  type: 'phase_changed' | 'decision_requested' | 'ai_thinking' | 'card_drawn' | 'card_played' | 'card_discarded' | 'monster_revealed' | 'event_revealed' | 'hp_changed' | 'battle_power_changed' | 'battle_resolved' | 'deck_reshuffled';
  payload: unknown;
  visibility: 'public' | { only: number[] };
  minDelayMs?: number;
  snapshotAfter?: boolean;
}
```

### 10.4 EventQueue

职责：

- 分配单调递增 seq。
- 按顺序广播事件。
- 在事件之间应用 `DelayPolicy.eventMs()`。
- 对 private event 做可见性过滤。
- 在 `snapshotAfter` 或 fallback 定时器触发个性化快照。

注意：

- EventQueue 不能改变规则结果。它只调度广播和节奏。
- 测试必须能禁用 delay。
- 前端动画失败不得阻塞服务端状态机。

### 10.5 AI 思考事件

AIActor 在计算前后发事件：

1. `ai_thinking { uid, requestId, durationMs }`
2. delay
3. strategy decide
4. `decision_result`
5. apply action

验收：

- 多个 AI 连续行动时，前端看到多个 `ai_thinking` 与行动事件。
- 没有一帧内跨多个玩家回合的压缩体验。

## 11. M6：前端操作重构

### 11.1 目标

前端围绕 `DecisionRequest` 渲染操作，不再让玩家理解 format string。

### 11.2 数据流

```text
decision_request
  -> useDecisionInput()
  -> HandArea / BattleArea / SkillDock 高亮
  -> 玩家选择实例/目标/选项
  -> ActionPrompt 汇总确认
  -> decision_response
  -> decision_result + game_event/state_snapshot
```

### 11.3 组件改造

| 模块 | 目标 |
---|---|
| `useGameState` | 增加 `decisionRequest`，保留 legacy `inputRequest` |
| `useDecisionInput` | 管理 selectedCardInstanceIds、selectedTargetUids、optionValues、canSubmit |
| `HandArea` | 接收 `CardInstanceState[]`；按 instanceId 选中；非法牌置灰 |
| `ActionPrompt` | 渲染 prompt、倒计时、确认、跳过、危险操作确认 |
| `SkillDock` | 只启用 `legalActions` 中允许的技能 |
| `BattleStack` | 显示触发者、支援者、妨碍者、命中、双方战力池 |
| `DealTable` | 所有卡牌选择绑定 instanceId，支持背面/窥牌 |

### 11.4 防误操作规则

必须二次确认：

- 结束回合。
- 放弃战斗。
- 金蝉脱壳。
- 会导致自己死亡或强制退场的技能。
- 弃置多张或全部手牌。
- 替换装备导致旧装备弃置。

确认文案必须描述结果，不展示技术 code：

- 正确：“确认使用金蝉脱壳并结束本场战斗？”
- 错误：“提交 ZP01？”

### 11.5 移动端要求

- 手牌区横向滚动，卡牌宽度稳定，不因选中状态改变布局。
- 长按显示卡牌详情，单击只做选择。
- 确认按钮固定在可触达区域。
- 目标高亮不能与角色 HP、状态图标重叠。

### 11.6 验收标准

- 两张同名牌只选中一个实例。
- Q 段只允许选择候选实例。
- T/J 段只允许选择候选玩家。
- 技能按钮非法时不可点击，合法时提交带 requestId/actionId。
- 跳过只作用于当前 request。
- 375px 宽度下核心控件不重叠。

## 12. M7：收敛清理与验收对局

### 12.1 清理清单

- 删除或归档 `OperationPanel.tsx`。
- 将旧 `input_request` / `player_input` 标记 deprecated。
- `format-parser` 只保留 legacy adapter 使用。
- 清理 `SkillPanel` 裸发技能码路径。
- 更新 `README.md`、`CLAUDE.md`、`docs/dev-log.md`、`docs/engine-comparison.md`。

### 12.2 对局验收

至少跑通：

- 2 人：真人 + AI。
- 4 人：1 真人 + 3 AI。
- 4 人：2 真人 + 2 AI，包含敌方团队妨碍推举。
- 6 人：1 真人 + 5 AI，至少 10 回合无死锁。

每局记录：

- 是否出现未响应输入。
- 是否出现阶段跳跃。
- 是否出现手牌实例不一致。
- 是否出现 AI 连续行动不可读。
- 是否触发牌堆重洗或怪物堆耗尽。

## 13. M8：体验增强

M8 只在 M7 通过后开始。不要用动画掩盖规则问题。

允许：

- 抽牌/弃牌/打出基础过渡动画。
- 翻怪/翻事件的基础放大展示层。
- 战斗结算摘要。
- 卡牌详情抽屉。
- 状态图标替代文字标签。
- 弃牌堆最近记录和完整查看。

不允许：

- 音效/音乐。
- 重型 3D 场景。
- 影响规则等待的长动画。
- 为动画引入复杂状态分支。

## 14. 测试矩阵

### 14.1 命令

| 命令 | 用途 |
|---|---|
| `npm run typecheck` | 生产代码类型检查 |
| `npm run test` | 全量 Vitest |
| `npm run test:ai` | AI 对局脚本 |
| `npm run build` | Vite 构建 |
| `npm run lint` | ESLint |

### 14.2 阶段门禁

| 阶段 | 必跑测试 |
|---|---|
| M0 | 新增 regression 文件可运行，允许 todo |
| M1 | `round.test.ts`、`skill-phase.test.ts`、async regression |
| M2 | `protocol.test.ts`、`validation.test.ts`、`game-session.test.ts`、Actor/InputManager tests |
| M3 | `g-handlers.test.ts`、`card-transfer.test.ts`、牌堆 regression、HandArea instance test |
| M4 | `battle-phases.test.ts`、`battle-action-window.test.ts`、ZW/ZD integration |
| M5 | `ai-timing.test.ts`、EventQueue tests、`npm run test:ai` |
| M6 | `GamePage.test.tsx`、`HandArea.test.tsx`、`useDecisionInput` tests |
| M7 | `npm run typecheck`、`npm run test`、`npm run build`、手动 2v2/3v3 验收 |

### 14.3 关键断言清单

- 阶段 handler 未 resolve 前不会推进。
- requestId 过期响应被拒绝。
- 非 recipient 响应被拒绝。
- AI 与真人通过同一个 submit path。
- 手牌同名牌按 instanceId 区分。
- 手牌堆空时洗回弃牌堆。
- 怪物堆空时结算而非重洗。
- ZP04 非参战者可用，ZP01/ZP02/ZP03 非参战者不可用。
- 普通玩家每场战斗只可成功使用一张战牌。

## 15. 风险与处理策略

### 15.1 协议与引擎同时大改

策略：

- M1 只改 await 语义，不改协议。
- M2 新增协议但保留 legacy。
- M3 再改手牌 payload。
- M4 才重写 ZW/ZD 行动窗口。

### 15.2 AI 延迟拖慢测试

策略：

- DelayPolicy 必须可注入。
- 测试默认 0ms。
- dev/local play 才启用人工延迟。

### 15.3 卡牌实例改造影响大量效果

策略：

- 内部沿用当前 numeric id。
- 协议层只增加 `{ instanceId, code, name }`。
- 不在 M3 引入 UUID 或全新 CardInstance 类层级。

### 15.4 旧 DSL 与新协议长期并存

策略：

- M2 建 adapter。
- 新功能只接新协议。
- M7 设置清理节点。
- 所有新测试优先使用 `DecisionRequest`。

## 16. 建议的下一步执行顺序

最小可执行切片：

1. 新增 M0 regression 测试文件，把审计 P0 问题写成测试名。
2. 修 M1：把 `round.ts` 中关键 `eventBus.emit` 改为 awaitable 路径，并补测试。
3. 在 `protocol.ts` 中新增 `DecisionRequest` / `DecisionResponse` / `LegalAction` / `Candidate` 类型。
4. 改 `InputManager` 支持 requestId，同时保留旧 `waitForInput(uid, format, code, arg)` 包装。
5. 新增最小 `Actor` / `HumanActor` / `AIActor` / `ActorRegistry`，AI 先用 zero delay。
6. 将 `GameSession.getState()` 的 `hand` 改为 `CardInstanceState[]`，同步修前端类型和 `HandArea` 最小渲染。
7. 实现 `DeckManager.drawTux()`，先替换初始发牌与 `G0DH`。
8. 重写 ZW 支援/妨碍为 `DecisionRequest`。
9. 实现最小 `BattleActionWindow`，先覆盖 ZP01-ZP04。
10. 接入 EventQueue 与 AI delay policy。
11. 前端从 `InputController` 迁移到 `ActionPrompt` / `useDecisionInput`。
12. 跑 M7 对局验收并清理 legacy 路径。

完成第 9 步后，项目应进入“核心规则闭环验证”；完成第 11 步后，再投入 UI 细节体验。
