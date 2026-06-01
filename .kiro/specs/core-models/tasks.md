# Tasks: core-models

## 任务总览

- 总计: 10 个主要任务, 约 35 个子任务
- 覆盖需求: 1.1-8 (全部 8 个需求区域)
- 平均任务大小: 1-3 小时/子任务
- 并行标记 (P): 满足并行条件的任务已标记

---

## 1. 工具类实现

### 1.1 实现 Rueue<T> 双端队列
_Boundary: src/shared/game/utils/rueue.ts_

- [ ] 1.1.1 创建 `src/shared/game/utils/rueue.ts`，实现 `Rueue<T>` 类
  - 实现 `enqueue`（尾部入队）、`pushBack`（头部入队）、`dequeue`（头部出队，含批量版本）
  - 实现 `watch`（查看头部，含批量版本）、`remove`（移除指定元素）、`intersect`（交集）
  - 实现 `shuffle`（Fisher-Yates 随机打乱）
  - 实现 `count` getter 和 `[Symbol.iterator]` 迭代器
  - Done: Rueue 类可编译，所有方法签名与 C# 原版一致

### 1.2 实现 Diva 动态 KV 存储
_Boundary: src/shared/game/utils/diva.ts_

- [ ] 1.2.1 创建 `src/shared/game/utils/diva.ts`，实现 `Diva` 类
  - 实现 `set(key, value)` 设置键值对，value 为 null 时删除键
  - 实现类型安全 getter：`getInt`、`getString`、`getBool`、`getUshort`、`getDiva`、`getObject`
  - 实现数组 getter：`getUshortArray`、`getIntArray`、`getStringArray`、`getBoolArray`、`getDivaArray`
  - 实现 `getOrSetArray`、`getOrSetDiva` 懒加载方法
  - 实现 `getKeys`、`clear`、`toString` 方法
  - 实现键值对数组构造函数
  - Done: Diva 类可编译，支持所有存取操作

### 1.3 实现 PriorityQueue<T> 优先队列
_Boundary: src/shared/game/utils/priority-queue.ts_

- [ ] 1.3.1 创建 `src/shared/game/utils/priority-queue.ts`，实现 `PriorityQueue<T>` 类
  - 实现 `enqueue(value, priority)`（按优先级插入）
  - 实现 `dequeue()`（移除最高优先级）、`peek()`（查看最高优先级）
  - 实现 `count` getter
  - Done: PriorityQueue 类可编译，优先级排序正确

### 1.4 实现 UFSet<T> 并查集
_Boundary: src/shared/game/utils/ufset.ts_

- [ ] 1.4.1 创建 `src/shared/game/utils/ufset.ts`，实现 `UFSet<T>` 类
  - 实现 `find(x)`（路径压缩）、`union(x, y)`（按秩合并）
  - 实现 `contains(x)`、`getAll(x)` 方法
  - Done: UFSet 类可编译，路径压缩和按秩合并逻辑正确

### 1.5 实现 Algo 静态工具类
_Boundary: src/shared/game/utils/algo.ts_

- [ ] 1.5.1 创建 `src/shared/game/utils/algo.ts`，实现 `Algo` 静态类
  - 实现 `shuffle<T>`（Fisher-Yates）、`pickSomeInRandomOrder<T>`（随机选取）
  - 实现 `include`、`substring`（安全截取）、`splits`（分隔符拆分）、`countItemFromComma`
  - 实现 `addToMultiMap`、`addToUniqueMultiMap`、`plusToMap`（映射操作）
  - 实现 `takeRange`（数组切片）、`takeArrayWithSize`（解析带大小前缀数组）
  - 实现 `repeatString`、`repeatToArray`（重复操作）
  - 实现 `listToString`（集合序列化）、`removeFromMultiMap`、`isSubSet`
  - 实现 `longMessageParse`（长消息解析）
  - Done: Algo 类可编译，所有工具方法可用

### 1.6 创建工具类导出和单元测试
_Boundary: src/shared/game/utils/index.ts_

- [ ] 1.6.1 创建 `src/shared/game/utils/index.ts`，导出所有工具类
  - Done: 模块导出正确

