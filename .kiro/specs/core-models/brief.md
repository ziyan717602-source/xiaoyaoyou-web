# Brief: core-models

## Problem
将 PSDBase 模块（5,429 行 C#）翻译为 TypeScript，包括 Board、Player、Card 系统、Skill 系统、规则系统等核心数据模型。

## Current State
- 类型定义和 JSON 数据已就绪（data-layer 完成）
- 无游戏逻辑代码
- 参考源码：PSDBase/ 下 30 个 C# 文件

## Desired Outcome
- 所有核心数据模型翻译为 TypeScript class
- Diva（动态 KV 存储）、Rueue（双端队列）等工具类实现
- 每个模型有对应的单元测试

## Approach
按 C# 源文件逐个翻译：
1. 工具类：Rueue、Diva、PriorityQueue、UFSet、Algo
2. 卡牌类型：Card、Tux、TuxEquip、Luggage、Illusion、Monster、Hero、Npc、Evenement、Rune
3. 玩家和游戏板：Player、Board
4. 技能系统：Skill、Bless、SKBranch
5. 规则系统：Casting、RuleCode
6. 其他：NCAction、Operation、LibGroup

## Scope
- **In**: PSDBase/ 下所有 C# 文件的翻译
- **Out**: 游戏引擎逻辑（XIG/XIR/XI）、卡牌效果（JNS/）

## Boundary Candidates
- src/shared/game/card/ — 卡牌类型
- src/shared/game/ — Player、Board、Skill
- src/shared/game/rules/ — Casting、RuleCode
- src/shared/game/utils/ — 工具类

## Out of Boundary
- 事件系统和回合管理（game-engine）
- 卡牌效果实现（card-effects）

## Upstream / Downstream
- **Upstream**: data-layer（类型定义和数据）
- **Downstream**: game-engine（依赖核心模型）

## Existing Spec Touchpoints
- **依赖**: data-layer

## Constraints
- 翻译规则见 docs/translation-rules.md
- 委托系统使用数组模式替代 C# delegate
- 位掩码操作直接移植
