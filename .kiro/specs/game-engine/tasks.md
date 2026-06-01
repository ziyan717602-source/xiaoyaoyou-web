# Tasks: game-engine

## 任务总览

- 总计: 12 个主要任务, 约 42 个子任务
- 覆盖需求: 1.1-7 (全部 7 个需求区域)
- 平均任务大小: 1-3 小时/子任务
- 并行标记 (P): 满足并行条件的任务已标记

---

## 1. 事件总线系统

### 1.1 实现 EventBus 核心类
_Boundary: src/shared/game/engine/event-bus.ts_

- [ ] 1.1.1 创建 `src/shared/game/engine/event-bus.ts`，实现 `EventBus` 类
  - 实现 `on(event, handler, priority, source)` 注册事件监听器
  - 实现 `once(event, handler, priority, source)` 注册一次性监听器
  - 实现 `off(event, handler)` 移除事件监听器
  - 实现 `offBySource(source)` 按来源批量移除监听器
  - 实现 `emit(event, data)` 触发事件（同步版本）
  - 实现 `emitAsync(event, data)` 触发事件（异步版本）
  - 实现事件优先级排序（高优先级先执行）
  - 实现事件取消（stopPropagation）
  - 实现 `clear()` 清除所有监听器
  - 实现 `listenerCount(event)` 获取监听器数量
  - Done: EventBus 类可编译，所有方法签名与设计一致

### 1.2 实现事件消息类型
_Boundary: src/shared/game/engine/g-message.ts_

- [ ] 1.2.1 创建 `src/shared/game/engine/g-message.ts`，实现 `GMessage` 接口和消息类
  - 实现 `GMessageType` 枚举（G0OH, G1OH, G2OH, G0OT, G1OT, G2OT, G0OP, G1OP, G2OP 等）
  - 实现 `GMessage` 接口（type, sender, receiver, args, timestamp, cancelled, source）
  - 实现 `SimpleGMessage` 类（字符串协议序列化/反序列化）
  - 实现 `InnerGMessage` 类（内部消息，对象格式）
  - 实现消息的 `toString()` 序列化方法
  - 实现消息的 `fromString()` 反序列化方法
  - 实现消息的 `clone()` 克隆方法
  - Done: GMessage 类型可编译，序列化格式与原版兼容

- [ ] 1.2.2 实现 `EventMessage` 和 `EventContext` 接口
  - 实现 `EventMessage` 接口（type, sender, receiver, args, timestamp, cancelled）
  - 实现 `EventContext` 接口（message, board, sender, receiver, registry）
  - Done: 事件上下文接口可编译

### 1.3 事件总线单元测试

- [ ] 1.3.1 编写事件总线单元测试
  - 创建 `src/shared/game/engine/__tests__/event-bus.test.ts`
  - 测试 EventBus 注册/移除监听器
  - 测试 EventBus 事件触发和优先级排序
  - 测试 EventBus 事件取消（stopPropagation）
  - 测试 EventBus 一次性监听器（once）
  - 测试 EventBus 异步事件处理
  - 测试 EventBus clear 和 listenerCount
  - Done: 所有事件总线测试通过

- [ ] 1.3.2 编写消息类型单元测试
  - 创建 `src/shared/game/engine/__tests__/g-message.test.ts`
  - 测试 SimpleGMessage 序列化和反序列化
  - 测试 SimpleGMessage 字符串协议兼容性
  - 测试 InnerGMessage 内部消息处理
  - 测试消息的 clone 方法
  - Done: 所有消息类型测试通过

---

## 2. 技能注册表系统

### 2.1 实现 SkillRegistry 类
_Boundary: src/shared/game/engine/skill-registry.ts_

- [ ] 2.1.1 创建 `src/shared/game/engine/skill-registry.ts`，实现 `SkillRegistry` 类
  - 实现 `registerSkill(skill, handler)` 从 Skill 对象注册
  - 实现 `registerTux(tux, handler)` 从 Tux 对象注册
  - 实现 `registerMonster(monster, handler)` 从 Monster 对象注册
  - 实现 `registerNPC(npc, handler)` 从 NPC 对象注册
  - 实现 `registerEvenement(eve, handler)` 从 Evenement 对象注册
  - 实现 `buildFromLibGroup(libGroup)` 从 LibGroup 构建完整注册表
  - 实现 `findHandlers(messageType, team)` 按消息类型查找处理器
  - 实现 `clear()` 清除所有注册
  - Done: SkillRegistry 类可编译，所有方法签名与设计一致

### 2.2 实现 Occur 匹配规则

