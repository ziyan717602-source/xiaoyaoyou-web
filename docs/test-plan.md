# 测试计划

## 一、测试策略

### 1.1 测试层次

```
┌─────────────────────────────────┐
│  Layer 4: AI 玩家端到端测试       │  ← 模拟真实对局
│  Layer 3: 集成测试               │  ← 模块间交互
│  Layer 2: 单元测试               │  ← 单个函数/类
│  Layer 1: 类型检查               │  ← TypeScript 编译
└─────────────────────────────────┘
```

### 1.2 测试工具

| 工具 | 用途 |
|------|------|
| TypeScript 编译器 | 类型检查 |
| Vitest | 单元测试 + 集成测试 |
| AI 玩家 | 端到端自动对局测试 |
| 手动测试 | UI 交互验证 |

## 二、单元测试

### 2.1 数据模型测试

**文件**: `src/shared/game/__tests__/board.test.ts`
- Board 初始化状态正确
- 玩家座位分配
- 牌堆构建和洗牌
- 弃牌堆管理
- 战斗池计算（CalculateRPool / CalculateOPool）
- 胜负判定（IsRounderBattleWin）
- 玩家排序（OrderedPlayer）
- 清理战斗状态（CleanBattler）
- 序列化消息（ToSerialMessage）

**文件**: `src/shared/game/__tests__/player.test.ts`
- Player 初始化
- HP/STR/DEX 计算（含多层叠加）
- 装备槽管理（武器/防具/饰品）
- 手牌管理（增删查）
- 宠物管理（7 元素槽位）
- 位掩码禁用系统（cardDisabled / cardEffDisabled）
- Diva 内存存储（ROM/RFM/RAM）
- Token 系统

**文件**: `src/shared/game/__tests__/card.test.ts`
- 卡牌类型枚举
- Tux 加载和查找
- TuxEqiup 装备逻辑
- Luggage 容器逻辑
- Monster 加载和属性
- Hero 加载和属性
- Npc 加载
- Evenement 加载
- Rune 加载

### 2.2 游戏引擎测试

**文件**: `src/shared/game/engine/__tests__/xi.test.ts`
- XI 初始化（牌堆构建、技能注册）
- MappingSksp 事件注册表构建
- 英雄选择流程（SelectHero）

**文件**: `src/shared/game/engine/__tests__/xig.test.ts`
- G-Loop 基本流程
- RaiseGMessage 命令路由
- InnerGMessage 优先级解析
- SimpleGMessage 基础命令处理
- SimpleGMessage100 底层命令
- 技能触发和优先级竞争
- 寄生链（parasitism）处理
- Lock 状态处理

**文件**: `src/shared/game/engine/__tests__/xir.test.ts`
- 回合状态机（RunRound）
- 各阶段转换逻辑
- 战斗阶段完整流程
- 事件阶段
- 弃牌阶段

### 2.3 卡牌效果测试

**文件**: `src/shared/game/effects/__tests__/*.test.ts`

每个卡牌效果文件对应一个测试文件，测试：
- Action 执行效果正确
- Valid 判断条件正确
- Input 返回正确的输入格式
- 边界情况（无目标、HP 归零、牌堆为空等）

### 2.4 联机协议测试

**文件**: `src/shared/network/__tests__/protocol.test.ts`
- 消息序列化/反序列化
- 消息路由
- 房间管理逻辑

## 三、集成测试

### 3.1 游戏流程集成测试

**文件**: `src/shared/game/__tests__/game-flow.test.ts`

模拟完整的一局游戏：

```
1. 创建游戏 → 初始化状态
2. 选将阶段 → 选择角色
3. 发牌阶段 → 每人获得手牌
4. 第一回合 → 摸牌→出牌→战斗→结算
5. 多回合进行 → 直到一方胜利
```

### 3.2 联机集成测试

**文件**: `src/server/__tests__/server.test.ts`

```
1. 启动服务器
2. 多个客户端连接
3. 创建房间
4. 加入房间
5. 开始游戏
6. 执行游戏操作
7. 状态同步验证
8. 断线重连
```

## 四、AI 玩家（端到端测试核心）

### 4.1 AI 玩家设计

AI 玩家用于自动化测试，**不作为游戏功能**。目标是：

1. 能完成一局完整游戏
2. 覆盖所有游戏阶段
3. 发现逻辑 bug
4. 验证状态一致性

### 4.2 AI 玩家实现

