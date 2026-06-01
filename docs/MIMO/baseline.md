# M0 基线记录

> **日期：** 2026-06-01
> **里程碑：** M0 — 回归基线与保护网
> **更新：** M1 完成后 (2026-06-01)

## 基线数据

| 指标 | 值 | 说明 |
|------|-----|------|
| **TypeScript 错误数** | 32 | 均为已知的 pre-existing 错误（见下方清单） |
| **测试通过数** | 1473 | 全部 passing |
| **测试 Todo 数** | 16 | M0 新增 19 个 todo → M1 完成后减至 16（M0-01/02/03 已转为 passing） |
| **测试文件** | 85 passed / 3 skipped | skipped 为新增的 3 个 M0 测试文件 |
| **Build 状态** | ✅ 通过 | Vite 生产构建 2.67s |

## M0 新增测试文件

| 文件 | Todo 数 | 分组 |
|------|---------|------|
| `src/shared/game/engine/__tests__/regression-audit.test.ts` | 13 | P0 缺陷回归 |
| `src/server/__tests__/ai-timing.test.ts` | 3 | AI 时序缺陷 |
| `src/client/components/game/__tests__/hand-instance-selection.test.tsx` | 3 | 手牌实例选择缺陷 |

## M0 新增 Todo 用例清单

### Async Phase Suspend (3)
- M0-01: run:stage handler should not advance phase before input resolves
- M0-02: BC phase should wait for G0HT completion before entering QR
- M0-03: ZW G1SG response window should block ZM transition

### Deck Lifecycle (3)
- M0-04: tux deck reshuffles discard pile when empty
- M0-05: monster deck exhaustion triggers G1WJ, not reshuffle
- M0-06: drawTux with empty both piles returns partial, no crash

### ZW Targeting (3)
- M0-07: support candidate excludes rounder
- M0-08: hinder request sent to enemy team, not just first enemy
- M0-09: non-enemy submission rejected

### ZD Battle Window (3)
- M0-10: non-combatant cannot play ZP01/ZP02/ZP03
- M0-11: non-combatant can play ZP04
- M0-12: one battle card per player per fight

### Card Instance (1)
- M0-13: duplicate card codes distinguished by instanceId

### AI Timing (3)
- M0-14: AI response should have visible delay in production
- M0-15: AI should not skip multiple phases in one tick
- M0-16: AI thinking event should be broadcast before action

### Hand Instance Selection (3)
- M0-17: two cards with same code should have different keys
- M0-18: clicking one duplicate should not select both
- M0-19: submission should use instanceId, not card code

## 已知 TypeScript 错误清单 (32)

| 文件 | 错误码 | 说明 |
|------|--------|------|
| `GameOverResult.tsx:9` | TS2741 | 缺少 `exhaustion` 属性 |
| `run-ai-games.ts:90` | TS2365 | string > number 比较 |
| `run-ai-games.ts:135` | TS2339 | EvenementLib 无 decode 方法 |
| `game-session.ts:711` | TS2322 | RuleAI \| null 赋值给 AIStrategy[] |
| `index.ts:475` | TS2345 | room_info 缺少 maxPlayers |
| `battle-phases.test.ts` | TS2769 ×3 | tuple 类型不匹配 |
| `battle-phases.test.ts:371` | TS2345 | EventHandler 类型不兼容 |
| `battle-phases.test.ts:395` | TS2345 | EventHandler 类型不兼容 |
| `g-handlers-remaining.test.ts` | TS2339 ×5 | Monster 无 avatar 属性 |
| `g-handlers-remaining.test.ts:569` | TS2540 | pets 为只读属性 |
| `g-handlers.test.ts:317-319` | TS2739 ×3 | Tux 类型缺少属性 |
| `g0zh-devotion.test.ts` | TS2352 ×3 | LibGroup 私有属性转换 |
| `harvest-pet.test.ts:82` | TS2352 | MonsterLib 私有属性转换 |
| `skill-phase.test.ts:147` | TS2345 | EventHandler 类型不兼容 |
| `skill-registry.ts:366` | TS2339 | {} 无 rounder 属性 |
| `skill-registry.ts:372` | TS2554 | 参数数量不匹配 |
| `skill-registry.ts:381-382` | TS2345 ×2 | EventHandler 返回类型不兼容 |

## 门禁检查命令

```bash
npm run test -- regression-audit   # 13 todo
npm run test -- ai-timing          # 3 todo
npm run test -- hand-instance-selection  # 3 todo
npm run typecheck 2>&1 | grep "error TS" | wc -l  # 32
npm run test 2>&1 | tail -3        # 1473 passed, 19 todo
npm run build                      # 通过
```
