# M1：Async 状态机与阶段等待 — 完成报告

> **日期：** 2026-06-01
> **状态：** ✅ 已完成

## 变更摘要

### T-M1-01: EventBus 开发期 guard

**文件：** `src/shared/game/engine/event-bus.ts`

- 定义 `RULE_EVENTS` 集合，包含 `run:stage` 和 `raise:gmessage`
- 在 `emit()` 方法中添加开发期 warning：当规则事件使用同步 emit 时输出 `console.warn`
- 不影响生产环境（`process.env.NODE_ENV !== 'production'` 检查）

### T-M1-02/T-M1-03: round.ts emit → emitAsync

**文件：** `src/shared/game/engine/round.ts`

将以下方法中的 `eventBus.emit()` 改为 `await eventBus.emitAsync()`：

| 方法 | 事件类型 | 数量 |
|------|----------|------|
| `onRoundInit` | `raise:gmessage` | 2 |
| `onST` | `run:stage` | 1 |
| `onEV` | `raise:gmessage` | 2 |
| `onGS` | `run:stage` | 1 |
| `onGR` | `run:stage` | 1 |
| `onGE` | `run:stage` | 1 |
| `onSK` | `raise:gmessage`, `run:stage` | 2 |
| `onZW` | `raise:gmessage` | 1 |
| `onZM` | `raise:gmessage` | 1 |
| `onZC` | `run:stage` | 1 |
| `onZD` | `run:stage` | 1 |
| `onVS` | `raise:gmessage` | 6 |
| `onBC` | `raise:gmessage` | 1 |

另外将 `applyZPEffect` 方法从同步改为 `async`，内部 3 处 `raise:gmessage` 改为 `await emitAsync`。

### T-M1-04: g-loop.ts await 路径审计

**文件：** `src/shared/game/engine/g-loop.ts`

将以下方法从同步改为 `async`，内部 `raiseGMessage` 调用添加 `await`：

| 方法 | 原因 |
|------|------|
| `handleQuarterReset` | G0DH 弃牌需等待处理完成 |
| `handleHarvestPet` | G0HD 宠物分配需等待处理完成 |
| `handleG0HT` | G0DH 抽牌需等待处理完成 |
| `handleEquipSlotVariation` | G0QZ 弃牌需等待处理完成 |

同步更新 `handleDefaultCommand` 中对应的 switch case 添加 `await`。

### T-M1-05: Game.setupBattleListeners 错误处理

**文件：** `src/shared/game/game.ts`

- `run:stage` listener：添加 try-catch，异常时记录日志但不中断回合
- `raise:gmessage` listener：改为 async，添加 try-catch，异常时记录日志

### T-M1-06: 回归测试更新

**文件：** `src/shared/game/engine/__tests__/regression-audit.test.ts`

M0-01、M0-02、M0-03 从 `it.todo` 替换为真实测试：
- M0-01: 验证 `emitAsync` 正确等待异步 handler 完成
- M0-02: 验证异步 handler 按序执行
- M0-03: 验证 `raise:gmessage` 异步 handler 完成后才返回

## 验证结果

```bash
npm run test -- round          # 11 passed ✅
npm run test -- g-loop         # 11 passed ✅
npm run test -- regression-audit  # 3 passed, 10 todo ✅
npm run test                   # 1473 passed, 16 todo ✅
```

## 影响范围

- **不改协议：** 无网络协议变更
- **不改前端：** 无客户端代码变更
- **不改 ZD 行动窗口：** 战斗阶段逻辑不变
- **不接 AI delay：** AI 时序留待 M5 处理

## 后续依赖

M1 完成解锁以下里程碑：
- M2：结构化输入与 Actor 抽象
- M3：卡牌实例与牌堆生命周期
- M4：ZW/ZD 战斗行动窗口
