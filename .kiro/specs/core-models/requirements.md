# Requirements: core-models

## 项目描述

将 PSDBase 模块（C# WPF 桌面版，约 5,429 行代码）翻译为 TypeScript，实现所有核心数据模型。当前状态：类型定义和 JSON 数据已就绪（data-layer 完成），无游戏逻辑代码。目标：所有核心数据模型翻译为 TypeScript class，包含 Diva（动态 KV 存储）、Rueue（双端队列）等工具类，每个模型有对应的单元测试。

## 需求

### 1. 工具类翻译

#### 1.1 Rueue（双端队列）

- 系统必须实现 `Rueue<T>` 泛型类，支持双端队列操作
- 系统必须支持 `Enqueue`（尾部入队）、`PushBack`（头部入队）、`Dequeue`（头部出队）操作
- 系统必须支持 `Dequeue(count)` 批量出队操作
- 系统必须支持 `Watch`（查看头部元素）、`Watch(count)` 批量查看操作
- 系统必须支持 `Remove`（移除指定元素）、`Intersect`（交集）操作
- 系统必须支持 `Shuffle`（随机打乱）操作
- 系统必须支持 `Count` 属性和 `IEnumerable` 迭代

#### 1.2 Diva（动态 KV 存储）

- 系统必须实现 `Diva` 类，作为动态键值存储容器
- 系统必须支持 `Set(key, value)` 设置键值对，value 为 null 时删除键
- 系统必须支持类型安全的 getter 方法：`GetInt`、`GetString`、`GetBool`、`GetUshort`、`GetDiva`、`GetObject`
- 系统必须支持数组类型 getter 方法：`GetUshortArray`、`GetIntArray`、`GetStringArray`、`GetBoolArray`、`GetDivaArray`
- 系统必须支持 `GetOrSetArray`、`GetOrSetDiva` 懒加载方法
- 系统必须支持 `GetKeys`、`Clear`、`ToString` 方法
- 系统必须支持使用键值对数组初始化：`new Diva("key1", value1, "key2", value2)`

#### 1.3 PriorityQueue（优先队列）

- 系统必须实现 `PriorityQueue<T>` 泛型类，支持优先级排序
- 系统必须支持 `Enqueue`（入队，按优先级排序）、`Dequeue`（出队，最高优先级优先）
- 系统必须支持 `Peek`（查看最高优先级元素）、`Count` 属性

#### 1.4 UFSet（并查集）

- 系统必须实现 `UFSet<T>` 泛型类，支持并查集操作
- 系统必须支持 `Find`（查找根节点）、`Union`（合并两个集合）、`Contains`（判断元素是否在集合中）
- 系统必须支持 `GetAll`（获取集合中所有元素）

#### 1.5 Algo（算法工具）

- 系统必须实现静态 `Algo` 工具类，提供通用算法
- 系统必须支持 `Shuffle<T>`（随机打乱列表）
- 系统必须支持 `PickSomeInRandomOrder<T>`（随机选取指定数量元素）
- 系统必须支持 `Include`（检查元素是否在选项列表中）
- 系统必须支持 `Substring`（安全截取字符串）
- 系统必须支持 `Splits`（按分隔符拆分字符串，移除空项）
- 系统必须支持 `CountItemFromComma`（计算逗号分隔项数）
- 系统必须支持 `AddToMultiMap`、`AddToUniqueMultiMap`（多值映射操作）
- 系统必须支持 `PlusToMap`（计数器累加）
- 系统必须支持 `TakeRange`（数组切片）
- 系统必须支持 `TakeArrayWithSize`（从字符串数组中解析带大小前缀的 ushort 数组）
- 系统必须支持 `RepeatString`、`RepeatToArray`（重复操作）
- 系统必须支持 `ListToString`（集合序列化为逗号分隔字符串）
- 系统必须支持 `RemoveFromMultiMap`（从多值映射中移除元素）
- 系统必须支持 `IsSubSet`（判断子集关系）
- 系统必须支持 `LongMessageParse`（解析长消息格式的序列化数据）

### 2. 卡牌类型翻译

#### 2.1 Card 静态类

