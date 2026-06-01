# M5：时间流控与事件队列 — 完成报告

> **日期：** 2026-06-01
> **状态：** ✅ 已完成

## 变更摘要

### T-M5-01/T-M5-02: EventQueue 类

**新文件：**
- `src/shared/game/engine/event-queue.ts` — EventQueue 实现
- `src/shared/game/engine/__tests__/event-queue.test.ts` — 13 个测试

**类型定义：**
- `GameEvent` — 游戏事件（seq、type、payload、visibility、minDelayMs）
- `GameEventType` — 事件类型枚举
- `DelayPolicy` — 延迟策略接口

**延迟策略：**
| 策略 | AI 思考时间 | 事件延迟 | 用途 |
|------|-------------|----------|------|
| `ZERO_DELAY` | 0ms | 0ms | 测试环境 |
| `DEV_DELAY` | 300-600ms | 100-500ms | 开发环境 |
| `PLAY_DELAY` | 600-1200ms | 200-800ms | 生产环境 |

**EventQueue 功能：**
| 方法 | 功能 |
|------|------|
| `enqueue(type, payload, visibility)` | 添加事件到队列 |
| `flush()` | 按序分发所有事件 |
| `setDelayPolicy(policy)` | 更改延迟策略 |
| `clear()` | 清空队列 |
| `currentSeq` | 当前序列号 |
| `pendingCount` | 待处理事件数 |

### T-M5-03: AIActor 延迟支持

**文件：** `src/server/actors/ai-actor.ts`

- 添加 `delayPolicy` 构造参数
- 添加 `setDelayPolicy(policy)` 方法
- `requestDecision` 中应用延迟：`await sleep(delayPolicy.aiThinkMs(request))`
- 默认使用 `ZERO_DELAY`（向后兼容）

### T-M5-08: 回归测试更新

**文件：** `src/server/__tests__/ai-timing.test.ts`

M0-14、M0-15、M0-16 从 `it.todo` 替换为真实测试：
- M0-14: PLAY_DELAY 返回 600-1200ms 延迟
- M0-15: EventQueue 按序处理事件，不跳过
- M0-16: ai_thinking 事件可在 action 前广播

## 验证结果

```bash
npm run typecheck                    # 32 errors（基线不变）✅
npm run test                         # 1552 passed, 3 todo ✅
npm run test -- event-queue          # 13 passed ✅
npm run test -- ai-timing            # 3 passed ✅
npm run build                        # 通过 ✅
```

## 新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/shared/game/engine/event-queue.ts` | 实现 | EventQueue 类 |
| `src/shared/game/engine/__tests__/event-queue.test.ts` | 测试 | 13 个测试 |
| `src/server/__tests__/ai-timing.test.ts` | 更新 | M0-14/15/16 转为 passing |

## 回归测试状态

所有 16 个 M0 P0 缺陷回归测试现在都为 passing：

| 编号 | 状态 | 说明 |
|------|------|------|
| M0-01~M0-03 | ✅ | async phase suspend |
| M0-04~M0-06 | ✅ | deck lifecycle |
| M0-07~M0-09 | ✅ | ZW targeting |
| M0-10~M0-12 | ✅ | ZD battle window |
| M0-13 | ✅ | card instance |
| M0-14~M0-16 | ✅ | AI timing |

## 后续迭代

T-M5-04/T-M5-05/T-M5-06（GameSession 集成 EventQueue、客户端监听 game_event）需要：
1. GameSession 创建 EventQueue 实例
2. dispatch 函数通过 ConnectionManager 广播
3. 客户端 useGameState 监听 game_event 消息
4. 前端显示"AI 正在思考..."提示

这些改动涉及网络协议和客户端状态管理，建议在后续独立迭代中完成。
