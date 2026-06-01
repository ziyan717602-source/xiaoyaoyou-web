# Requirements Document

## Introduction

本模块将所有上游模块（core-models、game-engine、card-effects）串联为完整的游戏流程，实现从创建游戏到结束的完整链路。提供可独立运行的完整游戏（无 UI、无网络），AI 玩家可自动完成一局游戏，单元测试覆盖核心流程，100 局 AI 对局无崩溃。

## Requirements

### Requirement 1: Game 主类集成

**Objective:** 作为游戏引擎，需要一个 Game 类将 core-models、game-engine、card-effects 串联为完整的可运行游戏。

#### Acceptance Criteria

1. When 创建 Game 实例时，game-flow 系统 shall 初始化 LibGroup（从 JSON 数据加载所有卡牌库）。
2. When 创建 Game 实例时，game-flow 系统 shall 初始化 Board 和 Player 对象。
3. When 创建 Game 实例时，game-flow 系统 shall 初始化 EventBus、SkillRegistry、GLoop、RoundManager、SelectHero。
4. When 创建 Game 实例时，game-flow 系统 shall 初始化 CardEffectRegistry 并注册所有卡牌效果。
5. When 调用 Game.run() 时，game-flow 系统 shall 按顺序执行：初始化 → 选将 → 发牌 → 回合循环 → 结算。
6. When 游戏运行中发生异常时，game-flow 系统 shall 捕获异常并输出错误信息，而非崩溃。
7. Where Game 类被实例化时，game-flow 系统 shall 支持配置玩家数量（2/4/6）、卡牌包、随机种子。

### Requirement 2: 完整游戏流程

**Objective:** 作为游戏玩家，游戏需要按照完整的流程从创建到结束运行。

#### Acceptance Criteria

1. When 游戏初始化时，game-flow 系统 shall 从 LibGroup 加载手牌、怪物、事件牌到对应牌堆并打乱。
2. When 选将阶段开始时，game-flow 系统 shall 为每位玩家随机分配可选英雄并等待选择。
3. When 选将完成时，game-flow 系统 shall 根据英雄属性初始化玩家的 HP、STR、DEX、技能列表。
4. When 发牌阶段开始时，game-flow 系统 shall 从手牌堆为每位玩家摸取初始手牌（数量由规则决定）。
5. When 回合开始时，game-flow 系统 shall 按 RoundManager 阶段顺序执行：摸牌 → 主要阶段 → 战斗阶段 → 结束阶段。
6. When 主要阶段时，game-flow 系统 shall 允许当前回合玩家执行出牌、使用技能、购买、混战等操作。
7. When 战斗阶段时，game-flow 系统 shall 执行怪物战斗结算（伤害计算、经验获取、掉落处理）。
8. When 回合结束时，game-flow 系统 shall 检查是否有玩家死亡，并传递回合权给下一位玩家。
9. When 游戏结束条件满足时（仅剩一名玩家存活或达到最大回合数），game-flow 系统 shall 停止回合循环并进入结算。
10. When 结算阶段时，game-flow 系统 shall 计算最终分数（AkaScore/AoScore）并输出游戏结果。

### Requirement 3: AI 玩家实现

**Objective:** 作为测试工具，AI 玩家需要能够自动完成一局游戏，无需人工干预。

#### Acceptance Criteria

1. When AI 玩家被创建时，game-flow 系统 shall 支持多种策略：随机策略、贪心策略、规则策略。
2. When AI 玩家在选将阶段时，game-flow 系统 shall 根据策略自动选择英雄。
3. When AI 玩家在主要阶段时，game-flow 系统 shall 根据策略自动决定出牌、使用技能、购买等操作。
4. When AI 玩家在战斗阶段时，game-flow 系统 shall 根据策略自动选择攻击目标和使用战牌。
5. When AI 玩家在需要输入时（如选择目标、选择卡牌），game-flow 系统 shall 通过 AsyncInput 机制提供自动选择。
6. Where AI 玩家无法执行合法操作时，game-flow 系统 shall 自动跳过当前操作。
7. When AI 玩家的所有操作均为合法操作时，game-flow 系统 shall 确保游戏不会因 AI 决策而进入死循环。

### Requirement 4: 固定随机种子支持