- 系统必须实现 `Card` 静态类，提供卡牌相关通用方法
- 系统必须支持 `PickSomeInRandomOrder<T>`（随机选取）
- 系统必须支持 `PickSomeInGivenProbability<T>`（按概率选取）
- 系统必须支持 `Level2Pkg`（等级到卡包映射）

#### 2.2 Tux（手牌）

- 系统必须实现 `Tux` 类，表示手牌卡牌
- 系统必须包含属性：`Name`、`Code`、`Type`（TuxType 枚举）、`Genre`、`Package`、`Range`、`Description`、`Special`、`DBSerial`
- 系统必须包含属性：`Priorities`、`Occurs`、`Parasitism`、`Targets`、`IsTermini`
- 系统必须支持委托模式：`Action`、`Valid`、`Input`、`InputHolder`、`Bribe`、`Encrypt`、`Locust`、`Vestige`
- 系统必须支持 `IsTuxEqiup()`（判断是否为装备）、`IsLinked(inType)`（判断是否联动）
- 系统必须支持 `IsSameType(tux)`（判断同类型）

#### 2.3 TuxEquip（装备）

- 系统必须实现 `TuxEquip` 类，继承 `Tux`，表示装备卡牌
- 系统必须包含属性：`IncrOfSTR`、`IncrOfDEX`、`SingleEntry`、`RFM`
- 系统必须包含消费系统属性：`CsPriorites`、`CsOccur`、`CsLock`、`CsOnce`、`CsIsTermini`、`CsHind`
- 系统必须支持消费委托模式：`ConsumeAction`、`ConsumeValid`、`ConsumeInput`、`ConsumeActionHolder`、`ConsumeValidHolder`、`ConsumeInputHolder`、`UseAction`
- 系统必须支持装备增减委托：`IncrAction`、`DecrAction`、`InsAction`、`DelAction`
- 系统必须支持 `IsTuxEqiup()` 返回 true

#### 2.4 Luggage（行囊）

- 系统必须实现 `Luggage` 类，继承 `TuxEquip`，表示行囊装备
- 系统必须包含属性：`Capacities`（容量列表）、`Pull`（是否正在拉取）
- 系统必须支持 `IsLuggage()` 返回 true

#### 2.5 Illusion（幻化）

- 系统必须实现 `Illusion` 类，继承 `TuxEquip`，表示幻化装备
- 系统必须包含属性：`ILAS`（当前幻化目标）
- 系统必须支持 `IsIllusion()` 返回 true

#### 2.6 Monster（怪物）

- 系统必须实现 `Monster` 类，继承 `NMB` 接口，表示怪物卡牌
- 系统必须包含属性：`Name`、`Code`、`Group`、`Genre`、`Element`（五行）、`Level`（怪物等级）
- 系统必须包含属性：`STR`、`STRb`、`AGL`、`AGLb`、`DBSerial`
- 系统必须包含战斗效果属性：`EAOccurs`、`EAProperties`、`EALocks`、`EAOnces`、`EAIsTermini`、`EAHinds`
- 系统必须包含文本属性：`DebutText`、`PetText`、`WinText`、`LoseText`
- 系统必须包含状态属性：`ROM`、`RFM`、`RAM`（Diva 存储）、`TeamBursted`、`Seals`
- 系统必须包含 SPI 属性：`IsHarmInvolved`、`IsTuxInvolved`、`IsSilence`
- 系统必须支持委托模式：`Debut`、`Curtain`、`WinEff`、`LoseEff`、`IncrAction`、`DecrAction`、`ConsumeAction`、`ConsumeInput`、`ConsumeValid`
- 系统必须支持 `ParseSpi`（解析 SPI 字符串）
- 系统必须支持 `ResetRAM`、`ResetRFM`、`ResetROM`（重置内存存储）
- 系统必须支持 `IsLinked(consumeType, inType)`（判断是否联动）

#### 2.7 Hero（英雄）

