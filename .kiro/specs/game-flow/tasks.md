# Tasks: game-flow

## 任务总览

- 总计: 10 个主要任务, 约 38 个子任务
- 覆盖需求: 1-8 (全部 8 个需求区域)
- 平均任务大小: 1-3 小时/子任务
- 并行标记 (P): 满足并行条件的任务已标记

---

## 1. 基础设施 - AI 策略接口 (P)

### 1.1 创建 AI 策略接口和 AIPlayer 适配器
_Boundary: src/shared/game/ai/types.ts_

- [ ] 1.1.1 创建 `src/shared/game/ai/types.ts`，实现 `AIStrategy` 接口
  - 定义 `AIStrategy` 接口（name, selectHero, makeMainPhaseDecision, makeBattleDecision, makeInputDecision）
  - 定义方法签名和返回类型
  - 确保接口与 game-engine 的输入系统兼容
  - Done: AIStrategy 接口可编译

- [ ] 1.1.2 实现 `AIPlayer` 适配器类
  - 实现 `AIPlayer` 构造函数（uid, strategy, board）
  - 实现 `selectHero(availableHeroes)` 方法
  - 实现 `getInput(format, code, arg)` 方法
  - 实现 `makeMainPhaseDecision(player, board, validActions)` 方法
  - 实现 `makeBattleDecision(player, board, validTargets)` 方法
  - Done: AIPlayer 类可编译，所有方法签名与接口一致

### 1.2 实现随机策略 AI
_Boundary: src/shared/game/ai/random-ai.ts_

- [ ] 1.2.1 创建 `src/shared/game/ai/random-ai.ts`，实现 `RandomAI` 类
  - 实现 `RandomAI` 构造函数（rng）
  - 实现 `selectHero(availableHeroes)` 随机选择英雄
  - 实现 `makeMainPhaseDecision(player, board, validActions)` 随机选择动作
  - 实现 `makeBattleDecision(player, board, validTargets)` 随机选择目标
  - 实现 `makeInputDecision(player, board, format, code, arg)` 随机选择输入
  - 实现 `parseOptions(format, board)` 解析可选值
  - Done: RandomAI 类可编译，所有方法与接口一致

### 1.3 实现贪心策略 AI (P)
_Boundary: src/shared/game/ai/greedy-ai.ts_

- [ ] 1.3.1 创建 `src/shared/game/ai/greedy-ai.ts`，实现 `GreedyAI` 类
  - 实现 `selectHero(availableHeroes)` 选择 HP 最高的英雄
  - 实现 `makeMainPhaseDecision(player, board, validActions)` 优先出牌，其次技能
  - 实现 `makeBattleDecision(player, board, validTargets)` 选择 HP 最低的目标
  - 实现 `makeInputDecision(player, board, format, code, arg)` 贪心选择
  - Done: GreedyAI 类可编译，所有方法与接口一致

### 1.4 实现规则策略 AI (P)
_Boundary: src/shared/game/ai/rule-ai.ts_

- [ ] 1.4.1 创建 `src/shared/game/ai/rule-ai.ts`，实现 `RuleAI` 类
  - 实现 `selectHero(availableHeroes)` 选择 HP 最高且有治疗技能的英雄
  - 实现 `makeMainPhaseDecision(player, board, validActions)` 治疗优先、攻击优先规则
  - 实现 `makeBattleDecision(player, board, validTargets)` 选择 HP 最低的目标
  - 实现 `makeInputDecision(player, board, format, code, arg)` 规则选择
  - 实现 `isHealAction(action)` 判断是否为治疗动作
  - 实现 `isAttackAction(action)` 判断是否为攻击动作
  - Done: RuleAI 类可编译，所有方法与接口一致

### 1.5 创建 AI 模块导出
_Boundary: src/shared/game/ai/index.ts_

