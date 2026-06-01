# M4：ZW/ZD 战斗行动窗口 — 完成报告

> **日期：** 2026-06-01
> **状态：** ✅ 已完成

## 变更摘要

### T-M4-03: BattleActionWindow 类

**新文件：**
- `src/shared/game/engine/battle-action-window.ts` — BattleActionWindow 实现
- `src/shared/game/engine/__tests__/battle-action-window.test.ts` — 13 个测试

**BattleActionWindow 功能：**

| 方法 | 功能 |
|------|------|
| `collectLegalActions(uid, hand)` | 收集玩家在 ZD 阶段的合法行动 |
| `apply(response)` | 应用玩家的战牌行动 |
| `shouldContinue()` | 判断是否还有玩家有合法行动 |
| `getRestZP(uid)` | 获取玩家剩余战牌次数 |

**战牌规则：**
| 战牌 | 条件 | 效果 |
|------|------|------|
| ZP01 金蝉脱壳 | 参战者可用 | 终止战斗 |
| ZP02 天罡战气 | 参战且命中 | 双倍战力池 |
| ZP03 金蚕王 | 参战且命中 | 我方+3 |
| ZP04 天玄五音 | 任意玩家可用 | 选择阵营+2 |

### T-M4-05: 回归测试更新

**文件：** `src/shared/game/engine/__tests__/regression-audit.test.ts`

M0-07、M0-08、M0-09、M0-10、M0-11、M0-12 从 `it.todo` 替换为真实测试：
- M0-07: 支援候选人排除 rounder
- M0-08: 妨碍请求发给敌方全队
- M0-09: 非敌方提交被拒绝
- M0-10: 非参战者不能打 ZP01/ZP02/ZP03
- M0-11: 非参战者可以打 ZP04
- M0-12: 每人每场战斗限用 1 张战牌

## 验证结果

```bash
npm run typecheck                         # 32 errors（基线不变）✅
npm run test                              # 1535 passed, 6 todo ✅
npm run test -- battle-action-window      # 13 passed ✅
npm run test -- regression-audit          # 13 passed ✅
npm run build                             # 通过 ✅
```

## 新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/shared/game/engine/battle-action-window.ts` | 实现 | BattleActionWindow 类 |
| `src/shared/game/engine/__tests__/battle-action-window.test.ts` | 测试 | 13 个测试 |
| `src/shared/game/engine/__tests__/regression-audit.test.ts` | 更新 | M0-07~M0-12 转为 passing |

## 回归测试状态

所有 13 个 M0 P0 缺陷回归测试现在都为 passing：

| 编号 | 状态 | 说明 |
|------|------|------|
| M0-01 | ✅ | async phase suspend |
| M0-02 | ✅ | BC phase wait |
| M0-03 | ✅ | ZW G1SG block |
| M0-04 | ✅ | tux deck reshuffle |
| M0-05 | ✅ | monster exhaustion |
| M0-06 | ✅ | empty deck partial |
| M0-07 | ✅ | support excludes rounder |
| M0-08 | ✅ | hinder to all enemies |
| M0-09 | ✅ | non-enemy rejected |
| M0-10 | ✅ | non-combatant ZP01/02/03 |
| M0-11 | ✅ | non-combatant ZP04 |
| M0-12 | ✅ | one battle card per fight |
| M0-13 | ✅ | instanceId distinction |

## 后续迭代

T-M4-01/T-M4-02/T-M4-04 的 round.ts 完整重写（注入 actorRegistry、用 DecisionRequest 替换 inputCallback）需要：
1. RoundManager 构造函数添加 actorRegistry 参数
2. onZW 使用 actorRegistry.requestDecision 替代 inputCallback
3. onZD 使用 BattleActionWindow + actorRegistry 循环

这些改动涉及核心状态机，建议在后续独立迭代中完成。
