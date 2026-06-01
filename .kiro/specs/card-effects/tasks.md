# Implementation Plan

## Task 1: Foundation - 效果框架基础

- [ ] 1.1 创建效果接口定义和委托类型
  - 定义 ActionDelegate、ValidDelegate、InputDelegate 等委托类型
  - 定义装备消耗相关的 CsActionDelegate、CsValidDelegate 等类型
  - 定义 EffectRegistration 接口，包含所有可能的委托属性
  - 验证类型定义与 core-models 中的委托签名一致
  - _Requirements: 1.1, 1.3_

- [ ] 1.2 实现效果注册表
  - 创建 CardEffectRegistry 类，支持按编码注册和获取效果
  - 实现 register、registerAll、get、has、clear 等方法
  - 实现 getCodes 方法返回所有已注册的效果编码
  - 编写注册表的单元测试（注册、获取、清空、重复注册）
  - _Requirements: 1.2, 1.4_

- [ ] 1.3 实现 JNSBase 工具类
  - 翻译 Harm 方法（单体和群体伤害，包含 FiveElement 和 mask 参数）
  - 翻译 Cure 方法（单体和群体治疗，包含 FiveElement 和 mask 参数）
  - 翻译 TargetPlayer 方法（单体和群体目标标记，发送 G2YS 消息）
  - 翻译 FormatPlayers、AOthers、ATeammates、AEnemy 等玩家查询方法
  - 翻译 IsMathISOS、Equal 等辅助方法
  - 编写工具方法的单元测试
  - _Requirements: 1.5_

## Task 2: Core - 手牌效果翻译 (P)

- [ ] 2.1 翻译 JP 系列手牌效果
  - 翻译 JP01（偷盗）的 Action/Valid/Input 委托
  - 翻译 JP02（窥测天机）的 Action/Valid 委托
  - 翻译 JP03（五气朝元）的 Action 委托
  - 翻译 JP04（鼠儿果）的 Action 委托
  - 翻译 JP05（天雷破）的 Action 委托
  - 翻译 JP06（铜钱镖）的 Action/Valid 委托
  - 编写 JP 系列效果的单元测试（有效和无效场景）
  - _Requirements: 2.1, 2.2, 9.1, 9.2_
  - _Boundary: TuxCottage_

- [ ] 2.2 翻译 TP 系列手牌效果
  - 翻译 TP01（冰心诀）的 Action/Valid 委托
  - 翻译 TP02（灵葫仙丹）的 Action/Valid/Bribe/Locust 委托
  - 翻译 TP03（隐蛊）的 Action/Valid/Locust 委托
  - 翻译 TP04 的 Action/Valid 委托
  - 编写 TP 系列效果的单元测试
  - _Requirements: 2.3, 2.4, 2.5, 9.1, 9.2_
  - _Boundary: TuxCottage_

- [ ] 2.3 翻译 WQ/FJ/ZP 系列装备效果
  - 翻译 WQ02 的 ConsumeValid/ConsumeAction 委托
  - 翻译 FJ01-FJ05 的 ConsumeValid/ConsumeAction 委托
  - 翻译 FJ02 的 ConsumeValidHolder/ConsumeActionHolder/ConsumeInputHolder 委托
  - 翻译 ZP01-ZP04 的 Valid/Action 委托
  - 编写装备效果的单元测试
  - _Requirements: 2.7, 6.1, 6.2, 6.3, 9.1, 9.2_
  - _Boundary: TuxCottage_

- [ ] 2.4 翻译 Package of 4/5 扩展包效果
  - 翻译 JPT1（驯化）的 Action/Valid 委托
  - 翻译 JPT2 的 Action 委托
  - 翻译 ZPT1、TPT1、TPT2 等扩展包效果
  - 翻译 FJT1、FJT2 的 ConsumeValid/ConsumeAction/UseAction/InsAction 委托
  - 翻译 WQT1、WQT2 的 ConsumeValid/ConsumeAction 委托
  - 翻译 FJT1、FJT2 的 ConsumeValid/ConsumeAction/ConsumeInput 委托
  - 编写扩展包效果的单元测试
  - _Requirements: 2.7, 2.8, 6.4, 6.5, 9.1, 9.2_
  - _Boundary: TuxCottage_

- [ ] 2.5 翻译 XBT 系列行囊效果
  - 翻译 XBT1 的 InsAction/DelAction/ConsumeValid/ConsumeAction 委托
  - 翻译 XBT2 的 InsAction/DelAction/ConsumeValid/ConsumeAction/ConsumeInput 委托
  - 翻译 XBT3 的 InsAction/DelAction 委托
  - 编写行囊效果的单元测试
  - _Requirements: 2.7, 6.1, 6.2, 6.3, 9.1, 9.2_
  - _Boundary: TuxCottage_

## Task 3: Core - 操作效果翻译 (P)

