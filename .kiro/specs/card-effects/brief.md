# Brief: card-effects

## Problem
翻译 JNS/ 目录下的卡牌效果实现（22,422 行 C#），包括范围内所有角色技能、手牌效果、NPC 效果、事件效果等。

## Current State
- 事件系统已就绪（game-engine 完成）
- 卡牌效果代码在 JNS/ 目录，通过反射注册
- 需要翻译的效果文件：JP06.cs、CZ02.cs、HL014.cs、TR007.cs、FG04.cs、XJ405.cs、SJ101.cs、NC303.cs、SF09.cs

## Desired Outcome
- 所有范围内卡牌效果翻译为 TypeScript
- 效果注册表完整
- 每个效果有对应单元测试
- AI 玩家可触发所有效果

## Approach
1. 建立效果框架：CardEffect 接口 + 注册表
2. 翻译手牌效果：JP06（技牌）、CZ02（操作）
3. 翻译角色技能：按 JNS 文件逐个翻译
4. 翻译其他效果：NC303（NPC）、SF09（符文）
5. 翻译事件/魔主/危机效果

## Scope
- **In**: 范围内所有卡牌效果的 Action/Valid/Input 委托
- **Out**: 效果的 UI 交互（客户端处理）

## Boundary Candidates
- src/shared/game/effects/types.ts — 效果接口
- src/shared/game/effects/registry.ts — 效果注册表
- src/shared/game/effects/base.ts — 通用效果工具
- src/shared/game/effects/ — 各卡牌效果实现

## Out of Boundary
- UI 交互（客户端处理用户输入）
- 网络通信

## Upstream / Downstream
- **Upstream**: core-models（卡牌数据）、game-engine（事件系统）
- **Downstream**: game-flow（集成所有效果）

## Existing Spec Touchpoints
- **依赖**: core-models, game-engine

## Constraints
- 效果必须与原版行为一致
- 使用显式注册表替代反射
- 翻译规则见 docs/translation-rules.md