- [ ] 1.6.2 编写工具类单元测试
  - 创建 `src/shared/game/utils/__tests__/` 目录
  - 编写 Rueue 测试（入队/出队顺序、批量操作、随机打乱、迭代器）
  - 编写 Diva 测试（键值存取、类型安全、懒加载、null 删除）
  - 编写 PriorityQueue 测试（优先级排序、空队列处理）
  - 编写 UFSet 测试（路径压缩、按秩合并、集合查询）
  - 编写 Algo 测试（各工具方法的边界情况）
  - Done: 所有工具类测试通过

---

## 2. 卡牌基础类型

### 2.1 实现枚举和接口
_Boundary: src/shared/game/card/five-element.ts, nmb.ts_

- [ ] 2.1.1 创建 `src/shared/game/card/five-element.ts`，实现 `FiveElement` 枚举和辅助方法
  - 实现 `FiveElement` 枚举（AQUA, AGNI, THUNDER, AERO, SATURN, YINN, SOLARIS, A）
  - 实现 `HPEvoMask` 枚举（位掩码，用于 HP 变化追踪）
  - 实现 `FiveElementHelper` 静态类（Elem2Index, Elem2Int, Int2Elem, IsStandardPropedElement, IsPropedElement）
  - Done: 枚举和辅助方法可编译

- [ ] 2.1.2 创建 `src/shared/game/card/nmb.ts`，实现 `NMB` 接口和 `NMBLib`
  - 实现 `NMB` 接口（isMonster, isNpc, name, code, str, agl）
  - 实现 `NMBLib` 静态类（IsMonster, IsNPC, Decode, Encode, CodeOfMonster, CodeOfNPC）
  - Done: NMB 接口和 NMBLib 可编译

### 2.2 实现 Tux 类系
_Boundary: src/shared/game/card/tux.ts, tux-equip.ts, luggage.ts, illusion.ts_

- [ ] 2.2.1 创建 `src/shared/game/card/card.ts`，实现 `Card` 静态类和 `Genre` 枚举
  - 实现 `Card` 静态类（pickSomeInRandomOrder, pickSomeInGivenProbability, level2Pkg）
  - 实现 `Genre` 枚举（NIL, Tux, NMB, Eve, TuxSerial, Rune, Five, Exsp, Hero, NPC）
  - 实现 `PileGenre` 枚举（Tux, NMB, Eve, UH, UM, UN）
  - Done: Card 类和枚举可编译

- [ ] 2.2.2 创建 `src/shared/game/card/tux.ts`，实现 `Tux` 类
  - 定义所有委托类型别名（ActionDelegate, ValidDelegate, InputDelegate 等）
  - 实现 Tux 类的所有属性（name, code, type, genre, package, range, description, special, dbSerial, priorities, occurs, parasitism, targets, isTermini）
  - 实现委托属性的 getter/setter 模式（带默认值）
  - 实现 `isTuxEquip()`、`isLinked(inType)`、`isSameType(tux)`、`occurString()` 方法
  - Done: Tux 类可编译，委托模式正确

- [ ] 2.2.3 创建 `src/shared/game/card/tux-equip.ts`，实现 `TuxEquip` 类
  - 继承 Tux 类
  - 实现装备属性（incrOfSTR, incrOfDEX, singleEntry, rfm）
  - 实现消费系统属性（CsPriorites, CsOccur, CsLock, CsOnce, CsIsTermini, CsHind）
  - 实现消费委托模式（ConsumeAction, ConsumeValid, ConsumeInput 等）
  - 实现装备增减委托（IncrAction, DecrAction, InsAction, DelAction）
  - 实现 `isTuxEquip()` 返回 true
  - Done: TuxEquip 类可编译，继承链正确

- [ ] 2.2.4 创建 `src/shared/game/card/luggage.ts`，实现 `Luggage` 类
  - 继承 TuxEquip 类
  - 实现 capacities 属性（字符串数组）和 pull 属性（布尔值）
  - 实现 `isLuggage()` 返回 true
  - Done: Luggage 类可编译