- 系统必须实现 `Hero` 类，表示英雄卡牌
- 系统必须包含属性：`Name`、`Avatar`、`Group`、`Genre`、`Gender`、`HP`、`STR`、`DEX`
- 系统必须包含属性：`Skills`、`RelatedSkills`、`Spouses`、`Isomorphic`
- 系统必须包含属性：`Archetype`、`Antecessor`、`Pioneer`、`Ofcode`
- 系统必须包含别名属性：`TokenAlias`、`PeopleAlias`、`PlayerTarAlias`、`ExCardsAlias`、`AwakeAlias`、`FolderAlias`、`GuestAlias`
- 系统必须支持 `ForceChange`（强制修改属性，用于版本兼容）
- 系统必须支持 `SetAvailableParam`（设置可用性参数）

#### 2.8 NPC（NPC）

- 系统必须实现 `NPC` 类，继承 `NMB` 接口，表示 NPC 卡牌
- 系统必须包含属性：`Name`、`Code`、`Group`、`Gender`、`Genre`
- 系统必须包含属性：`STR`、`STRb`、`AGL`（固定为 0）
- 系统必须包含属性：`Skills`、`Hero`、`DebutText`
- 系统必须支持委托模式：`Debut`
- 系统必须支持 `ForceChange`（强制修改属性）

#### 2.9 Evenement（事件）

- 系统必须实现 `Evenement` 类，表示事件卡牌
- 系统必须包含属性：`Name`、`Code`、`Range`、`Background`、`Description`、`Group`、`Genre`
- 系统必须包含属性：`Occurs`、`Priorties`、`IsOnce`、`IsTermini`、`Lock`
- 系统必须支持 SPI 检测方法：`IsHarmInvolved`、`IsTuxInvolved`、`IsSilence`
- 系统必须支持委托模式：`Action`、`Pers`、`PersValid`

#### 2.10 Rune（符文）

- 系统必须实现 `Rune` 类，表示符文
- 系统必须包含属性：`Name`、`Code`、`Occur`、`Priority`、`IsLock`、`IsOnce`、`IsTermin`、`IsConsume`、`Description`
- 系统必须支持委托模式：`Input`、`Action`、`Valid`

#### 2.11 Exsp（扩展技能）

- 系统必须实现 `Exsp` 类，表示扩展技能
- 系统必须包含属性：`Name`、`Code`、`Type`、`Hero`、`Skills`、`Description`

#### 2.12 NMB 接口

- 系统必须实现 `NMB` 接口，作为 Monster 和 NPC 的公共接口
- 系统必须包含方法：`IsMonster()`、`IsNPC()`、`Name`、`Code`、`STR`、`AGL`
- 系统必须实现 `NMBLib` 静态类，提供 ID 编解码方法

#### 2.13 枚举类型

- 系统必须实现 `FiveElement` 枚举（AQUA, AGNI, THUNDER, AERO, SATURN, YINN, SOLARIS, A）
- 系统必须实现 `HPEvoMask` 枚举（位掩码，用于 HP 变化追踪）
- 系统必须实现 `TuxType` 枚举（HX, JP, ZP, TP, WQ, FJ, XB）
- 系统必须实现 `MonsterLevel` 枚举（WOODEN, WEAK, STRONG, BOSS）
- 系统必须实现 `Genre` 枚举（NIL, Tux, NMB, Eve, TuxSerial, Rune, Five, Exsp, Hero, NPC）
- 系统必须实现 `PileGenre` 枚举（Tux, NMB, Eve, UH, UM, UN）

### 3. 玩家和游戏板翻译

#### 3.1 Player（玩家）

