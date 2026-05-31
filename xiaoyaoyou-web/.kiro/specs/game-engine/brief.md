# Brief: game-engine

## Problem
将 PSDGamepkg 的核心引擎（XI.cs、XIG.cs、XIR.cs，共 8,000+ 行）翻译为 TypeScript，实现事件驱动的 G-Loop 系统和回合状态机。

## Current State
- 核心数据模型已就绪（core-models 完成）
- 无事件系统和回合管理
- 参考源码：XI.cs（2,165 行）、XIG.cs（3,125 行）、XIR.cs（1,130 行）

## Desired Outcome
- G-Loop 事件系统可独立运行
- 回合状态机可执行完整回合流程
- 技能注册表（sk02）可正确构建
- 选将系统（SelectHero）可执行

## Approach
1. 事件总线：实现 sk02 注册表和事件分发
2. G-Loop：翻译 InnerGMessage、SimpleGMessage、SimpleGMessage100
3. 回合状态机：翻译 RunRound 的所有阶段
4. 游戏初始化：翻译 XI.Run()、MappingSksp()
5. 选将系统：翻译 SelectHero 和 Casting 集成

## Scope
- **In**: XIG.cs、XIR.cs、XI.cs 的翻译，Artiad 模块（动作解析器）
- **Out**: 具体卡牌效果（JNS/）、网络层、UI

## Boundary Candidates
- src/shared/game/engine/event-bus.ts — 事件总线
- src/shared/game/engine/g-loop.ts — G-Loop 核心
- src/shared/game/engine/round.ts — 回合状态机
- src/shared/game/engine/xi.ts — 游戏初始化
- src/shared/game/engine/artiad/ — 动作解析器

## Out of Boundary
- 卡牌效果实现（card-effects）
- 网络通信（network-server）

## Upstream / Downstream
- **Upstream**: core-models（依赖 Board、Player、Skill 等）
- **Downstream**: card-effects（依赖事件系统注册效果）、game-flow（依赖回合管理）

## Existing Spec Touchpoints
- **依赖**: core-models

## Constraints
- 保持原版字符串命令协议
- 线程管理改用 async/await + 状态机
- 优先级解析逻辑必须与原版一致