- [ ] 2.2.5 创建 `src/shared/game/card/illusion.ts`，实现 `Illusion` 类
  - 继承 TuxEquip 类
  - 实现 ilas 属性（当前幻化目标，可为 null）
  - 实现 `isIllusion()` 返回 true
  - Done: Illusion 类可编译

---

## 3. 实体卡牌

### 3.1 实现 Monster 类
_Boundary: src/shared/game/card/monster.ts_

- [ ] 3.1.1 创建 `src/shared/game/card/monster.ts`，实现 `Monster` 类
  - 实现 MonsterLevel 枚举（WOODEN, WEAK, STRONG, BOSS）
  - 实现 Monster 类实现 NMB 接口
  - 实现所有属性（name, code, group, genre, element, level, str, strb, agl, aglb, dbSerial）
  - 实现战斗效果属性（eaOccurs, eaProperties, eaLocks, eaOnces, eaIsTermini, eaHinds）
  - 实现文本属性（debutText, petText, winText, loseText）
  - 实现状态存储（rom, rfm, ram: Diva, teamBursted, seals: Set）
  - 实现 SPI 属性和方法（parseSpi, isHarmInvolved, isTuxInvolved, isSilence）
  - 实现内存重置方法（resetRam, resetRfm, resetRom）
  - 实现委托模式（debut, curtain, winEff, loseEff, incrAction, decrAction, consumeAction 等）
  - 实现 `isLinked(consumeType, inType)` 方法
  - Done: Monster 类可编译，SPI 解析逻辑正确

### 3.2 实现 Hero 类
_Boundary: src/shared/game/card/hero.ts_

- [ ] 3.2.1 创建 `src/shared/game/card/hero.ts`，实现 `Hero` 类
  - 实现所有属性（name, avatar, group, genre, gender, hp, str, dex, skills, relatedSkills, spouses, isomorphic）
  - 实现继承关系属性（archetype, antecessor, pioneer, ofcode）
  - 实现别名属性（tokenAlias, peopleAlias, playerTarAlias, exCardsAlias, awakeAlias, folderAlias, guestAlias）
  - 实现 `forceChange(field, value)` 方法（版本兼容）
  - 实现 `setAvailableParam(groupString)` 方法
  - Done: Hero 类可编译

### 3.3 实现 NPC 类
_Boundary: src/shared/game/card/npc.ts_

- [ ] 3.3.1 创建 `src/shared/game/card/npc.ts`，实现 `NPC` 类
  - 实现 NPC 类实现 NMB 接口
  - 实现所有属性（name, code, group, gender, genre, str, strb, agl, skills, hero, debutText）
  - 实现 `debut` 委托
  - 实现 `forceChange(field, value)` 方法
  - Done: NPC 类可编译

### 3.4 实现 Evenement 类
_Boundary: src/shared/game/card/evenement.ts_

- [ ] 3.4.1 创建 `src/shared/game/card/evenement.ts`，实现 `Evenement` 类
  - 实现所有属性（name, code, range, background, description, group, genre）
  - 实现属性数组（occurs, priorties, isOnce, isTermini, lock）
  - 实现 SPI 检测方法（isHarmInvolved, isTuxInvolved, isSilence）
  - 实现委托模式（action, pers, persValid）
  - Done: Evenement 类可编译

### 3.5 实现 Rune 和 Exsp 类
_Boundary: src/shared/game/card/rune.ts, exsp.ts_

- [ ] 3.5.1 创建 `src/shared/game/card/rune.ts`，实现 `Rune` 类
  - 实现所有属性（name, code, occur, priority, isLock, isOnce, isTermin, isConsume, description）
  - 实现委托模式（input, action, valid）
  - Done: Rune 类可编译

- [ ] 3.5.2 创建 `src/shared/game/card/exsp.ts`，实现 `Exsp` 类
  - 实现所有属性（name, code, type, hero, skills, description）
  - Done: Exsp 类可编译

### 3.6 创建卡牌类型导出和单元测试
_Boundary: src/shared/game/card/index.ts_