- [ ] 2.2.1 实现 `matchOccur(occurPattern, messageType)` 函数
  - 实现 Occur 字符串解析（G{team}O{type} 格式）
  - 实现消息类型匹配逻辑
  - 实现通配符和条件匹配支持
  - Done: Occur 匹配规则可编译

### 2.3 技能注册表单元测试

- [ ] 2.3.1 编写技能注册表单元测试
  - 创建 `src/shared/game/engine/__tests__/skill-registry.test.ts`
  - 测试 SkillRegistry 从 Skill/Tux/Monster/NPC/Evenement 注册
  - 测试 SkillRegistry 按消息类型查找处理器
  - 测试 SkillRegistry 按优先级排序处理器
  - 测试 SkillRegistry once/lock/hind 标志处理
  - 测试 SkillRegistry clear 和 offBySource
  - Done: 所有技能注册表测试通过

---

## 3. G-Loop 核心系统

### 3.1 实现 GLoop 类
_Boundary: src/shared/game/engine/g-loop.ts_

- [ ] 3.1.1 创建 `src/shared/game/engine/g-loop.ts`，实现 `GLoop` 类
  - 实现 `send(message)` 发送消息到队列
  - 实现 `sendAsync(message)` 发送消息并等待响应
  - 实现 `processQueue()` 处理消息队列
  - 实现 `processMessage(message)` 处理单条消息
  - 实现 `preProcess(message)` 预处理
  - 实现 `postProcess(message, result)` 后处理
  - 实现 `start()` 启动主循环
  - 实现 `stop()` 停止主循环
  - 实现 `pause()` 暂停主循环
  - 实现 `resume()` 恢复主循环
  - 实现 `queueLength` getter 获取队列长度
  - 实现 `clearQueue()` 清空队列
  - Done: GLoop 类可编译，所有方法签名与设计一致

### 3.2 G-Loop 核心单元测试

- [ ] 3.2.1 编写 G-Loop 核心单元测试
  - 创建 `src/shared/game/engine/__tests__/g-loop.test.ts`
  - 测试 GLoop 消息队列管理
  - 测试 GLoop 消息处理流程
  - 测试 GLoop 异步处理
  - 测试 GLoop 启动/暂停/停止
  - 测试 GLoop 队列溢出处理
  - Done: 所有 G-Loop 核心测试通过

---

## 4. 回合状态机系统

### 4.1 实现 RoundPhase 枚举和 RoundManager 类
_Boundary: src/shared/game/engine/round.ts_

- [ ] 4.1.1 创建 `src/shared/game/engine/round.ts`，实现 `RoundPhase` 枚举和 `RoundManager` 类
  - 实现 `RoundPhase` 枚举（PREPARE, ROUND_START, DRAW_PHASE, MAIN_PHASE, BATTLE_PHASE, END_PHASE, ROUND_END 等）
  - 实现 `PHASE_TRANSITIONS` 转换规则常量
  - 实现 `RoundState` 接口（phase, roundNumber, currentRounder, previousPhase, phaseData）
  - 实现 `RoundManager` 构造函数（board, eventBus）
  - 实现 `transition(nextPhase)` 阶段转换
  - 实现 `canTransition(nextPhase)` 检查转换合法性
  - 实现 `runRound()` 执行完整回合流程
  - 实现阶段处理器：`onRoundStart`, `onDrawPhase`, `onMainPhase`, `onBattlePhase`, `onEndPhase`, `onRoundEnd`
  - 实现 `getState()` 获取当前状态
  - 实现 `phase` getter 获取当前阶段
  - 实现 `roundNumber` getter 获取当前回合数
  - Done: RoundManager 类可编译，所有方法签名与设计一致

### 4.2 回合状态机单元测试

- [ ] 4.2.1 编写回合状态机单元测试
  - 创建 `src/shared/game/engine/__tests__/round.test.ts`
  - 测试 RoundPhase 阶段定义和转换规则
  - 测试 RoundManager 阶段转换
  - 测试 RoundManager 完整回合流程
  - 测试 RoundManager 阶段处理器
  - 测试 RoundManager 状态管理
  - Done: 所有回合状态机测试通过

---

## 5. 游戏初始化系统

### 5.1 实现 XI 类
_Boundary: src/shared/game/engine/xi.ts_