```typescript
// src/server/__tests__/ai-player.ts

interface AIPlayer {
  // 基本信息
  id: string;
  name: string;
  
  // 决策接口
  onChooseHero(candidates: Hero[]): Hero;
  onPlayCard(hand: Tux[], state: GameState): CardPlay | null;
  onChooseTarget(candidates: Player[]): Player;
  onChooseCard(candidates: Tux[]): Tux;
  onRespondToSkill(skill: Skill, options: string[]): string;
  onDiscard(hand: Tux[], count: number): Tux[];
}
```

### 4.3 AI 策略层级

| 策略 | 说明 | 用途 |
|------|------|------|
| **随机策略** | 所有选择随机 | 压力测试，发现崩溃 |
| **贪心策略** | 优先造成伤害/回复 | 基本功能验证 |
| **规则策略** | 遵循基本游戏规则 | 规则正确性验证 |

### 4.4 自动对局测试流程

```
1. 启动服务器
2. 创建 N 个 AI 玩家连接
3. 创建房间，所有 AI 加入
4. 开始游戏
5. 每个 AI 根据策略做决策
6. 服务端执行游戏逻辑
7. 验证：
   - 每个阶段正常转换
   - 状态始终合法（HP≥0、手牌数合理、装备槽不为空等）
   - 游戏最终能结束（不能无限循环）
8. 记录对局日志
9. 重复 100 局，统计：
   - 成功率（正常结束的比例）
   - 平均回合数
   - 崩溃次数
```

### 4.5 AI 玩家的约束

- AI 玩家只在服务端运行，不涉及 UI
- AI 玩家通过 WebSocket 连接，与普通客户端相同
- AI 玩家的决策必须在 100ms 内完成
- AI 玩家不处理网络延迟和断线

### 4.6 测试场景

| 场景 | 目的 | 预期 |
|------|------|------|
| 2 人随机对局 × 100 | 基本稳定性 | 100% 正常结束 |
| 4 人随机对局 × 100 | 多人稳定性 | 100% 正常结束 |
| 全角色覆盖 | 每个角色至少出场一次 | 所有角色可选 |
| 全手牌覆盖 | 每张手牌至少使用一次 | 所有效果可触发 |
| 全怪物覆盖 | 每个怪物至少出现一次 | 所有怪物可战斗 |
| 全事件覆盖 | 每个事件至少触发一次 | 所有事件可执行 |
| 边界测试 | HP=0、手牌=0、牌堆空 | 不崩溃 |

## 五、测试数据

### 5.1 固定种子

使用固定随机种子确保测试可重复：

```typescript
// 测试时使用固定种子
const rng = new SeededRandom(12345);
```

### 5.2 测试用例数据库

创建独立的测试用卡牌数据，与正式数据分离：

```
src/shared/data/test/
├── heroes.json     # 测试用角色（少量）
├── tux.json        # 测试用手牌
├── monsters.json   # 测试用怪物
└── ...
```

## 六、测试执行

### 6.1 开发时

```bash
# 类型检查
npm run typecheck

# 单元测试
npm run test

# 测试覆盖率
npm run test:coverage
```

### 6.2 CI/CD（可选）

```bash
# 完整测试套件
npm run test:unit        # 单元测试
npm run test:integration # 集成测试
npm run test:ai          # AI 对局测试（100 局）
```

### 6.3 AI 对局测试

```bash
# 运行 AI 对局测试
npm run test:ai -- --games=100 --players=2
npm run test:ai -- --games=100 --players=4

# 查看测试报告
npm run test:ai:report
```

## 七、测试验收标准

### 7.1 功能验收

- [ ] 2 人对局可以完整进行到结束
- [ ] 4 人对局可以完整进行到结束
- [ ] 所有 34 个角色可选且技能正常
- [ ] 所有范围内手牌效果正确
- [ ] 所有范围内怪物战斗正确
- [ ] 所有范围内事件效果正确
- [ ] 联机状态同步正确

### 7.2 稳定性验收

- [ ] AI 随机对局 100 局无崩溃
- [ ] AI 随机对局 100 局全部正常结束
- [ ] 无内存泄漏（长时间运行测试）
- [ ] 无死锁（所有玩家掉线后恢复）

### 7.3 性能验收

- [ ] 单局游戏服务端 CPU 占用 < 10%
- [ ] 状态同步延迟 < 100ms（本地测试）
- [ ] 100 局 AI 对局总耗时 < 10 分钟