- [ ] 3.6.1 创建 `src/shared/game/card/index.ts`，导出所有卡牌类型
  - Done: 模块导出正确

- [ ] 3.6.2 编写卡牌类型单元测试
  - 创建 `src/shared/game/card/__tests__/` 目录
  - 编写 Tux 测试（构造、委托绑定、类型判断）
  - 编写 TuxEquip/Luggage/Illusion 测试（继承链、装备属性）
  - 编写 Monster 测试（SPI 解析、五行属性、等级、内存重置）
  - 编写 Hero 测试（属性、别名、版本兼容）
  - 编写 NPC 测试（属性、技能列表）
  - 编写 Evenement 测试（SPI 检测、事件属性）
  - 编写 Rune 测试（委托绑定、锁状态）
  - Done: 所有卡牌类型测试通过

---

## 4. Player 和 Board

### 4.1 实现 Player 类
_Boundary: src/shared/game/player.ts_

- [ ] 4.1.1 创建 `src/shared/game/player.ts`，实现 `Player` 类
  - 实现账户信息（name, avatar, uid, aUid, hopeTeam）
  - 实现属性（selectHero, team, isReal, gender）
  - 实现 HP 和战斗属性（hp, hpBase, stra, strb, strc, strh, dexa, dexb, dexc, dexh, strI, dexI, tuxLimit）
  - 实现卡牌槽位（tux, armor, weapon, trove, exEquip, exCards, fakeq, pets, escue）
  - 实现状态属性（isAlive, nineteen, isTared, immobilized, loved, petDisabled, restZP, exMask, fyMask, runes, exSpouses）
  - 实现卡牌禁用系统（位掩码操作：setWeaponDisabled, setArmorDisabled, setTroveDisabled, setZPDisabled 等）
  - 实现静默系统（setSilence, resetSilence, isSilenced）
  - 实现记忆系统（tokenAwake, tokenCount, tokenTars, tokenExcl, tokenFold, rom, rfm, ram, coss, guardian）
  - 实现价格系统（clearPrice, addToPrice, removeFromPrice, getPrice）
  - 实现卡牌操作方法（removeCard, hasAnyCards, hasAnyEquips, hasCard, listOutAllCards 等）
  - 实现装备槽位计算（getSlotCapacity, getCurrentEquipCount）
  - 实现重置方法（resetStatus, resetRam, resetRfm, resetTokens, resetRom, initFromHero）
  - 实现静态工厂方法（warriors）
  - 实现 PlayerCompare 内部类
  - Done: Player 类可编译，所有方法签名与 C# 原版一致

### 4.2 实现 Board 类
_Boundary: src/shared/game/board.ts_

- [ ] 4.2.1 创建 `src/shared/game/board.ts`，实现 `Board` 类
  - 实现玩家花园（garden: Map<number, Player>）
  - 实现回合信息（rounder, roundIN）
  - 实现战斗信息（hinder, supporter, horn, supportSucc, hinderSucc, posHinders, posSupporters）
  - 实现战斗参与者（rDrums, oDrums）
  - 实现游戏状态（clockWised, inCampaign, poolEnabled, playerPoolEnabled, isMonsterDebut）
  - 实现战斗池信息（rPool, oPool, rPoolGain, oPoolGain, isBattleWin, poolDelta）
  - 实现怪物信息（mon1Catchable, mon2Catchable, monster1, monster2, mon1From, wang, battler, eve）
  - 实现牌堆（tuxPiles, evePiles, monPiles, tuxDises, eveDises, monDises）
  - 实现英雄牌堆（heroPiles, restNpcPiles, restMonPiles, heroDises, restNpcDises, restMonDises）
  - 实现禁止/保护列表（bannedHero, protectedTux, pendingTux, petProtectedPlayer, escueBanned, silence）
  - 实现跳转表和分数（jumpTable, finalAkaScore, finalAoScore）
  - 实现玩家查找方法（getOpponent, opponent, facer, isAttendWar, isAttendWarSucc, getAllAttenders）
  - 实现战斗计算方法（calculateRPool, calculateOPool, isRounderBattleWin, cleanBattler）
  - 实现玩家排序方法（orderedPlayer, getNextPlayer, getPrevPlayer, reOrderedPlayers）
  - 实现序列化方法（toSerialMessage, generateSerialFieldMessage, generatePrivateMessage）
  - 实现构造函数和 ghost 哨兵
  - Done: Board 类可编译，所有方法签名与 C# 原版一致

