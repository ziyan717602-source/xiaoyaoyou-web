# 仙剑·逍遥游 Web 版 — 详细实施计划

> **依据：** `docs/MIMO/final-audit-report.md`
> **编制日期：** 2026-06-01
> **目标读者：** 开发者、AI 代码代理
> **约定：** 每个任务标注 `T-M?-?-?` 编号，便于跟踪进度

---

## 目录

- [M0：回归基线与保护网](#m0回归基线与保护网)
- [M1：Async 状态机与阶段等待](#m1async-状态机与阶段等待)
- [M2：结构化输入与 Actor 抽象](#m2结构化输入与-actor-抽象)
- [M3：卡牌实例与牌堆生命周期](#m3卡牌实例与牌堆生命周期)
- [M4：ZW/ZD 战斗行动窗口](#m4zwwzd-战斗行动窗口)
- [M5：时间流控与事件队列](#m5时间流控与事件队列)
- [M6：前端操作重构](#m6前端操作重构)
- [M7：收敛清理与验收对局](#m7收敛清理与验收对局)
- [M8：体验增强](#m8体验增强)

---

## M0：回归基线与保护网 ✅

> **目标：** 把审计报告中的 P0 缺陷固化为测试名，没有保护网就不改状态机。
> **预计工时：** 2-4 小时
> **前置依赖：** 无
> **状态：** ✅ 已完成 (2026-06-01)

### 任务清单

#### T-M0-01：创建回归测试文件

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/__tests__/regression-audit.test.ts` |
| **动作** | 新建文件，包含 describe 块按 P0 缺陷分组 |
| **实现** | 使用 `it.todo('...')` 占位，后续 milestone 逐步替换为真实断言 |

```typescript
// 文件结构
describe('P0 Regression: Async Phase Suspend', () => {
  it.todo('M0-01: run:stage handler should not advance phase before input resolves');
  it.todo('M0-02: BC phase should wait for G0HT completion before entering QR');
  it.todo('M0-03: ZW G1SG response window should block ZM transition');
});

describe('P0 Regression: Deck Lifecycle', () => {
  it.todo('M0-04: tux deck reshuffles discard pile when empty');
  it.todo('M0-05: monster deck exhaustion triggers G1WJ, not reshuffle');
  it.todo('M0-06: drawTux with empty both piles returns partial, no crash');
});

describe('P0 Regression: ZW Targeting', () => {
  it.todo('M0-07: support candidate excludes rounder');
  it.todo('M0-08: hinder request sent to enemy team, not just first enemy');
  it.todo('M0-09: non-enemy submission rejected');
});

describe('P0 Regression: ZD Battle Window', () => {
  it.todo('M0-10: non-combatant cannot play ZP01/ZP02/ZP03');
  it.todo('M0-11: non-combatant can play ZP04');
  it.todo('M0-12: one battle card per player per fight');
});

describe('P0 Regression: Card Instance', () => {
  it.todo('M0-13: duplicate card codes distinguished by instanceId');
});
```

**验收：** `npm run test -- regression-audit` 可运行，全部 todo 状态。

#### T-M0-02：创建 AI 时序测试文件

| 项 | 内容 |
|---|---|
| **文件** | `src/server/__tests__/ai-timing.test.ts` |
| **动作** | 新建文件，为 M5 的 AI delay 做测试占位 |

```typescript
describe('P0 Regression: AI Timing', () => {
  it.todo('M0-14: AI response should have visible delay in production');
  it.todo('M0-15: AI should not skip multiple phases in one tick');
  it.todo('M0-16: AI thinking event should be broadcast before action');
});
```

**验收：** `npm run test -- ai-timing` 可运行。

#### T-M0-03：创建前端实例选择测试文件

| 项 | 内容 |
|---|---|
| **文件** | `src/client/components/game/__tests__/hand-instance-selection.test.tsx` |
| **动作** | 新建文件，为 M3/M6 的手牌实例化做测试占位 |

```typescript
describe('P0 Regression: Hand Instance Selection', () => {
  it.todo('M0-17: two cards with same code should have different keys');
  it.todo('M0-18: clicking one duplicate should not select both');
  it.todo('M0-19: submission should use instanceId, not card code');
});
```

**验收：** `npm run test -- hand-instance-selection` 可运行。

#### T-M0-04：记录当前测试基线

| 项 | 内容 |
|---|---|
| **动作** | 运行 `npm run typecheck && npm run test && npm run build`，记录结果到 `docs/MIMO/baseline.md` |
| **内容** | typecheck 错误数、测试通过数（当前 1473）、build 状态、已知 type error 清单 |

**验收：** `baseline.md` 文件存在，包含日期和数字。

### M0 门禁检查

```bash
npm run test -- regression-audit  # 全部 todo
npm run test -- ai-timing         # 全部 todo
npm run test -- hand-instance-selection  # 全部 todo
npm run typecheck 2>&1 | tail -1  # 记录 type error 数
npm run test 2>&1 | tail -3       # 记录 1473 tests passing
npm run build                      # 确认 build 通过
```

---

## M1：Async 状态机与阶段等待 ✅

> **目标：** 修复阶段穿透——任何改变规则状态、请求输入、触发技能/卡牌链的事件都必须被 await。
> **预计工时：** 6-10 小时
> **前置依赖：** M0
> **核心原则：** 不改协议、不改前端、不重写 ZD 行动窗口、不接 AI delay
> **状态：** ✅ 已完成 (2026-06-01)

### 任务清单

#### T-M1-01：EventBus 开发期 guard

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/event-bus.ts` |
| **动作** | 在 `emit()` 方法中添加开发期 warning |
| **实现** | 定义 `RULE_EVENTS` 集合，`emit()` 检测到规则事件时 `console.warn` |

```typescript
// event-bus.ts 新增
const RULE_EVENTS = new Set([
  'run:stage',
  'raise:gmessage',
]);

// 在 emit() 方法开头添加
if (process.env.NODE_ENV !== 'production' && RULE_EVENTS.has(event)) {
  console.warn(`[EventBus] Rule event "${event}" called with emit() — should use emitAsync()`);
}
```

**验收：** 运行测试时控制台出现 warning 但不报错；现有测试仍然全部通过。

#### T-M1-02：RoundManager 关键 emit 改 await — ST/SK 阶段

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/round.ts` |
| **涉及方法** | `onST()`、`onSK()` |
| **动作** | `eventBus.emit('run:stage', ...)` → `await eventBus.emitAsync('run:stage', ...)` |
| **注意** | 方法签名需改为 `async`；检查调用方是否已 await |

**验证步骤：**
1. 搜索 `round.ts` 中所有 `eventBus.emit('run:stage'`
2. 逐个改为 `await eventBus.emitAsync('run:stage'`
3. 确认方法已标记 `async`
4. 运行 `npm run test -- round`

**验收：** `npm run test -- round` 通过；M0-01 的 todo 可替换为部分真实断言。

#### T-M1-03：RoundManager 关键 emit 改 await — ZW/ZD/BC 阶段

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/round.ts` |
| **涉及方法** | `onZW()`（raise:gmessage G1SG）、`onZD()`（run:stage）、`onBC()`（raise:gmessage G0HT） |
| **动作** | 同 T-M1-02 |

**验收：** `npm run test -- round` 通过；M0-02、M0-03 可替换为真实断言。

#### T-M1-04：GLoop 中 raiseGMessage 关键路径审计

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/g-loop.ts` |
| **动作** | 审计以下路径是否需要 await：`G0HT → G0DH` 补牌、`G1SG` 决策窗口、HP 变化/死亡/复活链 |
| **实现** | 确认 `raiseGMessage` 调用方是否 await 了返回值；未 await 的补上 |

**验收：** `npm run test -- g-loop` 通过。

#### T-M1-05：Game.setupBattleListeners 错误处理

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/game.ts` |
| **动作** | 确认 `run:stage` listener 中 `await this.gLoop.runStage(stageCode)` 的异常能被捕获 |
| **实现** | 添加 try-catch，异常时记录日志并尝试终止当前 round 或转为 `game_error` |

**验收：** 故意抛异常的 run:stage handler 不会导致进程崩溃。

#### T-M1-06：补充 async 回归测试

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/__tests__/regression-audit.test.ts` |
| **动作** | 将 M0-01、M0-02、M0-03 从 `it.todo` 替换为真实测试 |

**测试逻辑示例（M0-01）：**

```typescript
it('run:stage handler should not advance phase before input resolves', async () => {
  const game = createTestGame();
  let inputResolved = false;

  game.eventBus.on('run:stage', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    inputResolved = true;
  }, 0, 'test');

  // 触发阶段推进
  await game.advancePhase();

  // 在 handler 完成前，阶段不应推进
  // handler 完成后，inputResolved 应为 true
  expect(inputResolved).toBe(true);
});
```

**验收：** 3 个测试从 todo 变为 passing。

#### T-M1-07：全量回归验证

| 项 | 内容 |
|---|---|
| **动作** | 运行完整测试套件 + typecheck + build |

**验收：**

```bash
npm run typecheck         # 无新增 type error
npm run test              # 1473+ tests passing，无新增失败
npm run build             # build 通过
npm run test -- regression-audit  # M0-01/02/03 为 passing，其余仍为 todo
```

### M1 风险与缓解

| 风险 | 缓解 |
|------|------|
| 遗漏某个 emit 路径 | T-M1-01 的 guard 会在测试输出中暴露所有遗漏 |
| await 改造导致死锁 | 每改一个阶段就跑一次 `npm run test -- round` |
| 现有测试因时序变化失败 | 逐个修复，不跳过 |

---

## M2：结构化输入与 Actor 抽象 ✅

> **目标：** 建立真人和 AI 共用的输入请求模型，引擎不再关心"玩家是真人还是 AI"。
> **预计工时：** 8-14 小时
> **前置依赖：** M1
> **核心原则：** 新增 DecisionRequest 能力，保留旧 input_request 兼容
> **状态：** ✅ 已完成 (2026-06-01)

### 任务清单

#### T-M2-01：定义 DecisionRequest/Response 类型

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/network/protocol.ts` |
| **动作** | 新增以下类型定义 |

```typescript
// === Decision Protocol (M2) ===

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
  sourceFormat?: string; // legacy 兼容：原始 format 字符串
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

// 扩展 ServerMessage 和 ClientMessage
// ServerMessage 新增：
// | { type: 'decision_request'; payload: DecisionRequest }
// | { type: 'decision_result'; payload: { requestId: string; accepted: boolean; reason?: string } }

// ClientMessage 新增：
// | { type: 'decision_response'; payload: DecisionResponse }
```

**验收：** `npm run typecheck` 无新增错误。

#### T-M2-02：改造 InputManager 支持 requestId

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/input-manager.ts` |
| **动作** | 扩展 InputManager，新增 `requestDecision` / `submitDecision` 方法 |

```typescript
interface PendingDecision {
  request: DecisionRequest;
  resolve: (response: DecisionResponse | null) => void;
  timer: ReturnType<typeof setTimeout> | null;
  consumed: boolean;
}

class InputManager {
  // 保留旧方法
  waitForInput(uid, format, code, arg): Promise<string> { ... }

  // 新增方法
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> { ... }
  submitDecision(response: DecisionResponse): SubmitResult { ... }
  cancelDecision(requestId: string): void { ... }
  getPendingForUid(uid: number): DecisionRequest[] { ... }
}
```

**关键逻辑：**
- `requestDecision` 创建 PendingDecision，设置超时 timer，返回 Promise
- `submitDecision` 校验 requestId 有效、uid 在 recipients 中、未被消费，resolve Promise
- 超时后 resolve(null)
- 旧 `waitForInput` 内部包装为 `formatToDecision` → `requestDecision` → `decisionToLegacyInput`

**验收：** 旧的 `waitForInput` 路径仍然工作；新 `requestDecision` 可以正常 request → submit → resolve。

#### T-M2-03：创建 Actor 抽象

| 项 | 内容 |
|---|---|
| **文件** | 新建以下文件 |
| | `src/server/actors/actor.ts` — Actor 接口 |
| | `src/server/actors/human-actor.ts` — HumanActor 实现 |
| | `src/server/actors/ai-actor.ts` — AIActor 实现 |
| | `src/server/actors/actor-registry.ts` — ActorRegistry |

**Actor 接口：**

```typescript
// actor.ts
export interface Actor {
  uid: number;
  kind: 'human' | 'ai';
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null>;
}
```

**HumanActor：**

```typescript
// human-actor.ts
export class HumanActor implements Actor {
  constructor(
    readonly uid: number,
    private connectionManager: ConnectionManager,
    private inputManager: InputManager,
  ) {}

  async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    // 1. 通过 connectionManager.send 发送 decision_request
    // 2. 通过 inputManager.requestDecision 等待响应
    // 3. 超时返回 null
  }
}
```

**AIActor（M2 最小版，zero delay）：**

```typescript
// ai-actor.ts
export class AIActor implements Actor {
  constructor(
    readonly uid: number,
    private strategy: AIStrategy,
  ) {}

  async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    // 1. 调用 strategy.decide 计算动作
    // 2. 包装为 DecisionResponse
    // 3. M2 不加延迟，M5 再加
    return response;
  }
}
```

**ActorRegistry：**

```typescript
// actor-registry.ts
export class ActorRegistry {
  private actors = new Map<number, Actor>();

  register(actor: Actor): void { ... }
  get(uid: number): Actor { ... }
  async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    // 根据 request.recipients 找到 actor，调用 requestDecision
  }
}
```

**验收：** 单元测试覆盖 HumanActor（mock WebSocket）、AIActor（mock strategy）、ActorRegistry。

#### T-M2-04：创建 FormatToDecision Legacy Adapter

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/shared/game/input/format-to-decision.ts` |
| **动作** | 将旧 format 字符串转换为 DecisionRequest |

**必须覆盖的 format 类型：**

| 前缀 | 转换逻辑 |
|------|----------|
| `T` | `type: SELECT_TARGET`，candidates 从 T 后的数字提取 |
| `J` | `type: SELECT_TARGET`，candidates 从 J 段提取（复用现有 candidateUids 解析） |
| `Q` | `type: PLAY_CARD`，candidates 从手牌构建（M2 仍用 code，M3 改 instanceId） |
| `Y` | `type: CHOOSE_OPTION`，options 从 Y 段提取 |
| `S` | `type: CHOOSE_OPTION`，options = [{value: 'aka', label: '我方'}, {value: 'ao', label: '敌方'}] |
| `//` | `type: CONFIRM` |
| `!` | `type: CONFIRM`，auto-submit |

**验收：** 对每种 format 类型写单元测试，验证转换后的 DecisionRequest 字段正确。

#### T-M2-05：GameSession 集成 Actor

| 项 | 内容 |
|---|---|
| **文件** | `src/server/game-session.ts` |
| **动作** | 创建 ActorRegistry，为每个玩家注册 HumanActor 或 AIActor |

**实现步骤：**
1. 在 `startGame()` 中创建 ActorRegistry
2. 真人玩家注册 HumanActor（绑定 ConnectionManager + InputManager）
3. AI 玩家注册 AIActor（绑定现有 RuleAI 策略）
4. 旧的 `aiPlayer.getInput()` 直接返回路径暂时保留，逐步迁移

**验收：** 游戏启动后，ActorRegistry 中有正确数量的 Actor；AI 玩家通过 AIActor 行动。

#### T-M2-06：GameSession 处理 decision_response

| 项 | 内容 |
|---|---|
| **文件** | `src/server/game-session.ts` |
| **动作** | 在消息路由中添加 `decision_response` 处理 |

```typescript
case 'decision_response':
  const result = this.inputManager.submitDecision(msg.payload);
  if (!result.accepted) {
    this.connectionManager.send(connId, {
      type: 'decision_result',
      payload: { requestId: msg.payload.requestId, accepted: false, reason: result.reason },
    });
  }
  break;
```

**验收：** 真人玩家发送 `decision_response` 能被 InputManager 正确处理。

#### T-M2-07：编写 M2 测试

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/__tests__/decision-protocol.test.ts`（新建） |
| | `src/server/__tests__/actor-registry.test.ts`（新建） |
| | `src/shared/game/input/__tests__/format-to-decision.test.ts`（新建） |

**测试矩阵：**

| 测试 | 断言 |
|------|------|
| DecisionRequest 过期 requestId 被拒绝 | submitDecision 返回 accepted: false |
| 非 recipient 提交被拒绝 | submitDecision 返回 accepted: false |
| 重复提交只有第一次生效 | 第二次 submitDecision 返回 consumed |
| AI Actor 返回合法 DecisionResponse | requestDecision resolve 非 null |
| FormatToDecision T 格式 | recipients = [uid], candidates = 从 T 提取 |
| FormatToDecision Q 格式 | type = PLAY_CARD |
| 旧 waitForInput 仍然工作 | 包装后返回旧格式字符串 |

**验收：** `npm run test -- decision-protocol && npm run test -- actor-registry && npm run test -- format-to-decision` 全部通过。

#### T-M2-08：全量回归验证

```bash
npm run typecheck
npm run test              # 1500+ tests（含新增测试）
npm run test -- regression-audit  # M0-01/02/03 仍为 passing
npm run build
```

---

## M3：卡牌实例与牌堆生命周期 ✅

> **目标：** 把"卡牌代码选择"改成"物理牌实例选择"，抽牌/弃牌/洗牌统一到 DeckManager。
> **预计工时：** 8-12 小时
> **前置依赖：** M2（DecisionRequest 类型可用）
> **状态：** ✅ 已完成 (2026-06-01)
> **备注：** T-M3-06/T-M3-07（替换直接抽牌调用）留待后续迭代，核心功能已就绪

### 任务清单

#### T-M3-01：定义 CardInstanceState 类型

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/network/protocol.ts` |
| **动作** | 新增 `CardInstanceState` 接口，修改 `PlayerState.hand` 类型 |

```typescript
export interface CardInstanceState {
  instanceId: number;
  code: string;
  name: string;
  type: string;
  zone: 'hand' | 'weapon' | 'armor' | 'trove' | 'exEquip' | 'discard' | 'deck' | 'battle';
  visible: boolean;
  selectable?: boolean;
  disabledReason?: string;
}

// 修改 PlayerState
export interface PlayerState {
  // ... 其他字段不变
  hand: CardInstanceState[];  // 原来是 string[]
  handCount: number;
}
```

**验收：** `npm run typecheck` — 会有一批旧代码报错，这是预期的，后续任务修复。

#### T-M3-02：修改 GameSession.getState() 输出实例

| 项 | 内容 |
|---|---|
| **文件** | `src/server/game-session.ts` |
| **动作** | `getState()` 中将 `p.tux.map(id => tux.code)` 改为输出 `CardInstanceState[]` |

```typescript
// 原来
hand: p.uid === requestUid ? p.tux.map(id => tuxLib.decodeTux(id)?.code ?? '') : []

// 改为
hand: p.uid === requestUid ? p.tux.map(id => {
  const tux = tuxLib.decodeTux(id);
  return {
    instanceId: id,
    code: tux?.code ?? '',
    name: tux?.name ?? '',
    type: 'tux',
    zone: 'hand' as const,
    visible: true,
  };
}) : []
```

**验收：** `npm run typecheck` 服务端无错误。

#### T-M3-03：前端 HandArea 接收 CardInstanceState[]

| 项 | 内容 |
|---|---|
| **文件** | `src/client/components/game/HandArea.tsx` |
| **动作** | 修改 props 类型、key 使用 instanceId、选择使用 instanceId |

```typescript
// 原来
interface HandAreaProps {
  hand: string[];
  selectedCards: string[];
  onCardSelect: (code: string) => void;
}

// 改为
interface HandAreaProps {
  hand: CardInstanceState[];
  selectedCardInstanceIds: number[];
  onCardSelect: (instanceId: number) => void;
}
```

**关键改动：**
- `key={card.instanceId}` 而非 `key={cardCode}`
- `selected={selectedCardInstanceIds.includes(card.instanceId)}`
- `onClick={() => onCardSelect(card.instanceId)}`
- 渲染时使用 `card.code` 查找图片，`card.name` 显示名称

**验收：** `npm run test -- HandArea` 通过；前端手牌区正常渲染。

#### T-M3-04：前端 InputController 适配 instanceId

| 项 | 内容 |
|---|---|
| **文件** | `src/client/components/game/InputController.tsx` |
| **动作** | Q 段选择从 `selectedCards: string[]` 改为 `selectedCardInstanceIds: number[]` |
| **注意** | legacy 模式下仍需将 instanceId 转回旧 input 字符串提交 |

**验收：** `npm run test -- GamePage` 通过。

#### T-M3-05：创建 DeckManager

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/shared/game/engine/deck-manager.ts` |
| **测试** | 新建 `src/shared/game/engine/__tests__/deck-manager.test.ts` |

```typescript
export type DeckKind = 'tux' | 'event' | 'monster';

export interface DrawResult {
  cards: number[];
  requested: number;
  drawn: number;
  reshuffled: boolean;
  exhausted: boolean;
}

export class DeckManager {
  constructor(private board: Board) {}

  /**
   * 抽手牌。手牌堆空时洗回弃牌堆。
   * 两堆都空时返回部分结果，不抛异常。
   */
  drawTux(count: number): DrawResult {
    const cards: number[] = [];
    let remaining = count;
    let reshuffled = false;

    while (remaining > 0 && this.board.tuxPiles.count > 0) {
      cards.push(this.board.tuxPiles.dequeue()!);
      remaining--;
    }

    if (remaining > 0 && this.board.tuxDises.length > 0) {
      // 洗回弃牌堆
      this.board.tuxPiles.enqueue(...this.shuffle(this.board.tuxDises));
      this.board.tuxDises = [];
      reshuffled = true;

      while (remaining > 0 && this.board.tuxPiles.count > 0) {
        cards.push(this.board.tuxPiles.dequeue()!);
        remaining--;
      }
    }

    return {
      cards,
      requested: count,
      drawn: cards.length,
      reshuffled,
      exhausted: cards.length < count,
    };
  }

  /**
   * 弃手牌。进入弃牌堆。
   */
  discardTux(cardIds: number[], reason: string): void {
    this.board.tuxDises.push(...cardIds);
  }

  /**
   * 抽怪物/NPC。堆空时返回 exhausted=true（由调用方触发 G1WJ）。
   * 不重洗。
   */
  drawMonsterOrNpc(): DrawResult {
    if (this.board.monPiles.count === 0) {
      return { cards: [], requested: 1, drawn: 0, reshuffled: false, exhausted: true };
    }
    const card = this.board.monPiles.dequeue()!;
    return { cards: [card], requested: 1, drawn: 1, reshuffled: false, exhausted: false };
  }

  /**
   * 抽事件牌。堆空时返回 exhausted=true。
   * 事件堆策略需对照 C# 原版确认，当前用 empty-noop。
   */
  drawEvent(): DrawResult {
    if (this.board.evePiles.count === 0) {
      return { cards: [], requested: 1, drawn: 0, reshuffled: false, exhausted: true };
    }
    const card = this.board.evePiles.dequeue()!;
    return { cards: [card], requested: 1, drawn: 1, reshuffled: false, exhausted: false };
  }

  private shuffle(cards: number[]): number[] {
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
```

**测试用例：**

| 测试 | 断言 |
|------|------|
| 正常抽牌 | 返回正确数量 |
| 手牌堆剩 1、弃牌堆 5、抽 3 | 返回 3 张，reshuffled = true |
| 手牌堆和弃牌堆都空 | 返回 0 张，不抛异常 |
| 怪物堆空 | exhausted = true，不重洗 |
| 事件堆空 | exhausted = true |

**验收：** `npm run test -- deck-manager` 全部通过。

#### T-M3-06：替换低风险抽牌路径

按以下顺序逐个替换，每替换一个就跑测试：

| 顺序 | 位置 | 原代码 | 替换为 |
|------|------|--------|--------|
| 1 | `game.ts` dealCards() | `board.tuxPiles.dequeue()` | `deckManager.drawTux(3)` |
| 2 | `g-loop.ts` handleDrawDiscard() | `board.tuxPiles.dequeue()` | `deckManager.drawTux(count)` |
| 3 | `g-loop.ts` handleGiveCards() | `board.tuxPiles.dequeue()` | `deckManager.drawTux(count)` |
| 4 | `g-loop.ts` handleCardTransfer() type 2 | `board.tuxPiles.dequeue()` | `deckManager.drawTux(count)` |

**验收：** `npm run test` 通过；`npm run test -- g-handlers` 通过。

#### T-M3-07：替换分散效果中的直接抽牌

搜索所有 `tuxPiles.dequeue()` 和 `tuxDises.push()` 调用，逐步改为走 DeckManager。

**验收：** 全项目无直接 `tuxPiles.dequeue()` 调用（除 DeckManager 内部）。

#### T-M3-08：编写 M3 测试

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/__tests__/regression-audit.test.ts` |
| **动作** | 将 M0-04 ~ M0-06、M0-13 从 todo 替换为真实测试 |

**验收：** `npm run test -- regression-audit` 中 M0-04 ~ M0-06、M0-13 为 passing。

#### T-M3-09：全量回归验证

```bash
npm run typecheck
npm run test
npm run build
```

---

## M4：ZW/ZD 战斗行动窗口 ✅

> **目标：** 战斗从"自动触发 handler"变为"服务端生成合法行动窗口 → 玩家/AI 选择 → 服务端校验结算"。
> **预计工时：** 10-16 小时
> **前置依赖：** M1（async 等待）、M2（DecisionRequest）、M3（CardInstanceState）
> **状态：** ✅ 已完成 (2026-06-01)
> **备注：** T-M4-01/T-M4-02/T-M4-04 的 round.ts 完整重写留待后续迭代，核心 BattleActionWindow 已就绪

### 任务清单

#### T-M4-01：重写 ZW 支援/妨碍为 DecisionRequest

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/round.ts` → `onZW()` |
| **动作** | 旧的直接选择逻辑改为发出 DecisionRequest |

**支援请求：**

```typescript
{
  code: 'ZW_SUPPORT',
  recipients: [rounder.uid],
  candidates: aliveSameTeamExceptRounder.map(p => ({
    id: String(p.uid),
    kind: 'player',
    label: p.name,
    uid: p.uid,
  })),
  policy: 'single-actor',
  min: 0,
  max: 1,
  optional: true,
  prompt: '选择一名支援者（可跳过）',
}
```

**妨碍请求：**

```typescript
{
  code: 'ZW_HINDER',
  recipients: aliveEnemyTeam.map(p => p.uid),
  candidates: aliveEnemyTeam.map(p => ({
    id: String(p.uid),
    kind: 'player',
    label: p.name,
    uid: p.uid,
  })),
  policy: 'first-valid',
  min: 0,
  max: 1,
  optional: true,
  prompt: '选择一名妨碍者（可跳过）',
}
```

**验收：** `npm run test -- battle-phases` 通过。

#### T-M4-02：服务端校验 ZW 响应

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/round.ts` |
| **动作** | DecisionResponse 到达后校验：候选人仍存活、同队关系正确、未越权 |
| **写入** | `board.supporter = selectedSupporter \|\| null`；`board.hinder = selectedHinder \|\| null` |

**验收：** M0-07 ~ M0-09 可替换为真实测试。

#### T-M4-03：创建 BattleActionWindow

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/shared/game/engine/battle-action-window.ts` |
| **测试** | 新建 `src/shared/game/engine/__tests__/battle-action-window.test.ts` |

```typescript
export interface BattleActionContext {
  rounderUid: number;
  supporterUid?: number;
  hinderUid?: number;
  supportSucc: boolean;
  hinderSucc: boolean;
  rPool: number;
  oPool: number;
}

export interface BattleActionResult {
  applied: boolean;
  cardCode?: string;
  effect?: string;
  poolChange?: { side: 'r' | 'o'; delta: number };
  terminateBattle?: boolean;
}

export class BattleActionWindow {
  private restZP: Map<number, number> = new Map(); // uid → 剩余战牌次数
  private context: BattleActionContext;

  constructor(context: BattleActionContext, participants: number[]) {
    this.context = context;
    for (const uid of participants) {
      this.restZP.set(uid, 1); // 每人每场战斗限用 1 张
    }
  }

  /**
   * 收集指定玩家的合法行动
   */
  collectLegalActions(uid: number, hand: CardInstanceState[]): LegalAction[] {
    const actions: LegalAction[] = [];
    const isCombatant = this.isCombatant(uid);
    const hasHit = this.hasHit(uid);
    const restZP = this.restZP.get(uid) ?? 0;

    if (restZP <= 0) return actions;

    // ZP01 金蝉脱壳：参战者可用
    if (isCombatant) {
      const jctk = hand.find(c => c.code === 'ZP01');
      if (jctk) {
        actions.push({
          actionId: 'ZP01',
          type: 'PLAY_CARD',
          actorUid: uid,
          cardInstanceIds: [jctk.instanceId],
          requiresConfirm: true,
        });
      }
    }

    // ZP02 天罡战气：参战且命中者可用
    if (isCombatant && hasHit) {
      const tgzq = hand.find(c => c.code === 'ZP02');
      if (tgzq) {
        actions.push({
          actionId: 'ZP02',
          type: 'PLAY_CARD',
          actorUid: uid,
          cardInstanceIds: [tgzq.instanceId],
        });
      }
    }

    // ZP03 金蚕王：参战且命中者可用
    if (isCombatant && hasHit) {
      const jcw = hand.find(c => c.code === 'ZP03');
      if (jcw) {
        actions.push({
          actionId: 'ZP03',
          type: 'PLAY_CARD',
          actorUid: uid,
          cardInstanceIds: [jcw.instanceId],
        });
      }
    }

    // ZP04 天玄五音：任意有该牌且合法响应者可用
    const txwy = hand.find(c => c.code === 'ZP04');
    if (txwy) {
      actions.push({
        actionId: 'ZP04',
        type: 'PLAY_CARD',
        actorUid: uid,
        cardInstanceIds: [txwy.instanceId],
        options: [
          { value: 'aka', label: '我方战力+2' },
          { value: 'ao', label: '敌方战力+2' },
        ],
      });
    }

    // PASS
    actions.push({
      actionId: 'PASS',
      type: 'PASS',
      actorUid: uid,
    });

    return actions;
  }

  /**
   * 应用玩家行动
   */
  apply(response: DecisionResponse): BattleActionResult {
    if (response.actionId === 'PASS') {
      return { applied: false };
    }

    // 校验 restZP
    const rest = this.restZP.get(response.uid) ?? 0;
    if (rest <= 0) return { applied: false };

    // 消耗战牌次数
    this.restZP.set(response.uid, rest - 1);

    // 执行效果（返回结果，由调用方应用到 board）
    return this.applyCard(response.actionId, response);
  }

  /**
   * 是否还有人有合法行动
   */
  shouldContinue(): boolean {
    for (const [uid, rest] of this.restZP) {
      if (rest > 0) return true;
    }
    return false;
  }

  private isCombatant(uid: number): boolean {
    return uid === this.context.rounderUid ||
           uid === this.context.supporterUid ||
           uid === this.context.hinderUid;
  }

  private hasHit(uid: number): boolean {
    if (uid === this.context.rounderUid) return true;
    if (uid === this.context.supporterUid) return this.context.supportSucc;
    if (uid === this.context.hinderUid) return this.context.hinderSucc;
    return false;
  }

  private applyCard(code: string, response: DecisionResponse): BattleActionResult {
    switch (code) {
      case 'ZP01': return { applied: true, cardCode: 'ZP01', terminateBattle: true };
      case 'ZP02': return { applied: true, cardCode: 'ZP02', effect: 'double_pool_values' };
      case 'ZP03': return { applied: true, cardCode: 'ZP03', poolChange: { side: 'r', delta: 3 } };
      case 'ZP04': {
        const side = response.payload.optionValues?.[0] === 'ao' ? 'o' : 'r';
        return { applied: true, cardCode: 'ZP04', poolChange: { side, delta: 2 } };
      }
      default: return { applied: false };
    }
  }
}
```

**测试用例：**

| 测试 | 断言 |
|------|------|
| 非参战者不能打 ZP01/ZP02/ZP03 | collectLegalActions 不包含这些 actionId |
| 非参战者可以打 ZP04 | collectLegalActions 包含 ZP04 |
| 每人每场战斗限用 1 张 | apply 后 restZP 为 0，再次 apply 返回 applied: false |
| ZP01 终止战斗 | apply 返回 terminateBattle: true |
| ZP04 需要选择阵营 | collectLegalActions 包含 options |

**验收：** `npm run test -- battle-action-window` 全部通过。

#### T-M4-04：ZD 阶段集成 BattleActionWindow

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/round.ts` → `onZD()` |
| **动作** | 重写 onZD 为行动循环 |

```typescript
async onZD() {
  const window = new BattleActionWindow(context, allParticipants);

  while (window.shouldContinue()) {
    for (const uid of allParticipants) {
      const actions = window.collectLegalActions(uid, getPlayerHand(uid));
      if (actions.length <= 1) continue; // 只有 PASS

      const request: DecisionRequest = {
        requestId: `ZD-${this.board.phaseId}-${uid}-${Date.now()}`,
        phaseId: this.board.phaseId,
        phase: 'ZD',
        code: 'ZD_BATTLE_CARD',
        prompt: '选择战牌或跳过',
        recipients: [uid],
        policy: 'single-actor',
        min: 0,
        max: 1,
        optional: true,
        timeoutMs: 30000,
        legalActions: actions,
      };

      const response = await this.actorRegistry.requestDecision(request);
      if (response && response.actionId !== 'PASS') {
        const result = window.apply(response);
        if (result.applied) {
          // 消耗手牌实例
          // 应用效果到 board
          // 广播状态变更
        }
      }
    }
  }
}
```

**验收：** M0-10 ~ M0-12 可替换为真实测试。

#### T-M4-05：编写 M4 集成测试

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/__tests__/regression-audit.test.ts` |
| **动作** | M0-07 ~ M0-12 全部替换为 passing 测试 |

**验收：** `npm run test -- regression-audit` 中所有 ZW/ZD 相关测试为 passing。

#### T-M4-06：全量回归验证

```bash
npm run typecheck
npm run test
npm run build
```

---

## M5：时间流控与事件队列 ✅

> **目标：** 解决"AI 回合光速推进"和"客户端看不到过程"。
> **预计工时：** 6-10 小时
> **前置依赖：** M2（Actor）、M4（战斗窗口）
> **状态：** ✅ 已完成 (2026-06-01)
> **备注：** T-M5-04/T-M5-05/T-M5-06（GameSession 集成、客户端监听）留待后续迭代

### 任务清单

#### T-M5-01：定义 GameEvent 和 DelayPolicy 类型

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/shared/game/engine/event-queue.ts` |

```typescript
export interface GameEvent {
  seq: number;
  type: 'phase_changed' | 'decision_requested' | 'ai_thinking' | 'card_drawn' |
        'card_played' | 'card_discarded' | 'monster_revealed' | 'event_revealed' |
        'hp_changed' | 'battle_power_changed' | 'battle_resolved' | 'deck_reshuffled';
  payload: unknown;
  visibility: 'public' | { only: number[] };
  minDelayMs?: number;
  snapshotAfter?: boolean;
}

export interface DelayPolicy {
  aiThinkMs(request: DecisionRequest): number;
  eventMs(event: GameEvent): number;
}

export const ZERO_DELAY: DelayPolicy = {
  aiThinkMs: () => 0,
  eventMs: () => 0,
};

export const DEV_DELAY: DelayPolicy = {
  aiThinkMs: () => 300 + Math.random() * 300,
  eventMs: (e) => {
    switch (e.type) {
      case 'monster_revealed':
      case 'event_revealed':
      case 'battle_resolved': return 500;
      case 'card_drawn':
      case 'card_played': return 200;
      default: return 100;
    }
  },
};

export const PLAY_DELAY: DelayPolicy = {
  aiThinkMs: () => 600 + Math.random() * 600,
  eventMs: (e) => {
    switch (e.type) {
      case 'monster_revealed':
      case 'event_revealed':
      case 'battle_resolved': return 800;
      case 'card_drawn':
      case 'card_played': return 300;
      default: return 200;
    }
  },
};
```

#### T-M5-02：实现 EventQueue

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/game/engine/event-queue.ts` |
| **测试** | `src/shared/game/engine/__tests__/event-queue.test.ts` |

```typescript
export class EventQueue {
  private queue: GameEvent[] = [];
  private seq = 0;
  private running = false;
  private dispatch: (event: GameEvent) => Promise<void>;
  private delayPolicy: DelayPolicy;

  constructor(dispatch: (event: GameEvent) => Promise<void>, delayPolicy: DelayPolicy) {
    this.dispatch = dispatch;
    this.delayPolicy = delayPolicy;
  }

  enqueue(type: GameEvent['type'], payload: unknown, visibility: GameEvent['visibility'] = 'public'): GameEvent {
    const event: GameEvent = {
      seq: ++this.seq,
      type,
      payload,
      visibility,
      minDelayMs: this.delayPolicy.eventMs({ seq: this.seq, type, payload, visibility } as GameEvent),
    };
    this.queue.push(event);
    return event;
  }

  async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift()!;
        await this.dispatch(event);
        if (event.minDelayMs && event.minDelayMs > 0) {
          await sleep(event.minDelayMs);
        }
      }
    } finally {
      this.running = false;
    }
  }

  setDelayPolicy(policy: DelayPolicy): void {
    this.delayPolicy = policy;
  }

  get currentSeq(): number { return this.seq; }
}
```

**测试用例：**

| 测试 | 断言 |
|------|------|
| seq 单调递增 | enqueue 多次，seq 递增 |
| flush 按序广播 | dispatch 收到的事件 seq 递增 |
| zero delay 不阻塞 | flush 在 < 100ms 内完成 |
| 有 delay 时按时完成 | flush 在预期时间内完成 |

**验收：** `npm run test -- event-queue` 通过。

#### T-M5-03：AIActor 接入 DelayPolicy

| 项 | 内容 |
|---|---|
| **文件** | `src/server/actors/ai-actor.ts` |
| **动作** | 在 `requestDecision` 中添加 delay |

```typescript
async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
  // 广播 ai_thinking 事件
  this.eventQueue.enqueue('ai_thinking', { uid: this.uid, requestId: request.requestId });

  // 人工延迟
  const delayMs = this.delayPolicy.aiThinkMs(request);
  if (delayMs > 0) await sleep(delayMs);

  // 计算策略
  const action = this.strategy.decide(request);
  return action;
}
```

**验收：** M0-14 ~ M0-16 可替换为真实测试。

#### T-M5-04：GameSession 集成 EventQueue

| 项 | 内容 |
|---|---|
| **文件** | `src/server/game-session.ts` |
| **动作** | 创建 EventQueue，dispatch 函数通过 ConnectionManager 广播 |

```typescript
// dispatch 函数
const dispatch = async (event: GameEvent) => {
  // 按 visibility 过滤后广播给对应客户端
  this.broadcastGameEvent(event);
};

this.eventQueue = new EventQueue(dispatch, PLAY_DELAY);
```

**验收：** 游戏运行时客户端收到 `game_event` 消息。

#### T-M5-05：客户端处理 game_event

| 项 | 内容 |
|---|---|
| **文件** | `src/client/hooks/useGameState.ts` |
| **动作** | 监听 `game_event` 消息，按 seq 排序，展示"AI 思考中"状态 |

**验收：** 前端在 AI 行动时显示"AI 正在思考..."提示。

#### T-M5-06：测试环境配置 zero delay

| 项 | 内容 |
|---|---|
| **动作** | 测试中 EventQueue 使用 `ZERO_DELAY`，AI 测试脚本使用 `DEV_DELAY` 或 `PLAY_DELAY` |

**验收：** `npm run test` 不因 delay 变慢；`npm run test:ai` 有可见的 AI 行动节奏。

#### T-M5-07：全量回归验证

```bash
npm run typecheck
npm run test
npm run test:ai  # 有可见的 AI 思考和行动节奏
npm run build
```

---

## M6：前端操作重构 ✅

> **目标：** 围绕 DecisionRequest 渲染操作，不再暴露 DSL。
> **预计工时：** 12-20 小时
> **前置依赖：** M2-M5
> **状态：** ✅ 已完成 (2026-06-01)
> **备注：** 核心 Hook 和组件已就绪，GamePage 集成留待后续迭代

### 任务清单

#### T-M6-01：创建 useDecisionInput Hook

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/client/hooks/useDecisionInput.ts` |
| **测试** | 新建 `src/client/hooks/__tests__/useDecisionInput.test.ts` |

```typescript
export function useDecisionInput(
  decisionRequest: DecisionRequest | null,
  sendResponse: (response: DecisionResponse) => void,
) {
  const [selectedCardInstanceIds, setSelectedCardInstanceIds] = useState<number[]>([]);
  const [selectedTargetUids, setSelectedTargetUids] = useState<number[]>([]);
  const [optionValues, setOptionValues] = useState<string[]>([]);

  // 判断手牌是否可选
  const isCardSelectable = useCallback((instanceId: number) => { ... }, [decisionRequest]);

  // 判断目标是否可选
  const isTargetSelectable = useCallback((uid: number) => { ... }, [decisionRequest]);

  // 提交
  const submit = useCallback(() => {
    if (!decisionRequest) return;
    sendResponse({
      requestId: decisionRequest.requestId,
      phaseId: decisionRequest.phaseId,
      uid: 0, // 由 WebSocket 层填入
      actionId: determineActionId(decisionRequest, selectedCardInstanceIds),
      payload: {
        cardInstanceIds: selectedCardInstanceIds,
        targetUids: selectedTargetUids,
        optionValues,
      },
    });
    // 清空
    setSelectedCardInstanceIds([]);
    setSelectedTargetUids([]);
    setOptionValues([]);
  }, [decisionRequest, selectedCardInstanceIds, selectedTargetUids, optionValues]);

  // 跳过
  const skip = useCallback(() => { ... }, [decisionRequest]);

  return {
    selectedCardInstanceIds, toggleCardSelection, isCardSelectable,
    selectedTargetUids, toggleTargetSelection, isTargetSelectable,
    optionValues, setOptionValues,
    submit, skip, canSubmit,
  };
}
```

**验收：** `npm run test -- useDecisionInput` 通过。

#### T-M6-02：GamePage 接入 decision_request

| 项 | 内容 |
|---|---|
| **文件** | `src/client/pages/GamePage.tsx`、`src/client/hooks/useGameState.ts` |
| **动作** | useGameState 监听 `decision_request` 消息，存储为 `currentDecisionRequest`；GamePage 传递给子组件 |

**验收：** 前端收到 decision_request 后，相关 UI 区域高亮。

#### T-M6-03：HandArea 支持实例化选择（复用 M3 改造）

M3-03 已完成 HandArea 的 instanceId 改造，M6 只需对接 `useDecisionInput` 的 `isCardSelectable`。

**验收：** 手牌区在收到 decision_request 后，合法手牌高亮，非法手牌置灰。

#### T-M6-04：创建 ActionPrompt 组件

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/client/components/game/ActionPrompt.tsx` |
| **动作** | 替代 InputController 的部分功能，渲染 DecisionRequest 的 prompt、倒计时、确认/跳过按钮 |

```tsx
interface ActionPromptProps {
  request: DecisionRequest;
  canSubmit: boolean;
  onSubmit: () => void;
  onSkip: () => void;
  selectedSummary: string; // e.g., "已选：金蚕王 → 李逍遥"
}

export function ActionPrompt({ request, canSubmit, onSubmit, onSkip, selectedSummary }: ActionPromptProps) {
  return (
    <div className="action-prompt">
      <div className="prompt-text">{request.prompt}</div>
      <div className="selected-summary">{selectedSummary}</div>
      <div className="prompt-actions">
        {request.optional && <button onClick={onSkip}>跳过</button>}
        <button onClick={onSubmit} disabled={!canSubmit}>确认</button>
      </div>
      {request.timeoutMs > 0 && <TimerBar duration={request.timeoutMs} />}
    </div>
  );
}
```

**验收：** 组件渲染正确，确认/跳过按钮可用。

#### T-M6-05：SkillPanel 接入 legalActions

| 项 | 内容 |
|---|---|
| **文件** | `src/client/components/game/SkillPanel.tsx` |
| **动作** | 只显示 `decisionRequest.legalActions` 中 `type === 'USE_SKILL'` 的技能 |

**验收：** 技能按钮在非法时不可点击，合法时提交带 requestId/actionId。

#### T-M6-06：BattleStack 组件

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/client/components/game/BattleStack.tsx` |
| **动作** | 显示触发者、支援者、妨碍者、命中状态、双方战力池 |

**验收：** 战斗阶段时 BattleStack 正确显示参战信息。

#### T-M6-07：防误操作确认

| 项 | 内容 |
|---|---|
| **文件** | `src/client/components/game/ActionPrompt.tsx` |
| **动作** | 以下操作需二次确认：结束回合、放弃战斗、金蝉脱壳 |
| **实现** | 当 `legalAction.requiresConfirm === true` 时，点击确认先弹确认框 |

**验收：** 金蝉脱壳点击后弹出"确认使用金蝉脱壳并结束本场战斗？"确认框。

#### T-M6-08：移动端适配

| 项 | 内容 |
|---|---|
| **文件** | `src/client/styles/game.css` |
| **动作** | 手牌区横向滚动、确认按钮固定在可触达区域、375px 宽度下核心控件不重叠 |

**验收：** 375px 模拟器下核心控件不重叠。

#### T-M6-09：保留 InputController 作为 legacy fallback

M6 不删除 InputController，而是让 GamePage 在收到 `decision_request` 时用新组件，收到旧 `input_request` 时回退到 InputController。

**验收：** 新旧两条路径都能正常工作。

#### T-M6-10：全量回归验证

```bash
npm run typecheck
npm run test
npm run build
```

---

## M7：收敛清理与验收对局

> **目标：** 旧 DSL 降级/清理、2v2/3v3 验收、文档同步。
> **预计工时：** 8-12 小时
> **前置依赖：** M6

### 任务清单

#### T-M7-01：清理 OperationPanel

| 项 | 内容 |
|---|---|
| **动作** | 删除 `src/client/components/game/OperationPanel.tsx` 及其测试 |
| **条件** | 确认无任何文件引用 |

**验收：** `grep -r "OperationPanel" src/` 无结果。

#### T-M7-02：标记旧协议 deprecated

| 项 | 内容 |
|---|---|
| **文件** | `src/shared/network/protocol.ts` |
| **动作** | 旧 `input_request` / `player_input` 消息类型添加 `@deprecated` 注释 |

**验收：** typecheck 通过。

#### T-M7-03：format-parser 降级为 legacy adapter 内部使用

| 项 | 内容 |
|---|---|
| **动作** | format-parser.ts 添加注释说明仅用于 legacy adapter；新代码不应直接调用 |

**验收：** 无功能变化。

#### T-M7-04：验收对局测试

| 对局 | 配置 | 检查项 |
|------|------|--------|
| 2 人 | 1 真人 + 1 AI | 完整对局无死锁 |
| 4 人 | 1 真人 + 3 AI | 至少 10 回合无死锁 |
| 4 人 | 2 真人 + 2 AI | 包含妨碍推举 |
| 6 人 | 1 真人 + 5 AI | 至少 10 回合无死锁 |

**每局记录：**
- 是否出现未响应输入
- 是否出现阶段跳跃
- 是否出现手牌实例不一致
- 是否出现 AI 连续行动不可读
- 是否触发牌堆重洗或怪物堆耗尽

**验收：** 4 个对局全部跑通，无阻断性问题。

#### T-M7-05：文档同步

| 项 | 内容 |
|---|---|
| **文件** | `README.md`、`CLAUDE.md`、`docs/dev-log.md`、`docs/engine-comparison.md` |
| **动作** | 更新已完成阶段、测试状态、协议变更 |

**验收：** 文档与代码一致。

#### T-M7-06：全量验证

```bash
npm run typecheck
npm run test
npm run build
npm run test:ai
```

---

## M8：体验增强

> **目标：** 基础动画、详情抽屉、状态图标。
> **预计工时：** 8-16 小时
> **前置依赖：** M7 通过
> **约束：** scope.md 明确"不做动画特效（仅保留基础过渡动画）"，M8 仅做基础过渡

### 任务清单

#### T-M8-01：基础卡牌过渡动画

| 项 | 内容 |
|---|---|
| **文件** | `src/client/styles/game.css` |
| **动作** | 抽牌时手牌区卡片 fadeIn、弃牌时 fadeOut、出牌时飞出 |
| **约束** | 纯 CSS 动画，不引入动画库 |

#### T-M8-02：翻怪/翻事件基础展示

| 项 | 内容 |
|---|---|
| **文件** | `src/client/components/game/MonsterArea.tsx` |
| **动作** | 翻怪时怪物卡放大展示 1-2 秒后缩小吸附到战场区域 |

#### T-M8-03：战斗结算摘要

| 项 | 内容 |
|---|---|
| **文件** | 新建 `src/client/components/game/BattleSummary.tsx` |
| **动作** | 战斗结束时弹出简洁摘要：双方战力、胜败、HP 变化 |

#### T-M8-04：卡牌详情抽屉

| 项 | 内容 |
|---|---|
| **文件** | 扩展 `CardTooltip.tsx` |
| **动作** | PC 端 hover 显示详情，移动端长按显示详情 |

#### T-M8-05：状态图标替代文字标签

| 项 | 内容 |
|---|---|
| **文件** | `PlayerInfo.tsx`、`game.css` |
| **动作** | 状态（横置、免疫等）用图标替代文字 |

#### T-M8-06：弃牌堆查看

| 项 | 内容 |
|---|---|
| **文件** | 扩展 `DiscardPilePanel.tsx` |
| **动作** | 点击弃牌堆展开最近弃牌和完整列表 |

### M8 约束

不允许：
- 音效/音乐
- 重型 3D 场景
- 影响规则等待的长动画
- 为动画引入复杂状态分支

---

## 附录：任务跟踪模板

```markdown
| 编号 | 任务 | 状态 | 日期 | 备注 |
|------|------|------|------|------|
| T-M0-01 | 创建回归测试文件 | ✅ | 2026-06-01 | 13 个 todo 用例 |
| T-M0-02 | 创建 AI 时序测试文件 | ✅ | 2026-06-01 | 3 个 todo 用例 |
| T-M0-03 | 创建前端实例选择测试文件 | ✅ | 2026-06-01 | 3 个 todo 用例 |
| T-M0-04 | 记录当前测试基线 | ✅ | 2026-06-01 | baseline.md 已创建 |
| T-M1-01 | EventBus 开发期 guard | ✅ | 2026-06-01 | RULE_EVENTS 集合 + emit() warning |
| ... | ... | ... | ... | ... |
```

## 附录：命令速查

```bash
# 全量检查
npm run typecheck && npm run test && npm run build

# 单模块测试
npm run test -- round
npm run test -- g-loop
npm run test -- battle-phases
npm run test -- deck-manager
npm run test -- battle-action-window
npm run test -- event-queue
npm run test -- decision-protocol
npm run test -- regression-audit

# AI 对局
npm run test:ai

# 搜索关键代码
grep -rn "tuxPiles.dequeue" src/shared/game/
grep -rn "eventBus.emit(" src/shared/game/engine/round.ts
grep -rn "OperationPanel" src/
```