- [ ] 5.1.1 创建 `src/shared/game/engine/xi.ts`，实现 `XI` 类
  - 实现 `GameConfig` 接口（playerCount, packages, seed, mode）
  - 实现 `XI` 构造函数（config）
  - 实现 `run()` 启动游戏
  - 实现 `initialize()` 初始化游戏
  - 实现 `initializePiles()` 初始化牌堆
  - 实现 `initializePlayers()` 初始化玩家
  - 实现 `mappingSksp()` 构建技能注册表
  - 实现 `gameLoop()` 游戏主循环
  - 实现 `isGameRunning()` 检查游戏是否运行中
  - 实现 `isGameOver()` 检查游戏是否结束
  - 实现 `onGameOver()` 游戏结束处理
  - 实现组件 getter 方法（getBoard, getLibGroup, getEventBus 等）
  - Done: XI 类可编译，所有方法签名与设计一致

### 5.2 游戏初始化单元测试

- [ ] 5.2.1 编写游戏初始化单元测试
  - 创建 `src/shared/game/engine/__tests__/xi.test.ts`
  - 测试 XI 初始化流程
  - 测试 XI MappingSksp 技能注册
  - 测试 XI 配置管理
  - 测试 XI 组件初始化
  - Done: 所有游戏初始化测试通过

---

## 6. 选将系统

### 6.1 实现 SelectHero 类
_Boundary: src/shared/game/engine/select-hero.ts_

- [ ] 6.1.1 创建 `src/shared/game/engine/select-hero.ts`，实现 `SelectHero` 类
  - 实现 `SelectHeroConfig` 接口（mode, playerCount, heroCount）
  - 实现 `SelectHero` 构造函数（board, eventBus）
  - 实现 `run()` 执行选将流程
  - 实现 `initialize()` 初始化选将
  - 实现 `selectLoop()` 选将循环
  - 实现 `waitForPlayerSelection(player)` 等待玩家选择
  - 实现 `processSelection(playerId, heroId)` 处理选择
  - 实现 `isValidSelection(playerId, heroId)` 验证选择
  - 实现 `isSelectionComplete()` 检查选将是否完成
  - 实现 `confirmSelection()` 确认选将结果
  - 实现 `getAvailableHeroes()` 获取可用英雄
  - 实现 `pickRandomHeroes(heroes, count)` 随机选取英雄
  - 实现 `getConfig()` 和 `setConfig()` 配置管理
  - Done: SelectHero 类可编译，所有方法签名与设计一致

### 6.2 选将系统单元测试

- [ ] 6.2.1 编写选将系统单元测试
  - 创建 `src/shared/game/engine/__tests__/select-hero.test.ts`
  - 测试 SelectHero 选将流程
  - 测试 SelectHero Casting 集成
  - 测试 SelectHero 选将事件
  - 测试 SelectHero 配置管理
  - Done: 所有选将系统测试通过

---

## 7. Artiad 动作解析器

### 7.1 实现 Parser 类
_Boundary: src/shared/game/engine/artiad/parser.ts_

- [ ] 7.1.1 创建 `src/shared/game/engine/artiad/parser.ts`，实现 `Parser` 类
  - 实现 `ParsedAction` 接口（type, sender, receiver, args, raw）
  - 实现 `Parser.parse(input)` 解析动作字符串
  - 实现 `Parser.parseToMessage(input)` 解析为 GMessage
  - 实现 `Parser.validate(input)` 验证动作格式
  - 实现 `Parser.extractArgs(input)` 提取动作参数
  - 实现 `Parser.extractType(input)` 提取动作类型
  - 实现 `Parser.extractSender(input)` 提取发送者
  - 实现 `Parser.extractReceiver(input)` 提取接收者
  - Done: Parser 类可编译，所有方法签名与设计一致

### 7.2 实现 Executor 类
_Boundary: src/shared/game/engine/artiad/executor.ts_

- [ ] 7.2.1 创建 `src/shared/game/engine/artiad/executor.ts`，实现 `Executor` 类
  - 实现 `ExecutionContext` 接口（message, board, sender, receiver, args）
  - 实现 `ExecutionResult` 接口（success, error, data）
  - 实现 `Executor` 构造函数（eventBus, board）
  - 实现 `execute(message)` 执行动作
  - 实现 `buildContext(message)` 构建执行上下文
  - 实现 `preExecute(context)` 执行前检查
  - 实现 `postExecute(context, result)` 执行后处理
  - Done: Executor 类可编译，所有方法签名与设计一致

### 7.3 创建 Artiad 模块导出
_Boundary: src/shared/game/engine/artiad/index.ts_

- [ ] 7.3.1 创建 `src/shared/game/engine/artiad/index.ts`，导出 Artiad 模块
  - 导出 Parser 类
  - 导出 Executor 类
  - 导出接口类型
  - Done: Artiad 模块导出正确

### 7.4 Artiad 动作解析器单元测试