- [ ] 1.5.1 创建 `src/shared/game/ai/index.ts`，导出所有 AI 组件
  - 导出 `AIStrategy` 接口
  - 导出 `AIPlayer` 类
  - 导出 `RandomAI` 类
  - 导出 `GreedyAI` 类
  - 导出 `RuleAI` 类
  - Done: AI 模块导出正确

---

## 2. Game 主类 - 初始化模块

### 2.1 实现 Game 构造函数和配置
_Boundary: src/shared/game/game.ts_

- [ ] 2.1.1 创建 `src/shared/game/game.ts`，实现 `GameConfig` 接口和 `Game` 构造函数
  - 定义 `GameConfig` 接口（playerCount, packages, seed, maxRounds, aiStrategies）
  - 定义 `GameResult` 接口（winner, totalRounds, akaScore, aoScore, reason）
  - 实现 `Game` 构造函数，初始化所有核心组件
  - 实现 `createRNG(seed)` 创建固定随机数生成器
  - 实现组件 getter 方法（getBoard, getLibGroup, getEventBus 等）
  - Done: Game 构造函数可编译，所有组件正确初始化

### 2.2 实现游戏初始化逻辑
_Boundary: src/shared/game/game.ts_

- [ ] 2.2.1 实现 `initialize()` 方法
  - 实现 `initialize()` 调用所有初始化子方法
  - 实现 `initializePiles()` 从 LibGroup 加载卡牌到牌堆
  - 实现 `initializePlayers()` 创建 Player 对象并添加到 Board
  - 实现 `registerEffects()` 注册所有 CardEffect 效果
  - 验证初始化后游戏状态正确
  - Done: initialize() 方法可正确执行所有初始化步骤

---

## 3. Game 主类 - 选将和发牌模块

### 3.1 实现选将流程
_Boundary: src/shared/game/game.ts_

- [ ] 3.1.1 实现 `selectHeroes()` 方法
  - 实现 AI 玩家选将逻辑（调用 AIPlayer.selectHero）
  - 实现 SelectHero.run() 调用
  - 实现选将结果确认（Player.initFromHero）
  - 验证选将后玩家属性正确初始化
  - Done: selectHeroes() 方法可正确执行选将流程

### 3.2 实现发牌逻辑
_Boundary: src/shared/game/game.ts_

- [ ] 3.2.1 实现 `dealCards()` 方法
  - 实现初始手牌发放（从牌堆摸取 4 张）
  - 验证发牌后玩家手牌数量正确
  - 验证发牌后牌堆剩余数量正确
  - Done: dealCards() 方法可正确执行发牌逻辑

---

## 4. Game 主类 - 回合循环模块

### 4.1 实现回合循环
_Boundary: src/shared/game/game.ts_

- [ ] 4.1.1 实现 `roundLoop()` 方法
  - 实现回合循环逻辑（调用 RoundManager.runRound）
  - 实现最大回合数检查（防止死循环）
  - 实现游戏结束检查（isGameOver）
  - 实现异常捕获（try-catch 包裹回合执行）
  - Done: roundLoop() 方法可正确执行回合循环

- [ ] 4.1.2 实现 `isGameOver()` 方法
  - 实现游戏结束条件检查（存活玩家数量 <= 1）
  - 验证边界情况（所有玩家死亡、仅剩一名玩家）
  - Done: isGameOver() 方法可正确判断游戏结束

### 4.2 实现回合阶段处理器
_Boundary: src/shared/game/game.ts_

- [ ] 4.2.1 注册回合阶段处理器到 EventBus
  - 注册 `round:draw` 事件处理器（摸牌阶段）
  - 注册 `round:main` 事件处理器（主要阶段）
  - 注册 `round:battle` 事件处理器（战斗阶段）
  - 注册 `round:end` 事件处理器（结束阶段）
  - 验证事件处理器与 RoundManager 的集成
  - Done: 回合阶段处理器正确注册到 EventBus

---

## 5. Game 主类 - 结算模块