**Objective:** 作为测试工具，游戏需要支持固定随机种子以确保测试可重复。

#### Acceptance Criteria

1. When 创建 Game 实例时指定了随机种子，game-flow 系统 shall 使用该种子初始化随机数生成器。
2. When 使用相同随机种子运行两次游戏时，game-flow 系统 shall 产生完全相同的游戏流程和结果。
3. When 未指定随机种子时，game-flow 系统 shall 使用默认随机种子（如当前时间戳）。

### Requirement 5: 集成测试

**Objective:** 作为开发团队，需要集成测试验证所有模块正确协作。

#### Acceptance Criteria

1. When Game 类被实现时，game-flow 系统 shall 提供游戏初始化的集成测试（LibGroup 加载、Board 初始化、Player 初始化）。
2. When 选将流程被实现时，game-flow 系统 shall 提供选将流程的集成测试（Casting 初始化、玩家选择、英雄确认）。
3. When 回合循环被实现时，game-flow 系统 shall 提供完整回合流程的集成测试（摸牌、出牌、战斗、结束）。
4. When AI 玩家被实现时，game-flow 系统 shall 提供 AI 玩家自动完成一局游戏的集成测试。
5. When 卡牌效果被触发时，game-flow 系统 shall 验证 CardEffectRegistry 与 EventBus 的集成正确。

### Requirement 6: AI 对局压力测试

**Objective:** 作为质量保证，100 局 AI 对局必须全部正常结束，无崩溃、无死循环。

#### Acceptance Criteria

1. When 运行 100 局 AI 对局时，game-flow 系统 shall 确保每局游戏正常结束（不崩溃、不超时）。
2. When 运行 100 局 AI 对局时，game-flow 系统 shall 确保每局游戏产生有效的游戏结果（有胜者或达到最大回合数）。
3. Where 某局游戏超过最大回合数时，game-flow 系统 shall 强制结束并输出平局结果。
4. When 运行 AI 对局时，game-flow 系统 shall 支持 2 人、4 人、6 人三种玩家数量。
5. When 运行 AI 对局时，game-flow 系统 shall 支持不同随机种子以产生多样化的对局。

### Requirement 7: 模块导出和接口

**Objective:** 作为下游模块（network-server、client-ui），game-flow 需要提供清晰的公共接口。

#### Acceptance Criteria

1. When 下游模块导入 game-flow 时，game-flow 系统 shall 导出 Game 类及其配置接口。
2. When 下游模块需要获取游戏状态时，game-flow 系统 shall 提供 getBoard()、getPlayers()、getRoundState() 等方法。
3. When 下游模块需要注入玩家操作时，game-flow 系统 shall 支持通过事件或回调机制接收玩家输入。
4. When 下游模块需要监听游戏事件时，game-flow 系统 shall 通过 EventBus 暴露游戏事件（回合开始、卡牌使用、战斗结算等）。

### Requirement 8: 错误处理和健壮性

**Objective:** 作为可运行的游戏，需要处理各种异常情况确保游戏稳定运行。

#### Acceptance Criteria

1. When 牌堆为空时，game-flow 系统 shall 触发牌堆重洗（将弃牌堆洗回牌堆）或跳过摸牌。
2. When 所有玩家都死亡时，game-flow 系统 shall 正确处理游戏结束逻辑。
3. When 玩家 HP 降至 0 时，game-flow 系统 shall 标记玩家为死亡并移除其回合权。
4. When 游戏状态异常时，game-flow 系统 shall 输出详细的错误日志而非静默失败。
5. When AI 玩家操作超时时，game-flow 系统 shall 强制跳过该操作并继续游戏。

### Scope Boundary

**包含（In）**:
- Game 主类（串联所有模块）
- 完整游戏流程（创建→选将→发牌→回合循环→结算）
- AI 玩家（随机/贪心/规则策略）
- 固定随机种子支持
- 集成测试
- 100 局 AI 对局压力测试
- 模块导出接口

**不包含（Out）**:
- 网络层（WebSocket 通信，属于 network-server 模块）
- UI（React 前端界面，属于 client-ui 模块）
- 单独的卡牌效果翻译（属于 card-effects 模块）
- 核心数据模型翻译（属于 core-models 模块）
- 游戏引擎翻译（属于 game-engine 模块）