### 4.3 Player 和 Board 单元测试

- [ ] 4.3.1 编写 Player 单元测试
  - 创建 `src/shared/game/__tests__/player.test.ts`
  - 测试卡牌操作（removeCard, hasAnyCards, hasAnyEquips, hasCard）
  - 测试禁用系统（setWeaponDisabled, setZPDisabled 等位掩码操作）
  - 测试状态重置（resetStatus, resetRam, resetRfm, resetTokens, resetRom）
  - 测试价格系统（addToPrice, removeFromPrice, getPrice）
  - 测试装备槽位计算（getSlotCapacity, getCurrentEquipCount）
  - Done: Player 测试通过

- [ ] 4.3.2 编写 Board 单元测试
  - 创建 `src/shared/game/__tests__/board.test.ts`
  - 测试玩家查找（getOpponent, facer, isAttendWar, getAllAttenders）
  - 测试战斗计算（calculateRPool, calculateOPool, isRounderBattleWin）
  - 测试序列化（toSerialMessage, generateSerialFieldMessage, generatePrivateMessage）
  - 测试玩家排序（orderedPlayer, getNextPlayer, getPrevPlayer）
  - Done: Board 测试通过

---

## 5. 技能和规则

### 5.1 实现 Skill、Bless、SKBranch
_Boundary: src/shared/game/skill.ts_

- [ ] 5.1.1 创建 `src/shared/game/skill.ts`，实现 `Skill`、`Bless`、`SKBranch` 类
  - 实现 Skill 类所有属性（name, code, occurs, priorities, isOnce, isTermini, lock, isHind, isChange, isRestrict, parasitism, descripe）
  - 实现 Skill 委托模式（action, valid, input, encrypt）
  - 实现 `isBK` getter（默认 false）和 `isLinked(inType)` 方法
  - 实现 `forceChange(field, value)` 方法
  - 实现 Bless 类继承 Skill，`isBK` 返回 true，实现 `bkValid` 委托
  - 实现 SKBranch 类（occur, priority, once, serial, hind, demiurgic, lock）
  - 实现 SKBranch 的 mixCode 位掩码 getter/setter
  - 实现 SKBranch 的 linked getter
  - 实现 SKBranch 的静态方法（parseFromStrings, parseFromString）
  - Done: Skill/Bless/SKBranch 类可编译

### 5.2 实现 Casting 子类
_Boundary: src/shared/game/rules/casting.ts_

- [ ] 5.2.1 创建 `src/shared/game/rules/casting.ts`，实现 Casting 抽象类和所有子类
  - 实现 Casting 抽象类（playerCapacity 常量 = 6）
  - 实现 CastingPick 类（xuan, huan, ding 字典；init, pick, switch, switchAt, switchTo, toMessage 方法）
  - 实现 CastingTable 类（xuan, banAka, banAo, ding 字典；pick, ban, putBack, toMessage 方法）
  - 实现 CastingPublic 类（xuan, dingAka, dingAo, banAka, banAo, secrets 列表；ban, pick, pickReport, toMessage 方法）
  - 实现 CastingCongress 类（xuanAka, xuanAo, ding 字典, secrets 列表；init, set, isDecide, toMessage 方法）
  - Done: 所有 Casting 子类可编译，序列化方法正确

### 5.3 实现 RuleCode
_Boundary: src/shared/game/rules/rule-code.ts_

- [ ] 5.3.1 创建 `src/shared/game/rules/rule-code.ts`，实现 `RuleCode` 静态类
  - 实现队伍选择常量（HOPE_NO, HOPE_YES, HOPE_NOTCARE, HOPE_AKA, HOPE_AO, HOPE_IP）
  - 实现模式选择常量（MODE_00, MODE_CJ, MODE_31 等 13 个模式）
  - 实现包选择常量（LEVEL_NEW, LEVEL_STD, LEVEL_RCM, LEVEL_ALL, LEVEL_IPV）
  - 实现 `castMode` 双向转换方法（字符串到整数、整数到字符串）
  - Done: RuleCode 类可编译，常量值与 C# 原版一致