### 5.1 实现游戏结算
_Boundary: src/shared/game/game.ts_

- [ ] 5.1.1 实现 `settle()` 方法
  - 实现 `calculateAkaScore()` 计算红方分数
  - 实现 `calculateAoScore()` 计算蓝方分数
  - 实现胜者判定逻辑
  - 实现 `GameResult` 构造和返回
  - Done: settle() 方法可正确计算分数和判定胜者

---

## 6. AI 玩家集成

### 6.1 实现 AI 玩家注入
_Boundary: src/shared/game/game.ts_

- [ ] 6.1.1 实现 `addAIPlayer()` 方法
  - 实现 AI 玩家注册到 aiPlayers Map
  - 实现 AIPlayer 实例化（uid, strategy, board）
  - 验证 AI 玩家可被正确调用
  - Done: addAIPlayer() 方法可正确注入 AI 玩家

- [ ] 6.1.2 实现 `getInput()` 方法
  - 实现输入分发逻辑（AI 玩家或网络层）
  - 实现 AI 玩家输入调用（AIPlayer.getInput）
  - 验证输入格式与 AsyncInput 兼容
  - Done: getInput() 方法可正确分发输入

---

## 7. Game 主类 - 模块导出

### 7.1 创建 Game 模块导出
_Boundary: src/shared/game/game.ts_

- [ ] 7.1.1 确保 `game.ts` 导出所有必要类型
  - 导出 `Game` 类
  - 导出 `GameConfig` 接口
  - 导出 `GameResult` 接口
  - Done: Game 模块导出正确

---

## 8. 集成测试 - Game 类

### 8.1 编写 Game 初始化测试
_Boundary: src/shared/game/__tests__/game.test.ts_

- [ ] 8.1.1 创建 `src/shared/game/__tests__/game.test.ts`，编写 Game 初始化测试
  - 测试 Game 构造函数正确初始化所有组件
  - 测试 initialize() 方法正确加载 LibGroup
  - 测试 initialize() 方法正确初始化牌堆
  - 测试 initialize() 方法正确创建 Player
  - 测试 initialize() 方法正确注册效果
  - Done: Game 初始化测试通过

### 8.2 编写 Game 选将和发牌测试
_Boundary: src/shared/game/__tests__/game.test.ts_

- [ ] 8.2.1 编写选将流程测试
  - 测试 selectHeroes() 方法正确执行
  - 测试 AI 玩家选将逻辑
  - 测试选将结果确认
  - Done: 选将流程测试通过

- [ ] 8.2.2 编写发牌逻辑测试
  - 测试 dealCards() 方法正确发放初始手牌
  - 测试发牌后玩家手牌数量正确
  - 测试发牌后牌堆剩余数量正确
  - Done: 发牌逻辑测试通过

### 8.3 编写 Game 回合循环测试
_Boundary: src/shared/game/__tests__/game.test.ts_

- [ ] 8.3.1 编写回合循环测试
  - 测试 roundLoop() 方法正确执行回合
  - 测试 isGameOver() 方法正确判断游戏结束
  - 测试最大回合数检查
  - 测试异常捕获
  - Done: 回合循环测试通过

### 8.4 编写 Game 结算测试
_Boundary: src/shared/game/__tests__/game.test.ts_

- [ ] 8.4.1 编写结算测试
  - 测试 settle() 方法正确计算分数
  - 测试胜者判定逻辑
  - 测试 GameResult 构造
  - Done: 结算测试通过

---

## 9. 集成测试 - AI 玩家

### 9.1 编写 AI 玩家测试
_Boundary: src/shared/game/__tests__/game.test.ts_

- [ ] 9.1.1 编写 RandomAI 测试
  - 测试 selectHero() 随机选择
  - 测试 makeMainPhaseDecision() 随机选择
  - 测试 makeBattleDecision() 随机选择
  - 测试 makeInputDecision() 随机选择
  - Done: RandomAI 测试通过