- 系统必须实现 `Player` 类，表示游戏中的玩家
- 系统必须包含账户信息：`Name`、`Avatar`、`Uid`、`AUid`、`HopeTeam`
- 系统必须包含属性：`SelectHero`、`Team`、`IsReal`、`Gender`
- 系统必须包含战斗属性：`HP`、`HPb`、`STR`、`STRa`、`STRb`、`STRc`、`STRh`、`DEX`、`DEXa`、`DEXb`、`DEXc`、`DEXh`、`STRi`、`DEXi`、`TuxLimit`
- 系统必须包含卡牌槽位：`Tux`、`Armor`、`Weapon`、`Trove`、`ExEquip`、`ExCards`、`Fakeq`、`Pets`、`Escue`
- 系统必须包含状态属性：`IsAlive`、`Nineteen`、`IsTared`、`Immobilized`、`Loved`、`PetDisabled`、`RestZP`、`ExMask`、`FyMask`、`Runes`、`ExSpouses`
- 系统必须支持卡牌禁用系统：`SetWeaponDisabled`、`SetArmorDisabled`、`SetTroveDisabled`、`SetZPDisabled`、`SetJPDisabled`、`SetTPDisabled`、`SetXPDisabled`、`SetAllTuxDisabled`、`EquipDisabled`、`WeaponDisabled`、`ArmorDisabled`、`TroveDisabled`、`ZPDisabled`、`JPDisabled`、`TPDisabled`、`XPDisabled`
- 系统必须支持静默系统：`SetSilence`、`ResetSilence`、`IsSilenced`
- 系统必须包含记忆系统：`TokenAwake`、`TokenCount`、`TokenTars`、`TokenExcl`、`TokenFold`、`ROM`、`RFM`、`RAM`、`Coss`、`Guardian`
- 系统必须支持卡牌操作方法：`RemoveCard`、`HasAnyCards`、`HasAnyEquips`、`HasCard`、`HasCards`、`ListOutAllCards`、`ListOutAllEquips`、`ListOutAllBaseEquip`、`ListOutAllCardsWithEncrypt`、`GetBaseEquipCount`、`GetEquipCount`、`GetAllCardsCount`、`IsValidPlayer`
- 系统必须支持装备槽位计算：`GetSlotCapacity`、`GetCurrentEquipCount`
- 系统必须支持价格系统：`ClearPrice`、`AddToPrice`、`RemoveFromPrice`、`GetPrice`
- 系统必须支持重置方法：`ResetStatus`、`ResetRAM`、`ResetRFM`、`ResetTokens`、`ResetROM`
- 系统必须支持 `InitFromHero`（从英雄初始化）
- 系统必须支持 `GetOppTeam`（获取对方队伍编号）
- 系统必须支持静态工厂方法：`Warriors`（创建外部战士）
- 系统必须包含 `PlayerCompare` 内部类（用于字典键比较）

#### 3.2 Board（游戏板）

- 系统必须实现 `Board` 类，表示游戏板状态
- 系统必须包含玩家花园：`Garden`（玩家 ID 到 Player 的映射）
- 系统必须包含回合信息：`Rounder`、`RoundIN`
- 系统必须包含战斗信息：`Hinder`、`Supporter`、`Horn`、`SupportSucc`、`HinderSucc`、`PosHinders`、`PosSupporters`、`AllowNoSupport`、`AllowNoHinder`
- 系统必须包含战斗参与者：`RDrums`、`ODrums`
- 系统必须包含游戏状态：`ClockWised`、`InCampaign`、`PoolEnabled`、`PlayerPoolEnabled`、`IsMonsterDebut`
- 系统必须包含战斗池信息：`RPool`、`OPool`、`RPoolGain`、`OPoolGain`、`IsBattleWin`、`PoolDelta`
- 系统必须包含怪物信息：`Mon1Catchable`、`Mon2Catchable`、`Monster1`、`Monster2`、`Mon1From`、`Wang`、`Battler`、`Eve`、`UseCardRound`、`FightTangled`
- 系统必须包含骰子和区域信息：`DiceValue`、`PZone`、`CsPets`、`CsEqiups`
- 系统必须包含牌堆：`TuxPiles`、`EvePiles`、`MonPiles`、`TuxDises`、`EveDises`、`MonDises`
- 系统必须包含英雄牌堆：`HeroPiles`、`RestNPCPiles`、`RestMonPiles`、`HeroDises`、`RestNPCDises`、`RestMonDises`
- 系统必须包含禁止/保护列表：`BannedHero`、`ProtectedTux`、`PendingTux`、`PetProtecedPlayer`、`EscueBanned`、`Silence`
- 系统必须包含跳转表：`JumpTable`
- 系统必须包含最终分数：`FinalAkaScore`、`FinalAoScore`
- 系统必须支持玩家查找方法：`GetOpponenet`、`Opponent`、`Facer`、`IsAttendWar`、`IsAttendWarSucc`、`DrumUts`、`GetAllAttenders`
- 系统必须支持战斗计算方法：`CalculateRPool`、`CalculateOPool`、`IsRounderBattleWin`、`CleanBattler`
- 系统必须支持玩家排序方法：`OrderedPlayer`、`GetNextPlayer`、`GetPrevPlayer`、`ReOrderedPlayers`
- 系统必须支持序列化方法：`ToSerialMessage`、`GenerateSerialFieldMessage`、`GeneratePrivateMessage`

