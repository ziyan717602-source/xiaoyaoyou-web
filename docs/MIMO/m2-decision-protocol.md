# M2：结构化输入与 Actor 抽象 — 完成报告

> **日期：** 2026-06-01
> **状态：** ✅ 已完成

## 变更摘要

### T-M2-01: DecisionRequest/Response 类型

**文件：** `src/shared/network/protocol.ts`

新增类型定义：
- `Candidate` — 候选项（玩家/卡牌/阵营/选项）
- `LegalAction` — 合法行动（出牌/选目标/选选项/跳过/确认）
- `DecisionRequest` — 结构化决策请求
- `DecisionResponse` — 结构化决策响应
- `SubmitResult` — 提交结果

扩展协议：
- `ClientMessage` 新增 `decision_response`
- `ServerMessage` 新增 `decision_request` 和 `decision_result`

### T-M2-02: InputManager 扩展

**文件：** `src/shared/game/input-manager.ts`

新增方法：
- `requestDecision(request)` — 请求结构化决策，返回 Promise
- `submitDecision(response)` — 提交决策响应，校验有效性
- `cancelDecision(requestId)` — 取消待处理决策
- `getPendingForUid(uid)` — 获取玩家的待处理决策
- `onDecisionRequest(callback)` — 注册决策请求回调

保留旧 `waitForInput`/`queueInput` 方法，确保向后兼容。

### T-M2-03: Actor 抽象

**新文件：**
- `src/server/actors/actor.ts` — Actor 接口
- `src/server/actors/human-actor.ts` — HumanActor 实现（网络玩家）
- `src/server/actors/ai-actor.ts` — AIActor 实现（AI 玩家）
- `src/server/actors/actor-registry.ts` — ActorRegistry 管理器
- `src/server/actors/index.ts` — Barrel export

**Actor 接口：**
```typescript
interface Actor {
  readonly uid: number;
  readonly kind: 'human' | 'ai';
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null>;
}
```

**HumanActor：** 通过 WebSocket 发送 decision_request，等待 decision_response
**AIActor：** 使用 AIStrategy 本地计算决策（M2 零延迟，M5 加延迟）
**ActorRegistry：** 按 UID 管理 Actor 实例，支持按 recipients 路由请求

### T-M2-04: FormatToDecision 适配器

**文件：** `src/shared/game/input/format-to-decision.ts`

转换逻辑：
| 格式 | 转换结果 |
|------|----------|
| `T1(p2p3)` | SELECT_TARGET, candidates=[P2, P3] |
| `S` | CHOOSE_OPTION, options=[我方, 敌方] |
| `//` | CONFIRM |
| `/...` | optional=true, PASS action added |
| `!` | auto-confirm |

辅助函数：
- `formatToDecision(uid, format, code, phaseId)` — 格式字符串 → DecisionRequest
- `decisionToLegacyInput(response)` — DecisionResponse → 格式字符串

### T-M2-05/T-M2-06: GameSession 集成

**文件：** `src/server/game-session.ts`, `src/server/index.ts`

- 添加 `ActorRegistry` 属性
- 注册 `HumanActor`（网络玩家）和 `AIActor`（AI 玩家）
- 添加 `onDecisionRequest` 回调发送 decision_request
- 添加 `handleDecisionResponse` 方法处理决策响应
- 服务器消息路由添加 `decision_response` case

### T-M2-07: 测试

**新测试文件：**
- `src/shared/game/__tests__/decision-protocol.test.ts` — 10 个测试
- `src/server/__tests__/actor-registry.test.ts` — 6 个测试
- `src/shared/game/input/__tests__/format-to-decision.test.ts` — 9 个测试

**测试覆盖：**
- DecisionRequest 生命周期（request → submit → resolve）
- 超时处理
- 断线处理
- 非法提交拒绝
- Actor 注册和路由
- FormatToDecision 各格式转换

## 验证结果

```bash
npm run typecheck                    # 32 errors（基线不变）✅
npm run test                         # 1501 passed, 16 todo ✅
npm run test -- decision-protocol    # 10 passed ✅
npm run test -- actor-registry       # 6 passed ✅
npm run test -- format-to-decision   # 9 passed ✅
npm run test -- regression-audit     # 3 passed, 10 todo ✅
```

## 新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/server/actors/actor.ts` | 接口 | Actor 抽象 |
| `src/server/actors/human-actor.ts` | 实现 | 网络玩家 Actor |
| `src/server/actors/ai-actor.ts` | 实现 | AI 玩家 Actor |
| `src/server/actors/actor-registry.ts` | 实现 | Actor 注册管理 |
| `src/server/actors/index.ts` | 导出 | Barrel export |
| `src/shared/game/input/format-to-decision.ts` | 适配器 | 格式字符串转换 |
| `src/shared/game/__tests__/decision-protocol.test.ts` | 测试 | InputManager 决策测试 |
| `src/server/__tests__/actor-registry.test.ts` | 测试 | ActorRegistry 测试 |
| `src/shared/game/input/__tests__/format-to-decision.test.ts` | 测试 | 格式转换测试 |

## 后续依赖

M2 完成解锁以下里程碑：
- M3：卡牌实例与牌堆生命周期（DecisionRequest 类型可用）
- M4：ZW/ZD 战斗行动窗口（Actor 抽象可用）
- M5：时间流控与事件队列（AIActor 接入 DelayPolicy）