### 5.4 实现 NCAction 和 Operation
_Boundary: src/shared/game/nc-action.ts, operation.ts_

- [ ] 5.4.1 创建 `src/shared/game/nc-action.ts`，实现 `NCAction` 类
  - 实现属性（name, code, intro, branches: SKBranch[]）
  - 实现委托模式（action, valid, input, escueAction, escueValid, escueInput）
  - Done: NCAction 类可编译

- [ ] 5.4.2 创建 `src/shared/game/operation.ts`，实现 `Operation` 类
  - 实现属性（name, code, occur, isOnce）
  - 实现委托模式（action, valid, input）
  - Done: Operation 类可编译

### 5.5 技能和规则单元测试

- [ ] 5.5.1 编写技能和规则单元测试
  - 创建 `src/shared/game/__tests__/skill.test.ts`
  - 测试 Skill 委托绑定和 isLinked
  - 测试 Bless 的 isBK 和 bkValid
  - 测试 SKBranch 的 MixCode 位掩码和 parseFromStrings
  - 创建 `src/shared/game/rules/__tests__/casting.test.ts`
  - 测试 CastingPick 的 pick/switch 操作
  - 测试 CastingTable 的 pick/ban/putBack 操作
  - 测试 CastingPublic 的 ban/pick/pickReport 操作
  - 测试 CastingCongress 的 set/isDecide 操作
  - 测试所有 Casting 子类的 toMessage 序列化
  - 测试 RuleCode 的 castMode 双向转换
  - Done: 所有技能和规则测试通过

---

## 6. Lib 类

### 6.1 实现所有 Lib 类
_Boundary: src/shared/game/lib/_

- [ ] 6.1.1 创建 `src/shared/game/lib/hero-lib.ts`，实现 `HeroLib` 类
  - 实现从 HeroData[] JSON 数据加载 Hero 集合
  - 实现 `instanceHero(code)`、`listAllHeros(groups)`、`listAllSeleable(groups)` 方法
  - 实现 `listAllJoinableHeroes(groups)`、`listHeroesInTest(level)` 方法
  - 实现 `size` getter
  - Done: HeroLib 类可编译，数据加载正确

- [ ] 6.1.2 创建 `src/shared/game/lib/tux-lib.ts`，实现 `TuxLib` 类
  - 实现从 TuxData[] JSON 数据加载 Tux 集合
  - 实现 `decodeTux(code)`、`encodeTuxCode(code)`、`encodeTuxDbSerial(dbSerial)` 方法
  - 实现 `listAllTuxs(groups)`、`listAllTuxSeleable(groups)`、`listAllTuxCodes(groups)` 方法
  - 实现 `uniqueEquipSerial(code)`、`isTuxInGroup(tux, level)` 方法
  - Done: TuxLib 类可编译

- [ ] 6.1.3 创建 `src/shared/game/lib/monster-lib.ts`，实现 `MonsterLib` 类
  - 实现从 MonsterData[] JSON 数据加载 Monster 集合
  - 实现 `decode(code)`、`encode(code)`、`listAllSeleable(groups)`、`listAllMonster(groups)` 方法
  - Done: MonsterLib 类可编译

- [ ] 6.1.4 创建 `src/shared/game/lib/npc-lib.ts`，实现 `NPCLib` 类
  - 实现从 NpcData[] JSON 数据加载 NPC 集合
  - 实现 `decode(code)`、`encode(code)`、`listAllSeleable(groups)`、`listAllNPC(groups)` 方法
  - Done: NPCLib 类可编译

- [ ] 6.1.5 创建 `src/shared/game/lib/evenement-lib.ts`，实现 `EvenementLib` 类
  - 实现从 EveData[] JSON 数据加载 Evenement 集合
  - 实现 `decodeEvenement(code)`、`getEveFromName(code)`、`listAllSeleable(groups)`、`listAllEves(groups)` 方法
  - 实现 `refresh()` 方法（重新构建索引）
  - Done: EvenementLib 类可编译