### 4. 技能系统翻译

#### 4.1 Skill（技能）

- 系统必须实现 `Skill` 类，表示技能
- 系统必须包含属性：`Name`、`Code`、`Occurs`、`Priorities`、`IsOnce`、`IsTermini`、`Lock`、`IsHind`、`IsChange`、`IsRestrict`、`Parasitism`、`Descripe`
- 系统必须支持委托模式：`Action`、`Valid`、`Input`、`Encrypt`
- 系统必须支持 `IsBK`（判断是否为祝福技能，默认 false）
- 系统必须支持 `IsLinked(inType)`（判断是否联动）
- 系统必须支持 `ForceChange`（强制修改属性）

#### 4.2 Bless（祝福技能）

- 系统必须实现 `Bless` 类，继承 `Skill`，表示祝福技能
- 系统必须支持 `IsBK` 返回 true
- 系统必须支持 `BKValid` 委托（带 owner 参数的验证委托）

#### 4.3 SKBranch（技能分支）

- 系统必须实现 `SKBranch` 类，表示技能触发分支
- 系统必须包含属性：`Occur`、`Priority`、`Once`、`Serial`、`Hind`、`Demiurgic`、`Lock`
- 系统必须支持 `MixCode` 属性（位掩码组合读写）
- 系统必须支持 `Linked` 属性（判断是否联动）
- 系统必须支持静态方法：`ParseFromStrings`（从三个字符串解析）、`ParseFromString`（从单个字符串解析）

### 5. 规则系统翻译

#### 5.1 Casting（选将系统）

- 系统必须实现抽象 `Casting` 类，作为选将基类
- 系统必须支持 `playerCapacity` 常量（值为 6）
- 系统必须实现 `CastingPick` 类（个人选将），支持 `Xuan`、`Huan`、`Ding` 字典
- 系统必须实现 `CastingTable` 类（公共选将），支持 `Xuan`、`BanAka`、`BanAo`、`Ding` 字典
- 系统必须实现 `CastingPublic` 类（公开选将），支持 `Xuan`、`DingAka`、`DingAo`、`BanAka`、`BanAo`、`Secrets` 列表
- 系统必须实现 `CastingCongress` 类（会议选将），支持 `XuanAka`、`XuanAo`、`Ding` 字典、`Secrets` 列表
- 每个 Casting 子类必须支持 `ToMessage`（序列化为消息）方法
- CastingPick 必须支持 `Init`、`Pick`、`Switch`、`SwitchAt`、`SwitchTo` 操作
- CastingTable 必须支持 `Pick`、`Ban`、`PutBack` 操作
- CastingPublic 必须支持 `Ban`、`Pick`、`PickReport` 操作
- CastingCongress 必须支持 `Init`、`Set`、`IsDecide` 操作

#### 5.2 RuleCode（规则代码）

- 系统必须实现 `RuleCode` 静态类，包含游戏规则常量
- 系统必须包含队伍选择常量：`HOPE_NO`、`HOPE_YES`、`HOPE_NOTCARE`、`HOPE_AKA`、`HOPE_AO`、`HOPE_IP`
- 系统必须包含模式选择常量：`MODE_00`、`MODE_CJ`、`MODE_31`、`MODE_RM`、`MODE_BP`、`MODE_RD`、`MODE_ZY`、`MODE_CP`、`MODE_IN`、`MODE_SS`、`MODE_NM`、`MODE_TC`、`MODE_CM`
- 系统必须包含包选择常量：`LEVEL_NEW`、`LEVEL_STD`、`LEVEL_RCM`、`LEVEL_ALL`、`LEVEL_IPV`
- 系统必须支持 `CastMode` 双向转换（字符串到整数、整数到字符串）

### 6. 其他系统翻译