- [ ] 3.1 翻译 CZ01 购买效果
  - 翻译 CZ01Action 的价格计算和灵力扣除逻辑
  - 翻译 CZ01Input 的可购买卡牌列表生成
  - 翻译 CZ01Valid 的有效性检查
  - 编写 CZ01 效果的单元测试（有手牌/有装备/无灵力场景）
  - _Requirements: 3.1, 9.1, 9.2_
  - _Boundary: OperationCottage_

- [ ] 3.2 翻译 CZ02-CZ05 操作效果
  - 翻译 CZ02Action（混战）的怪物翻开逻辑
  - 翻译 CZ02Valid 的有效性检查
  - 翻译 CZ03Action（NPC 救援）的救援逻辑
  - 翻译 CZ03Input/CZ03Valid 委托
  - 翻译 CZ04Action（幻化）的装备转换逻辑
  - 翻译 CZ04Input/CZ04Valid 委托
  - 翻译 CZ05Action（装备操作）的伪装备逻辑
  - 翻译 CZ05Input/CZ05Valid 委托
  - 编写 CZ02-CZ05 效果的单元测试
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 9.1, 9.2_
  - _Boundary: OperationCottage_

## Task 4: Core - 角色技能效果翻译 (P)

- [ ] 4.1 翻译 HL014.cs 中的技能效果（颜风系列）
  - 翻译 JNH0101-JNH01XX 的 Action/Valid 委托
  - 翻译 HL014.cs 中所有 #region 标记的技能效果
  - 编写 HL 系列技能效果的单元测试
  - _Requirements: 4.1, 4.2, 4.3, 9.1, 9.2_
  - _Boundary: SkillCottage_

- [ ] 4.2 翻译 TR007.cs 中的技能效果（素羽系列）
  - 翻译 JNT0101-JNT01XX 的 Action/Valid 委托
  - 翻译 TR007.cs 中所有 #region 标记的技能效果
  - 编写 TR 系列技能效果的单元测试
  - _Requirements: 4.1, 4.2, 4.3, 9.1, 9.2_
  - _Boundary: SkillCottage_

- [ ] 4.3 翻译 XJ405.cs 中的技能效果和注册逻辑
  - 翻译 SkillCottage 的构造函数和 RegisterDelegates 方法
  - 翻译 XJ405.cs 中的技能效果（JNX 系列）
  - 实现技能效果的反射替代逻辑（显式注册）
  - 编写 XJ 系列技能效果的单元测试
  - _Requirements: 4.1, 4.4, 4.5, 9.1, 9.2_
  - _Boundary: SkillCottage_

## Task 5: Core - 怪物效果翻译 (P)

- [ ] 5.1 翻译 FG04.cs 中的怪物效果
  - 翻译 MonsterCottage 的构造函数和 RegisterDelegates 方法
  - 翻译 FG04.cs 中所有怪物的登场效果（Debut）
  - 翻译怪物的战斗效果（eaOccurs、eaProperties）
  - 编写怪物效果的单元测试
  - _Requirements: 4.1, 9.1, 9.2_
  - _Boundary: MonsterCottage_

## Task 6: Core - 事件/NPC/符文效果翻译 (P)

- [ ] 6.1 翻译 SJ101.cs 中的事件效果
  - 翻译 EveCottage 的构造函数和 RegisterDelegates 方法
  - 翻译 SJ101.cs 中所有事件的效果
  - 编写事件效果的单元测试
  - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2_
  - _Boundary: EveCottage_

- [ ] 6.2 翻译 NC303.cs 中的 NPC 效果
  - 翻译 NPCCottage 的构造函数和 RegisterDelegates 方法
  - 翻译 NC303.cs 中所有 NPC 的效果
  - 编写 NPC 效果的单元测试
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.2_
  - _Boundary: NPCCottage_

- [ ] 6.3 翻译 SF09.cs 中的符文效果
  - 翻译 RuneCottage 的构造函数和 RegisterDelegates 方法
  - 翻译 SF09.cs 中所有符文的效果
  - 编写符文效果的单元测试
  - _Requirements: 7.1, 7.2, 7.3, 9.1, 9.2_
  - _Boundary: RuneCottage_

## Task 7: Integration - 模块集成和导出

- [ ] 7.1 创建模块导出和集成测试
  - 创建 effects/index.ts 导出所有组件
  - 编写集成测试，验证所有 Cottage 可被正确注册
  - 验证效果注册表可索引所有已注册的效果
  - 验证 AI 玩家可触发所有效果
  - _Requirements: 1.1, 1.2, 10.1_

## Task 8: Validation - 测试覆盖完善

- [ ] 8.1 补充和完善单元测试
  - 检查所有 Requirement 的测试覆盖
  - 补充缺失的边界测试场景
  - 验证所有效果的 Valid 委托在有效/无效场景下返回正确值
  - 验证所有效果的 Input 委托在各种输入下返回正确格式
  - 运行完整测试套件，确保全部通过
  - _Requirements: 10.2, 10.3, 10.4, 10.5_
