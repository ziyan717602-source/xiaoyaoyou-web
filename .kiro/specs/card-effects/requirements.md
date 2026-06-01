# Requirements Document

## Introduction

本模块将 C# WPF 版逍遥游的 JNS/ 目录卡牌效果实现（22,422 行）翻译为 TypeScript。原版通过反射（`GetType().GetMethod(code+"Action")`）注册效果，TS 版使用显式注册表。效果涵盖手牌效果、角色技能、NPC 效果、装备消耗效果、符文效果和事件效果，服务于 game-engine 的事件总线系统和下游 game-flow 模块。

## Requirements

### Requirement 1: 效果框架基础

**Objective:** 作为游戏引擎，需要一套标准化的卡牌效果接口和注册机制，以便统一管理和触发所有卡牌效果。

#### Acceptance Criteria

1. When 卡牌效果被注册时，卡牌效果系统 shall 将效果的 Action、Valid、Input 委托绑定到对应的卡牌或技能对象上。
2. When 事件总线触发卡牌效果消息时，卡牌效果系统 shall 根据消息类型查找并执行匹配的效果处理器。
3. Where 效果注册表被构建时，卡牌效果系统 shall 支持按卡牌编码（如 JP06、CZ02）索引效果处理器。
4. When 效果注册表被清空时，卡牌效果系统 shall 移除所有已注册的效果处理器。
5. The 卡牌效果系统 shall 提供 JNSBase 工具类，包含 Harm（造成伤害）、Cure（治疗）、TargetPlayer（目标标记）等通用效果工具方法。

### Requirement 2: 手牌效果翻译

**Objective:** 作为游戏玩家，使用手牌时需要触发对应的效果逻辑，包括技牌（JP）、特牌（TP）、武器牌（WQ）、防具牌（FJ）和战牌（ZP）。

#### Acceptance Criteria

1. When 玩家使用「铜钱镖」（JP06）时，卡牌效果系统 shall 允许玩家选择一名有手牌的目标并弃置其一张手牌。
2. If 目标玩家没有手牌且使用者也没有手牌或装备时，卡牌效果系统 shall 判定「铜钱镖」效果无效。
3. When 玩家使用「冰心诀」（TP01）时，卡牌效果系统 shall 取消当前卡牌的使用效果并触发后续处理。
4. When 玩家使用「灵葫仙丹」（TP02）时，卡牌效果系统 shall 允许治疗自身 2 点 HP 或复活一名 HP 为 0 的目标。
5. When 玩家使用「隐蛊」（TP03）时，卡牌效果系统 shall 移除自身受到的所有非免疫伤害。
6. When 玩家使用战牌（ZP 系列）时，卡牌效果系统 shall 在战斗阶段生效并提供对应的战斗加成。
7. When 玩家使用装备牌时，卡牌效果系统 shall 处理装备的消耗（Consume）、增减属性（Incr/Decr）、插入（Ins）和删除（Del）动作。
8. When 玩家使用带有 InputHolder 委托的卡牌时，卡牌效果系统 shall 支持由卡牌持有者而非使用者提供输入。

### Requirement 3: 操作效果翻译

**Objective:** 作为游戏玩家，在特定游戏阶段（如购买、召唤、幻化）时需要触发操作效果。

#### Acceptance Criteria

1. When 玩家执行「购买」（CZ01）操作时，卡牌效果系统 shall 计算卡牌价格并扣除对应灵力。
2. When 玩家执行「混战」（CZ02）操作时，卡牌效果系统 shall 从怪物牌堆翻开一张怪物并触发战斗。
3. If 战斗已纠缠（FightTangled）或怪物牌堆为空时，卡牌效果系统 shall 判定「混战」操作无效。
4. When 玩家执行「幻化」（CZ04）操作时，卡牌效果系统 shall 将幻化装备转换为目标装备并处理装备槽位限制。
5. When 玩家执行「装备操作」（CZ05）操作时，卡牌效果系统 shall 处理伪装备（Fakeq）的特殊效果。

### Requirement 4: 角色技能效果翻译

**Objective:** 作为游戏玩家，角色的技能需要在满足触发条件时自动执行对应效果。

#### Acceptance Criteria

1. When 角色技能的 occurs 字符串匹配当前事件消息时，卡牌效果系统 shall 按优先级顺序执行技能效果。
2. When 角色技能标记为 isOnce 时，卡牌效果系统 shall 仅在首次触发时执行效果，后续触发跳过。
3. When 角色技能标记为 isTermini 时，卡牌效果系统 shall 阻止后续同优先级效果的执行。
4. When 角色技能标记为 isHind 时，卡牌效果系统 shall 在效果执行后进行额外处理。
5. When 技能的 lock 标志为 true 时，卡牌效果系统 shall 阻止其他技能在同优先级上执行。