#### 6.1 NCAction（NPC 行动）

- 系统必须实现 `NCAction` 类，表示 NPC 行动
- 系统必须包含属性：`Name`、`Code`、`Intro`、`Branches`（SKBranch 数组）
- 系统必须支持委托模式：`Action`、`Valid`、`Input`、`EscueAction`、`EscueValid`、`EscueInput`

#### 6.2 Operation（操作）

- 系统必须实现 `Operation` 类，表示游戏操作
- 系统必须包含属性：`Name`、`Code`、`Occur`、`IsOnce`
- 系统必须支持委托模式：`Action`、`Valid`、`Input`

#### 6.3 LibGroup（库组）

- 系统必须实现 `LibGroup` 类，作为所有库的聚合容器
- 系统必须包含属性：`HL`（HeroLib）、`TL`（TuxLib）、`NL`（NPCLib）、`ML`（MonsterLib）、`EL`（EvenementLib）、`SL`（SkillLib）、`ZL`（OperationLib）、`NJL`（NCActionLib）、`RL`（RuneLib）、`ESL`（ExspLib）

### 7. 数据库读取类翻译

#### 7.1 Lib 类（数据库库）

- 系统必须实现 `HeroLib` 类，从 JSON 数据加载 Hero 集合
- 系统必须实现 `TuxLib` 类，从 JSON 数据加载 Tux 集合
- 系统必须实现 `MonsterLib` 类，从 JSON 数据加载 Monster 集合
- 系统必须实现 `NPCLib` 类，从 JSON 数据加载 NPC 集合
- 系统必须实现 `EvenementLib` 类，从 JSON 数据加载 Evenement 集合
- 系统必须实现 `SkillLib` 类，从 JSON 数据加载 Skill 集合
- 系统必须实现 `OperationLib` 类，从 JSON 数据加载 Operation 集合
- 系统必须实现 `NCActionLib` 类，从 JSON 数据加载 NCAction 集合
- 系统必须实现 `RuneLib` 类，从 JSON 数据加载 Rune 集合
- 系统必须实现 `ExspLib` 类，从 JSON 数据加载 Exsp 集合
- 每个 Lib 类必须支持 `Decode`（通过 ID 查找）、`Encode`（通过 Code 查找）、`ListAllSeleable`（列出可选项）、`Size` 属性
- Lib 类必须从 `src/shared/data/*.json` 加载数据，而非从 SQLite 读取

### 8. 单元测试

- 系统必须为每个工具类（Rueue、Diva、PriorityQueue、UFSet、Algo）编写单元测试
- 系统必须为每个卡牌类型（Tux、TuxEquip、Luggage、Illusion、Monster、Hero、NPC、Evenement、Rune、Exsp）编写单元测试
- 系统必须为 Player 类编写单元测试，覆盖卡牌操作、状态管理、重置方法
- 系统必须为 Board 类编写单元测试，覆盖玩家查找、战斗计算、序列化
- 系统必须为 Skill、Bless、SKBranch 编写单元测试
- 系统必须为 Casting 子类编写单元测试
- 系统必须为 Lib 类编写单元测试，验证数据加载和查找功能

## 范围边界

### 包含范围
- src/shared/game/utils/ — 工具类（Rueue、Diva、PriorityQueue、UFSet、Algo）
- src/shared/game/card/ — 卡牌类型（Card、Tux、TuxEquip、Luggage、Illusion、Monster、Hero、NPC、Evenement、Rune、Exsp）
- src/shared/game/ — Player、Board
- src/shared/game/skill.ts — Skill、Bless、SKBranch
- src/shared/game/rules/ — Casting、RuleCode
- src/shared/game/nc-action.ts — NCAction
- src/shared/game/operation.ts — Operation
- src/shared/game/lib-group.ts — LibGroup
- src/shared/game/lib/ — 各 Lib 类

### 排除范围
- 事件系统和回合管理（game-engine 模块）
- 卡牌效果实现（card-effects 模块）
- UI 组件（client-ui 模块）
- 网络通信（network-server 模块）

## 上下游依赖

- **上游依赖**: data-layer（类型定义和 JSON 数据）
- **下游依赖**: game-engine（依赖核心模型）