- [ ] 9.1.2 编写 GreedyAI 测试
  - 测试 selectHero() 选择 HP 最高英雄
  - 测试 makeMainPhaseDecision() 优先出牌
  - 测试 makeBattleDecision() 选择 HP 最低目标
  - Done: GreedyAI 测试通过

- [ ] 9.1.3 编写 RuleAI 测试
  - 测试 selectHero() 选择有治疗技能的英雄
  - 测试 makeMainPhaseDecision() 治疗优先规则
  - 测试 makeBattleDecision() 选择 HP 最低目标
  - Done: RuleAI 测试通过

### 9.2 编写 AI 对局集成测试
_Boundary: src/shared/game/__tests__/game.test.ts_

- [ ] 9.2.1 编写 AI 对局集成测试
  - 测试 RandomAI 完成一局游戏
  - 测试 GreedyAI 完成一局游戏
  - 测试 RuleAI 完成一局游戏
  - 测试不同玩家数量（2/4/6 人）
  - 测试固定随机种子可重复性
  - Done: AI 对局集成测试通过

---

## 10. 压力测试 - 100 局 AI 对局

### 10.1 编写 2 人对局压力测试
_Boundary: src/shared/game/__tests__/ai-stress.test.ts_

- [ ] 10.1.1 创建 `src/shared/game/__tests__/ai-stress.test.ts`，编写 2 人对局压力测试
  - 实现 `runAIGame(playerCount, strategies, seed)` 辅助函数
  - 编写 100 局 2 人 RandomAI 对局测试
  - 验证每局游戏正常结束（不崩溃、不超时）
  - 验证每局游戏产生有效结果（有胜者或达到最大回合数）
  - Done: 2 人对局压力测试通过

### 10.2 编写 4 人对局压力测试 (P)
_Boundary: src/shared/game/__tests__/ai-stress.test.ts_

- [ ] 10.2.1 编写 100 局 4 人 RandomAI 对局测试
  - 验证每局游戏正常结束
  - 验证每局游戏产生有效结果
  - Done: 4 人对局压力测试通过

### 10.3 编写 6 人对局压力测试 (P)
_Boundary: src/shared/game/__tests__/ai-stress.test.ts_

- [ ] 10.3.1 编写 100 局 6 人 RandomAI 对局测试
  - 验证每局游戏正常结束
  - 验证每局游戏产生有效结果
  - Done: 6 人对局压力测试通过

### 10.4 编写混合策略压力测试
_Boundary: src/shared/game/__tests__/ai-stress.test.ts_

- [ ] 10.4.1 编写混合策略压力测试
  - 测试 RandomAI vs GreedyAI 对局
  - 测试 RandomAI vs RuleAI 对局
  - 测试 GreedyAI vs RuleAI 对局
  - 测试不同随机种子的多样性
  - Done: 混合策略压力测试通过

---

## 11. 模块集成和验证

### 11.1 验证与上游依赖兼容
_Boundary: src/shared/game/game.ts_

- [ ] 11.1.1 验证与 core-models 模块的接口兼容性
  - 验证 Board、Player、Skill 等类型的正确使用
  - 验证 LibGroup、Casting 等接口的正确调用
  - Done: 与 core-models 兼容

- [ ] 11.1.2 验证与 game-engine 模块的接口兼容性
  - 验证 EventBus、SkillRegistry、GLoop 的正确使用
  - 验证 RoundManager、SelectHero 的正确调用
  - Done: 与 game-engine 兼容

- [ ] 11.1.3 验证与 card-effects 模块的接口兼容性
  - 验证 CardEffectRegistry 的正确使用
  - 验证 Cottage 效果的正确注册
  - Done: 与 card-effects 兼容

### 11.2 验证下游接口准备就绪

