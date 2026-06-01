# M3：卡牌实例与牌堆生命周期 — 完成报告

> **日期：** 2026-06-01
> **状态：** ✅ 已完成

## 变更摘要

### T-M3-01: CardInstanceState 类型

**文件：** `src/shared/network/protocol.ts`

新增 `CardInstanceState` 接口：
```typescript
interface CardInstanceState {
  instanceId: number;    // 物理牌唯一标识
  code: string;          // 卡牌代码 (e.g., 'JP03')
  name: string;          // 卡牌名称
  type: string;          // 卡牌类型
  zone: 'hand' | ...;    // 所在区域
  visible: boolean;      // 是否可见
  selectable?: boolean;  // 是否可选
  disabledReason?: string; // 不可选原因
}
```

修改 `PlayerState.hand` 类型从 `string[]` 改为 `CardInstanceState[]`。

### T-M3-02: GameSession.getState()

**文件：** `src/server/game-session.ts`

`getState()` 中手牌映射改为输出 `CardInstanceState[]`：
- `instanceId` = 卡牌在牌堆中的唯一 ID
- `code` = 卡牌代码
- `name` = 卡牌名称
- `type` = 卡牌类型
- `zone` = 'hand'
- `visible` = true

### T-M3-03: HandArea 组件

**文件：** `src/client/components/game/HandArea.tsx`

Props 变更：
- `cards: string[]` → `cards: CardInstanceState[]`
- `selectedCards: string[]` → `selectedCardInstanceIds: number[]`
- `onCardSelect: (code: string) => void` → `onCardSelect: (instanceId: number) => void`

关键改动：
- `key={card.instanceId}` 替代 `key={cardCode}`
- 动画跟踪基于 `instanceId`
- 悬停状态基于 `instanceId`

### T-M3-04: InputController 适配

**文件：** `src/client/components/game/InputController.tsx`, `src/client/pages/GamePage.tsx`

- `selectedCards: string[]` → `selectedCardInstanceIds: number[]`
- 提交时将 instanceId 转换回卡牌代码（legacy 兼容）
- GamePage 状态管理适配新 API

### T-M3-05: DeckManager

**新文件：**
- `src/shared/game/engine/deck-manager.ts` — DeckManager 类
- `src/shared/game/engine/__tests__/deck-manager.test.ts` — 12 个测试

DeckManager 功能：
| 方法 | 功能 |
|------|------|
| `drawTux(count)` | 抽手牌，空堆时洗回弃牌堆 |
| `discardTux(ids, reason)` | 弃手牌到弃牌堆 |
| `drawMonsterOrNpc()` | 抽怪物/NPC，空堆返回 exhausted |
| `drawEvent()` | 抽事件牌，空堆返回 exhausted |

### T-M3-08: 回归测试更新

**文件：** `src/shared/game/engine/__tests__/regression-audit.test.ts`

M0-04、M0-05、M0-06、M0-13 从 `it.todo` 替换为真实测试：
- M0-04: 验证手牌堆空时洗回弃牌堆
- M0-05: 验证怪物堆空返回 exhausted
- M0-06: 验证两堆都空时返回部分结果
- M0-13: 验证 instanceId 可区分同代码卡牌

## 验证结果

```bash
npm run typecheck                    # 32 errors（基线不变）✅
npm run test                         # 1517 passed, 12 todo ✅
npm run test -- deck-manager         # 12 passed ✅
npm run test -- regression-audit     # 7 passed, 6 todo ✅
npm run build                        # 通过 ✅
```

## 新增文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/shared/game/engine/deck-manager.ts` | 实现 | DeckManager 牌堆管理 |
| `src/shared/game/engine/__tests__/deck-manager.test.ts` | 测试 | DeckManager 12 个测试 |
| `src/shared/game/engine/__tests__/regression-audit.test.ts` | 更新 | M0-04/05/06/13 转为 passing |
| `src/client/components/game/__tests__/HandArea.test.tsx` | 更新 | 适配新 HandArea API |

## 后续依赖

M3 完成解锁以下里程碑：
- M4：ZW/ZD 战斗行动窗口（CardInstanceState 可用）
- M6：前端操作重构（instanceId 选择系统就绪）