- [ ] 6.1.6 创建 `src/shared/game/lib/skill-lib.ts`，实现 `SkillLib` 类
  - 实现从 SkillData[] JSON 数据加载 Skill 集合
  - 实现 `encodeSkill(code)` 方法
  - 实现 `size` getter 和 `firsts` 属性
  - Done: SkillLib 类可编译

- [ ] 6.1.7 创建 `src/shared/game/lib/operation-lib.ts`，实现 `OperationLib` 类
  - 实现从 OpsData[] JSON 数据加载 Operation 集合
  - 实现 `encodeOps(code)` 方法
  - Done: OperationLib 类可编译

- [ ] 6.1.8 创建 `src/shared/game/lib/nc-action-lib.ts`，实现 `NCActionLib` 类
  - 实现从 NjData[] JSON 数据加载 NCAction 集合
  - 实现 `encodeNCAction(code)` 方法
  - Done: NCActionLib 类可编译

- [ ] 6.1.9 创建 `src/shared/game/lib/rune-lib.ts`，实现 `RuneLib` 类
  - 实现从 RuneData[] JSON 数据加载 Rune 集合
  - 实现 `encode(code)`、`decode(ut)`、`getSingleIndex(rune)` 方法
  - 实现 `getFullAppendableList()`、`getFullPositive()`、`getFullNegative()`、`getFullAdvanced()` 方法
  - Done: RuneLib 类可编译

- [ ] 6.1.10 创建 `src/shared/game/lib/exsp-lib.ts`，实现 `ExspLib` 类
  - 实现从 ExspData[] JSON 数据加载 Exsp 集合
  - 实现 `encode(code)` 方法和 `firsts` getter
  - Done: ExspLib 类可编译

### 6.2 实现 LibGroup 和导出

- [ ] 6.2.1 创建 `src/shared/game/lib-group.ts`，实现 `LibGroup` 类
  - 实现所有 Lib 属性（hl, tl, nl, ml, el, sl, zl, njl, rl, esl）
  - 实现构造函数（接收所有 Lib 实例）
  - 实现默认构造函数（创建所有 Lib 实例）
  - Done: LibGroup 类可编译

- [ ] 6.2.2 创建 `src/shared/game/lib/index.ts`，导出所有 Lib 类
  - Done: 模块导出正确

### 6.3 Lib 单元测试

- [ ] 6.3.1 编写 Lib 单元测试
  - 创建 `src/shared/game/lib/__tests__/` 目录
  - 编写 HeroLib 测试（数据加载、instanceHero、listAllHeros、listAllSeleable）
  - 编写 TuxLib 测试（数据加载、decodeTux、encodeTuxCode、listAllTuxs）
  - 编写 MonsterLib 测试（数据加载、decode、encode、listAllSeleable）
  - 编写 NPCLib 测试（数据加载、decode、encode、listAllSeleable）
  - 编写 SkillLib 测试（数据加载、encodeSkill）
  - 编写其他 Lib 基本测试
  - Done: 所有 Lib 测试通过

---

## 7. 集成和导出

### 7.1 模块集成

- [ ] 7.1.1 创建 `src/shared/game/index.ts`，导出所有游戏模型
  - 导出 utils/、card/、player、board、skill、rules/、lib/、lib-group、nc-action、operation
  - Done: 顶层模块导出正确

- [ ] 7.1.2 验证所有模块可编译
  - 运行 TypeScript 编译器检查所有文件
  - 修复任何类型错误
  - Done: 所有模块编译通过，无类型错误

### 7.2 集成测试

- [ ] 7.2.1 编写集成测试
  - 创建 `src/shared/game/__tests__/integration.test.ts`
  - 测试 LibGroup 初始化（创建所有 Lib 实例）
  - 测试 Player 创建和 Hero 初始化
  - 测试 Board 创建和玩家花园设置
  - 测试 Tux 创建和装备操作
  - Done: 集成测试通过