- [ ] 11.2.1 验证 network-server 可使用 Game 实例
  - 验证 Game 类可被 network-server 实例化
  - 验证 Game 类支持通过事件注入玩家操作
  - Done: network-server 接口准备就绪

- [ ] 11.2.2 验证 client-ui 可读取游戏状态
  - 验证 getBoard() 方法返回正确的 Board 实例
  - 验证 getPlayers() 方法返回正确的 Player Map
  - 验证 getRoundState() 方法返回正确的回合状态
  - Done: client-ui 接口准备就绪

---

## 12. 最终验证

### 12.1 运行所有测试

- [ ] 12.1.1 运行所有单元测试
  - 运行 AI 策略测试
  - 运行 Game 类测试
  - 确保所有测试通过
  - Done: 所有单元测试通过

- [ ] 12.1.2 运行所有集成测试
  - 运行 Game 集成测试
  - 运行 AI 对局集成测试
  - 确保所有测试通过
  - Done: 所有集成测试通过

- [ ] 12.1.3 运行压力测试
  - 运行 100 局 2/4/6 人对局
  - 确保所有对局正常结束
  - Done: 压力测试通过

### 12.2 验证代码编译

- [ ] 12.2.1 验证所有模块可编译
  - 运行 TypeScript 编译器检查所有文件
  - 修复任何类型错误
  - Done: 所有模块编译通过

---

## 任务依赖关系

```
1.1 AIStrategy ──┐
                 ├── 1.5 AI 模块导出
1.2 RandomAI ────┤
1.3 GreedyAI ────┤
1.4 RuleAI ──────┘
                 │
2.1 Game 构造 ───┐
                 ├── 2.2 初始化
                 │        │
                 │        ├── 3.1 选将
                 │        │        │
                 │        │        ├── 3.2 发牌
                 │        │        │        │
                 │        │        │        ├── 4.1 回合循环
                 │        │        │        │        │
                 │        │        │        │        ├── 5.1 结算
                 │        │        │        │        │
                 │        │        │        │        ├── 6.1 AI 集成
                 │        │        │        │        │
                 │        │        │        │        ├── 7.1 模块导出
                 │        │        │        │
                 │        │        │        └── 4.2 回合处理器
                 │        │        │
                 │        │        └── 8.1-8.4 Game 测试
                 │        │
                 │        └── 9.1-9.2 AI 测试
                 │
                 └── 11.1-11.2 模块集成验证
                              │
                              └── 12.1-12.2 最终验证
```

## 并行任务标记

以下任务满足并行条件，可同时执行：

- **(P)** 1.1 AIStrategy + 1.2 RandomAI + 1.3 GreedyAI + 1.4 RuleAI（AI 策略独立，可并行）
- **(P)** 10.2 4 人对局 + 10.3 6 人对局（压力测试独立，可并行）
- **(P)** 8.1-8.4 Game 测试（测试用例独立，可并行）
- **(P)** 9.1.1-9.1.3 AI 策略测试（测试用例独立，可并行）

## 测试覆盖矩阵

| Requirement | Task IDs | Test Coverage |
|-------------|----------|---------------|
| 1. Game 主类集成 | 2.1, 2.2 | 8.1.1 |
| 2. 完整游戏流程 | 3.1, 3.2, 4.1, 4.2, 5.1 | 8.2.1, 8.2.2, 8.3.1, 8.4.1 |
| 3. AI 玩家实现 | 1.1-1.5, 6.1 | 9.1.1-9.1.3, 9.2.1 |
| 4. 固定随机种子 | 2.1.1 | 9.2.1 |
| 5. 集成测试 | 8.1-8.4, 9.1-9.2 | 8.1-9.2 |
| 6. AI 对局压力测试 | 10.1-10.4 | 10.1-10.4 |
| 7. 模块导出和接口 | 7.1, 11.1, 11.2 | 11.1-11.2 |
| 8. 错误处理和健壮性 | 4.1.1, 2.2.1 | 8.3.1, 10.1-10.4 |
