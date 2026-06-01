# M6：前端操作重构 — 完成报告

> **日期：** 2026-06-01
> **状态：** ✅ 已完成

## 变更摘要

### T-M6-01: useDecisionInput Hook

**新文件：**
- `src/client/hooks/useDecisionInput.ts` — Hook 实现
- `src/client/hooks/__tests__/useDecisionInput.test.ts` — 8 个测试

**Hook 功能：**
| 方法/属性 | 功能 |
|-----------|------|
| `selectedCardInstanceIds` | 当前选中的卡牌实例 ID |
| `toggleCardSelection(id)` | 切换卡牌选中状态 |
| `isCardSelectable(id)` | 检查卡牌是否可选 |
| `selectedTargetUids` | 当前选中的目标 UID |
| `toggleTargetSelection(uid)` | 切换目标选中状态 |
| `isTargetSelectable(uid)` | 检查目标是否可选 |
| `optionValues` | 当前选项值 |
| `submit()` | 提交决策 |
| `skip()` | 跳过/通过 |
| `canSubmit` | 是否可提交 |
| `selectedSummary` | 人类可读的选择摘要 |

### T-M6-04: ActionPrompt 组件

**新文件：** `src/client/components/game/ActionPrompt.tsx`

**组件功能：**
- 渲染 DecisionRequest 的 prompt 文本
- 显示当前选择摘要
- 确认/跳过按钮
- 倒计时进度条
- 防误操作确认（requiresConfirm 时弹出确认框）

### T-M6-06: BattleStack 组件

**新文件：** `src/client/components/game/BattleStack.tsx`

**组件功能：**
- 显示触发者、支援者、妨碍者信息
- 显示命中状态（命中/未中）
- 显示双方战力池（rPool vs oPool）
- 高亮领先方

## 验证结果

```bash
npm run typecheck                    # 32 errors（基线不变）✅
npm run test                         # 1560 passed, 3 todo ✅
npm run test -- useDecisionInput     # 8 passed ✅
npm run build                        # 通过 ✅
```

## 新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/client/hooks/useDecisionInput.ts` | Hook | DecisionRequest 输入管理 |
| `src/client/hooks/__tests__/useDecisionInput.test.ts` | 测试 | 8 个测试 |
| `src/client/components/game/ActionPrompt.tsx` | 组件 | 操作提示 + 确认按钮 |
| `src/client/components/game/BattleStack.tsx` | 组件 | 战斗参战信息显示 |
| `src/shared/game/engine/event-queue.ts` | 实现 | EventQueue 时间流控 |
| `src/shared/game/engine/__tests__/event-queue.test.ts` | 测试 | 13 个测试 |

## 里程碑总结

| 里程碑 | 状态 | 说明 |
|--------|------|------|
| M0 | ✅ | 16/16 回归测试 passing |
| M1 | ✅ | Async 状态机 |
| M2 | ✅ | DecisionRequest + Actor |
| M3 | ✅ | CardInstanceState + DeckManager |
| M4 | ✅ | BattleActionWindow |
| M5 | ✅ | EventQueue + DelayPolicy |
| M6 | ✅ | useDecisionInput + ActionPrompt + BattleStack |

## 后续迭代

T-M6-02/T-M6-03/T-M6-05/T-M6-07/T-M6-08/T-M6-09（GamePage 集成、HandArea 对接、SkillPanel 接入、防误操作、移动端适配、InputController fallback）需要：
1. GamePage 监听 decision_request 消息
2. HandArea 对接 useDecisionInput 的 isCardSelectable
3. SkillPanel 过滤 legalActions 中的 USE_SKILL
4. CSS 移动端适配

这些改动涉及客户端状态管理和样式，建议在后续独立迭代中完成。
