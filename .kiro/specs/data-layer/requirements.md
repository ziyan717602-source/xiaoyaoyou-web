# Requirements: data-layer

## 项目描述

**问题**: 项目需要将 C# 的 psd.db3 SQLite 数据库转换为 TypeScript 可用的 JSON 格式，并定义所有核心数据结构的类型。

**当前状态**:
- 数据存储在 psd.db3（SQLite，206KB）
- 无 TypeScript 类型定义
- 无数据加载机制

**期望结果**:
- 所有核心数据结构有完整的 TypeScript 类型定义
- psd.db3 数据导出为 JSON 文件
- 数据加载器可读取 JSON 并构建运行时对象

## 范围

**包含**:
- Hero/Tux/Monster/Npc/Eve/Skill/Rune/Exsp/Ops/NJ 的类型定义和 JSON 导出

**不包含**:
- 游戏逻辑翻译
- UI 组件
- 网络通信

**边界**:
- src/shared/types/ — 所有 TypeScript 类型定义
- src/shared/data/ — JSON 数据文件 + 加载器
- scripts/export-db.ts — 数据导出脚本

**上下游依赖**:
- 上游: psd.db3 数据库
- 下游: core-models（依赖类型定义和数据）

## 约束

- 类型定义必须与 C# 代码保持一致
- JSON 数据必须包含范围内所有卡牌
- 数据导出脚本使用 better-sqlite3 读取数据库

## 需求

### 需求 1: 类型定义

**1.1 Hero 类型定义**

系统必须定义 Hero 接口，包含以下字段：
- Name: string（角色名称）
- Avatar: number（头像编号，如 10502）
- Group: number（分组，1=标准，0=测试，2=SP 等）
- Genre: number（类型）
- Gender: string（性别，M/F）
- HP: number（生命值）
- STR: number（力量）
- DEX: number（敏捷）
- Skills: string[]（技能列表）
- RelatedSkills: string[]（关联技能）
- Spouses: string[]（配偶代码）
- Isomorphic: number[]（同构列表）
- Archetype: number（原型）
- Antecessor: number（前身）
- Pioneer: number（先驱）
- Ofcode: string（原始代码）
- TokenAlias: string（令牌别名）
- PeopleAlias: string（人物别名）
- PlayerTarAlias: string（玩家目标别名）
- ExCardsAlias: string（额外卡牌别名）
- AwakeAlias: string（觉醒别名）
- FolderAlias: string（文件夹别名）
- GuestAlias: string（访客别名）

**1.2 Tux 类型定义**

系统必须定义 Tux 接口，包含以下字段：
- Name: string（手牌名称）
- Code: string（代码）
- Type: TuxType（类型枚举）
- Genre: number（类型）
- Package: number[]（包含的包）
- Range: number[]（编号范围）
- Description: string（描述）
- Special: Record<string, string>（特殊属性）
- Priorities: number[]（优先级）
- Occurs: string[]（触发条件）
- Parasitism: string[]（寄生条件）
- Targets: string[]（目标）
- IsTermini: boolean[]（是否终止）

**1.3 TuxType 枚举定义**

系统必须定义 TuxType 枚举，包含以下值：
- HX: 未知类型
- JP: 锦囊牌
- ZP: 装备牌
- TP: 陷阱牌
- WQ: 武器牌
- FJ: 防具牌
- XB: 行背包

**1.4 Monster 类型定义**

系统必须定义 Monster 接口，包含以下字段：
- Name: string（怪物名称）
- Code: string（代码）
- Group: number（分组）
- Genre: number（类型）
- Element: FiveElement（五行属性）
- Level: MonsterLevel（等级）
- STRb: number（基础力量）
- AGLb: number（基础敏捷）
- DBSerial: number（数据库编号）
- DebutText: string（登场文本）
- PetText: string（宠物文本）
- WinText: string（胜利文本）
- LoseText: string（失败文本）
- EAOccurs: string[][]（效果触发条件）
- EAProperties: number[][]（效果属性）
- EALocks: boolean[][]（效果锁定）
- EAOnces: boolean[][]（效果一次性）
- EAIsTermini: boolean[][]（效果终止）
- EAHinds: boolean[][]（效果阻碍）

**1.5 MonsterLevel 枚举定义**

系统必须定义 MonsterLevel 枚举，包含以下值：
- WOODEN: 木头
- WEAK: 弱小
- STRONG: 强大
- BOSS: BOSS

**1.6 FiveElement 枚举定义**