### Requirement 5: NPC 效果翻译

**Objective:** 作为游戏玩家，NPC 效果需要在与 NPC 交互时触发。

#### Acceptance Criteria

1. When NPC 的 debut 效果被触发时，卡牌效果系统 shall 执行 NPC 的登场效果逻辑。
2. When NPC 的 escue 效果被触发时，卡牌效果系统 shall 处理 NPC 的救援效果。
3. When NPC 效果包含多个执行阶段时，卡牌效果系统 shall 按正确的阶段顺序执行。
4. Where NPC 效果涉及玩家选择时，卡牌效果系统 shall 通过 AsyncInput 提供选择界面。

### Requirement 6: 装备消耗效果翻译

**Objective:** 作为游戏玩家，装备的消耗（Consume）效果需要在满足条件时触发。

#### Acceptance Criteria

1. When 装备的 ConsumeValid 返回 true 时，卡牌效果系统 shall 允许执行消耗效果。
2. When 装备消耗类型为 0 时，卡牌效果系统 shall 执行被动消耗效果（如受到伤害时触发）。
3. When 装备消耗类型为 1 时，卡牌效果系统 shall 执行主动消耗效果（如玩家主动触发）。
4. When 装备消耗效果包含 Input 委托时，卡牌效果系统 shall 在执行前收集玩家输入。
5. When 装备消耗效果包含 Holder 委托时，卡牌效果系统 shall 区分装备持有者和使用者。

### Requirement 7: 符文效果翻译

**Objective:** 作为游戏玩家，符文效果需要在装备时触发对应效果。

#### Acceptance Criteria

1. When 符文装备到玩家身上时，卡牌效果系统 shall 执行符文的装备效果。
2. When 符文被移除时，卡牌效果系统 shall 执行符文的卸载效果。
3. When 符文的 Locust 效果被触发时，卡牌效果系统 shall 处理符文的寄生效果。

### Requirement 8: 事件效果翻译

**Objective:** 作为游戏玩家，事件卡牌效果需要在翻开事件时触发。

#### Acceptance Criteria

1. When 事件卡牌被翻开时，卡牌效果系统 shall 执行事件的 Action 效果。
2. When 事件效果涉及玩家选择时，卡牌效果系统 shall 通过 AsyncInput 提供选择界面。
3. When 事件效果包含多个执行分支时，卡牌效果系统 shall 根据游戏状态选择正确的分支执行。

### Requirement 9: 翻译一致性

**Objective:** 作为开发团队，翻译后的效果必须与原版 C# 行为完全一致。

#### Acceptance Criteria

1. When 翻译每个效果文件时，卡牌效果系统 shall 保持与原版相同的 Action/Valid/Input 委托签名。
2. When 翻译效果逻辑时，卡牌效果系统 shall 保持与原版相同的消息格式（G0OH、G0DH、G0QZ 等）。
3. When 翻译效果逻辑时，卡牌效果系统 shall 保持与原版相同的 Artiad 消息解析和构造方式。
4. When 翻译效果逻辑时，卡牌效果系统 shall 保持与原版相同的 HPEvoMask 位掩码操作。
5. When 翻译效果逻辑时，卡牌效果系统 shall 保持与原版相同的玩家查询条件（IsTared、IsAlive、Team 等）。

### Requirement 10: 测试覆盖

**Objective:** 作为开发团队，每个翻译的效果需要有对应的单元测试验证正确性。

#### Acceptance Criteria

1. When 效果框架被实现时，卡牌效果系统 shall 提供效果注册表的单元测试。
2. When 每个效果被翻译时，卡牌效果系统 shall 提供对应的 Action、Valid、Input 委托的单元测试。
3. When 效果涉及条件判断时，卡牌效果系统 shall 测试有效和无效两种场景。
4. When 效果涉及玩家输入时，卡牌效果系统 shall 使用 mock 输入进行测试。
5. When AI 玩家触发效果时，卡牌效果系统 shall 确保所有效果可被 AI 玩家调用。

### Scope Boundary

**包含（In）**:
- 范围内所有卡牌效果的 Action/Valid/Input 委托翻译
- 效果注册表（替代反射机制）
- JNSBase 工具类翻译
- 每个效果的单元测试
- AI 玩家可触发所有效果

**不包含（Out）**:
- 效果的 UI 交互（客户端处理）
- 网络通信
- 游戏流程集成（属于 game-flow 模块）