- [ ] 7.4.1 编写 Parser 单元测试
  - 创建 `src/shared/game/engine/artiad/__tests__/parser.test.ts`
  - 测试 Parser.parse 动作解析
  - 测试 Parser.parseToMessage 消息转换
  - 测试 Parser.validate 动作验证
  - 测试 Parser.extract* 参数提取
  - Done: 所有 Parser 测试通过

- [ ] 7.4.2 编写 Executor 单元测试
  - 创建 `src/shared/game/engine/artiad/__tests__/executor.test.ts`
  - 测试 Executor.execute 动作执行
  - 测试 Executor.buildContext 上下文构建
  - 测试 Executor.preExecute 前置检查
  - 测试 Executor.postExecute 后置处理
  - Done: 所有 Executor 测试通过

---

## 8. 引擎模块导出

### 8.1 创建引擎模块导出
_Boundary: src/shared/game/engine/index.ts_

- [ ] 8.1.1 创建 `src/shared/game/engine/index.ts`，导出所有引擎组件
  - 导出 EventBus 类
  - 导出 SkillRegistry 类
  - 导出 GMessage 类型和 SimpleGMessage、InnerGMessage 类
  - 导出 GLoop 类
  - 导出 RoundManager 类
  - 导出 XI 类
  - 导出 SelectHero 类
  - 导出 Artiad 模块
  - Done: 引擎模块导出正确

---

## 9. 集成测试

### 9.1 编写集成测试

- [ ] 9.1.1 编写事件系统集成测试
  - 创建 `src/shared/game/engine/__tests__/integration.test.ts`
  - 测试 EventBus + SkillRegistry 集成
  - 测试 EventBus + GLoop 集成
  - 测试 EventBus + RoundManager 集成
  - Done: 事件系统集成测试通过

- [ ] 9.1.2 编写游戏流程集成测试
  - 测试 XI + SelectHero + RoundManager 集成
  - 测试完整游戏初始化流程
  - 测试完整回合流程
  - Done: 游戏流程集成测试通过

---

## 10. 模块集成和验证

### 10.1 模块集成

- [ ] 10.1.1 验证所有模块可编译
  - 运行 TypeScript 编译器检查所有文件
  - 修复任何类型错误
  - Done: 所有模块编译通过，无类型错误

- [ ] 10.1.2 验证与上游依赖兼容
  - 验证与 core-models 模块的接口兼容性
  - 验证 Board、Player、Skill 等类型的正确使用
  - Done: 与上游依赖兼容

- [ ] 10.1.3 验证下游接口准备就绪
  - 验证 EventBus 接口可供 card-effects 使用
  - 验证 RoundManager 接口可供 game-flow 使用
  - Done: 下游接口准备就绪

---

## 11. 文档和清理

### 11.1 更新模块文档

- [ ] 11.1.1 更新 `src/shared/game/engine/README.md`（如需要）
  - 记录模块架构和组件职责
  - 记录公共 API 接口
  - 记录使用示例
  - Done: 文档更新完成

---

## 12. 最终验证

### 12.1 完成前验证

- [ ] 12.1.1 运行所有单元测试
  - 运行所有 `__tests__/` 目录下的测试
  - 确保所有测试通过
  - Done: 所有单元测试通过

- [ ] 12.1.2 运行所有集成测试
  - 运行集成测试
  - 确保所有测试通过
  - Done: 所有集成测试通过

- [ ] 12.1.3 验证代码覆盖率
  - 检查测试覆盖率
  - 确保关键路径覆盖
  - Done: 代码覆盖率达标

---

## 任务依赖关系

```
1.1 EventBus ──┐
1.2 GMessage ──┤
               ├── 2.1 SkillRegistry
               │        │
               │        ├── 3.1 GLoop
               │        │        │
               │        │        ├── 4.1 RoundManager
               │        │        │        │
               │        │        │        ├── 5.1 XI
               │        │        │        │        │
               │        │        │        │        ├── 6.1 SelectHero
               │        │        │        │        │
               │        │        │        │        ├── 7.1 Parser
               │        │        │        │        ├── 7.2 Executor
               │        │        │        │
               │        │        │        └── 8.1 模块导出
               │        │        │
               │        │        └── 9.1 集成测试
               │        │
               │        └── 2.2 Occur 匹配
               │
               └── 1.3 单元测试
```

## 并行任务标记

以下任务满足并行条件，可同时执行：

- **(P)** 1.1 EventBus + 1.2 GMessage（无依赖，可并行）
- **(P)** 2.2 Occur 匹配（依赖 2.1，但可与 1.3 并行）
- **(P)** 7.1 Parser + 7.2 Executor（无依赖，可并行）
- **(P)** 1.3 + 2.3 + 3.2 + 4.2（单元测试可并行）