系统必须定义 FiveElement 枚举，包含以下值：
- AQUA: 水
- AGNI: 火
- THUNDER: 雷
- AERO: 风
- SATURN: 土
- YINN: 阴
- SOLARIS: 阳
- A: 无属性

**1.7 NPC 类型定义**

系统必须定义 NPC 接口，包含以下字段：
- Name: string（NPC 名称）
- Code: string（代码）
- Group: number（分组）
- Gender: string（性别，M/F）
- Genre: number（类型）
- STRb: number（基础力量）
- Skills: string[]（技能列表）
- Hero: number（原始英雄代码）
- DebutText: string（登场文本）

**1.8 Skill 类型定义**

系统必须定义 Skill 接口，包含以下字段：
- Name: string（技能名称）
- Code: string（代码）
- Occurs: string[]（触发条件）
- Priorities: number[]（优先级）
- IsOnce: boolean[]（是否一次性）
- IsTermini: boolean[]（是否终止）
- Lock: (boolean | null)[]（锁定状态）
- IsHind: boolean[]（是否阻碍）
- IsChange: boolean（是否变更）
- IsRestrict: boolean（是否限制）
- Parasitism: string[]（寄生条件）
- Descripe: string（描述）

**1.9 Bless 类型定义**

系统必须定义 Bless 接口，继承自 Skill，包含以下额外字段：
- BKValid: (player, type, fuse, owner) => boolean（验证函数）

**1.10 TuxEqiup 类型定义**

系统必须定义 TuxEqiup 接口，继承自 Tux，包含以下字段：
- IncrOfSTR: number（力量增量）
- IncrOfDEX: number（敏捷增量）
- SingleEntry: number（单入口）
- CsPriorites: number[][]（消耗优先级）
- CsOccur: string[][]（消耗触发条件）
- CsLock: boolean[][]（消耗锁定）
- CsOnce: boolean[][]（消耗一次性）
- CsIsTermini: boolean[][]（消耗终止）
- CsHind: boolean[][]（消耗阻碍）

**1.11 Luggage 类型定义**

系统必须定义 Luggage 接口，继承自 TuxEqiup，包含以下字段：
- Capacities: string[]（容量列表）
- Pull: boolean（是否正在拉取）

**1.12 Illusion 类型定义**

系统必须定义 Illusion 接口，继承自 TuxEqiup，包含以下字段：
- ILAS: string | null（当前幻象）

### 需求 2: JSON 数据导出

**2.1 数据库读取**

系统必须使用 better-sqlite3 读取 psd.db3 数据库。

**2.2 Hero 数据导出**

系统必须导出 Hero 表的所有数据到 JSON 文件，包含以下字段：
- ID, GENRE, VALID, OFCODE, NAME, HP, STR, DEX, GENDER, SPOUSE, ISO, SKILL, ALIAS, BIO

**2.3 Tux 数据导出**

系统必须导出 Tux 表的所有数据到 JSON 文件，包含以下字段：
- ID, CODE, NAME, COUNT, OCCURS, PRIORS, PARASITISM, DESCRIPTION, SPECIAL, TARGET, GROWUP, TERMHIND, GENRE

**2.4 Monster 数据导出**

系统必须导出 Monster 表的所有数据到 JSON 文件，包含以下字段：
- ID, CODE, NAME, VALID, STR, AGL, LEVEL, OCCURS, PRIORS, DEBUTTEXT, PETTEXT, WINTEXT, LOSETEXT, TERMINI, SPI, GENRE

**2.5 NPC 数据导出**

系统必须导出 Npc 表的所有数据到 JSON 文件，包含以下字段：
- ID, CODE, VALID, NAME, STR, ACTION, ORG, GENDER, DEBUTTEXT, GENRE

**2.6 Skill 数据导出**

系统必须导出 Skill 表的所有数据到 JSON 文件，包含以下字段：
- CODE, TYPE, NAME, OCCURS, PRIORS, ONCE, PARASITISM, DESCRIPE, HIND, TERMINI

### 需求 3: 数据加载器

**3.1 JSON 数据加载**

系统必须提供数据加载器，能够读取 JSON 文件并构建运行时对象。

**3.2 Hero 数据加载**

系统必须加载 Hero JSON 数据，构建 Hero 对象数组。

**3.3 Tux 数据加载**

系统必须加载 Tux JSON 数据，构建 Tux 对象数组。

**3.4 Monster 数据加载**

系统必须加载 Monster JSON 数据，构建 Monster 对象数组。

**3.5 NPC 数据加载**

系统必须加载 NPC JSON 数据，构建 NPC 对象数组。

**3.6 Skill 数据加载**

系统必须加载 Skill JSON 数据，构建 Skill 对象数组。
