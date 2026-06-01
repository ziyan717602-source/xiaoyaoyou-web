# Design: data-layer

## 概述

本设计将 C# 的 psd.db3 SQLite 数据库转换为 TypeScript 可用的 JSON 格式，并定义所有核心数据结构的类型。设计采用水平分层策略，先完成类型定义和数据导出，为后续模块（core-models）提供基础。

## 边界承诺

**本模块拥有**:
- src/shared/types/ 下的所有 TypeScript 类型定义
- src/shared/data/ 下的 JSON 数据文件和加载器
- scripts/export-db.ts 数据导出脚本

**本模块不拥有**:
- 游戏逻辑（属于 core-models 模块）
- UI 组件（属于 client-ui 模块）
- 网络通信（属于 network-server 模块）

**依赖关系**:
- 上游依赖: psd.db3 数据库
- 下游依赖: core-models（依赖类型定义和数据）

**可能导致下游重新验证的变更**:
- 修改任何 TypeScript 类型定义的结构
- 修改 JSON 数据的格式或字段
- 修改数据加载器的接口

## 架构决策

### 1. 类型定义策略

**决策**: 使用 TypeScript 接口（interface）定义所有数据结构，而非类型别名（type）。

**理由**:
- 接口支持声明合并，便于扩展
- 接口在 IDE 中提供更好的自动补全和错误检查
- 接口更符合面向对象的设计模式

### 2. 数据导出策略

**决策**: 使用 better-sqlite3 同步读取数据库，一次性导出所有表为 JSON 文件。

**理由**:
- better-sqlite3 是 Node.js 中性能最好的 SQLite 绑定
- 同步 API 简化了数据导出逻辑
- 一次性导出避免了多次数据库连接

### 3. 数据加载策略

**决策**: 提供类型安全的数据加载器，使用泛型支持不同类型的数据。

**理由**:
- 泛型提供编译时类型检查
- 加载器封装了 JSON 解析和类型转换逻辑
- 便于后续模块使用数据

## 组件设计

### 1. 类型定义模块 (src/shared/types/)

**文件结构**:
```
src/shared/types/
├── index.ts          # 导出所有类型
├── hero.ts           # Hero 类型定义
├── tux.ts            # Tux 类型定义
├── monster.ts        # Monster 类型定义
├── npc.ts            # NPC 类型定义
├── skill.ts          # Skill 类型定义
├── evenement.ts      # Evenement 类型定义
├── rune.ts           # Rune 类型定义
├── exsp.ts           # Exsp 类型定义
├── operation.ts      # Operation 类型定义
├── nc-action.ts      # NCAction 类型定义
├── enums.ts          # 枚举类型定义
└── common.ts         # 通用类型定义
```

**类型定义**:

#### 1.1 Hero 接口 (hero.ts)

```typescript
export interface Hero {
  Name: string;
  Avatar: number;
  Group: number;
  Genre: number;
  Gender: string;
  HP: number;
  STR: number;
  DEX: number;
  Skills: string[];
  RelatedSkills: string[];
  Spouses: string[];
  Isomorphic: number[];
  Archetype: number;
  Antecessor: number;
  Pioneer: number;
  Ofcode: string;
  TokenAlias: string;
  PeopleAlias: string;
  PlayerTarAlias: string;
  ExCardsAlias: string;
  AwakeAlias: string;
  FolderAlias: string;
  GuestAlias: string;
}
```

#### 1.2 Tux 接口 (tux.ts)

```typescript
export interface Tux {
  Name: string;
  Code: string;
  Type: TuxType;
  Genre: number;
  Package: number[];
  Range: number[];
  Description: string;
  Special: Record<string, string>;
  Priorities: number[];
  Occurs: string[];
  Parasitism: string[];
  Targets: string[];
  IsTermini: boolean[];
}

export interface TuxEquip extends Tux {
  IncrOfSTR: number;
  IncrOfDEX: number;
  SingleEntry: number;
  CsPriorites: number[][];
  CsOccur: string[][];
  CsLock: boolean[][];
  CsOnce: boolean[][];
  CsIsTermini: boolean[][];
  CsHind: boolean[][];
}

export interface Luggage extends TuxEquip {
  Capacities: string[];
  Pull: boolean;
}

export interface Illusion extends TuxEquip {
  ILAS: string | null;
}
```

#### 1.3 Monster 接口 (monster.ts)

```typescript
export interface Monster {
  Name: string;
  Code: string;
  Group: number;
  Genre: number;
  Element: FiveElement;
  Level: MonsterLevel;
  STRb: number;
  AGLb: number;
  DBSerial: number;
  DebutText: string;
  PetText: string;
  WinText: string;
  LoseText: string;
  EAOccurs: string[][];
  EAProperties: number[][];
  EALocks: boolean[][];
  EAOnces: boolean[][];
  EAIsTermini: boolean[][];
  EAHinds: boolean[][];
}
```

#### 1.4 NPC 接口 (npc.ts)

```typescript
export interface NPC {
  Name: string;
  Code: string;
  Group: number;
  Gender: string;
  Genre: number;
  STRb: number;
  Skills: string[];
  Hero: number;
  DebutText: string;
}
```

#### 1.5 Skill 接口 (skill.ts)

```typescript
export interface Skill {
  Name: string;
  Code: string;
  Occurs: string[];
  Priorities: number[];
  IsOnce: boolean[];
  IsTermini: boolean[];
  Lock: (boolean | null)[];
  IsHind: boolean[];
  IsChange: boolean;
  IsRestrict: boolean;
  Parasitism: string[];
  Descripe: string;
}

export interface Bless extends Skill {
  BKValid: (player: unknown, type: number, fuse: string, owner: number) => boolean;
}
```

#### 1.6 Evenement 接口 (evenement.ts)

```typescript
export interface Evenement {
  Name: string;
  Code: string;
  Group: number;
  Genre: number;
  Priorities: number[];
  Occurs: string[];
  Parasitism: string[];
  IsOnce: boolean[];
  IsTermini: boolean[];
  Lock: (boolean | null)[];
  IsHind: boolean[];
  Descripe: string;
  Special: Record<string, string>;
  Ofcode: string;
}
```

#### 1.7 Rune 接口 (rune.ts)

```typescript
export interface Rune {
  Name: string;
  Code: string;
  Group: number;
  Genre: number;
  Priorities: number[];
  Occurs: string[];
  Parasitism: string[];
  IsOnce: boolean[];
  IsTermini: boolean[];
  Lock: (boolean | null)[];
  IsHind: boolean[];
  Descripe: string;
  Special: Record<string, string>;
}
```

#### 1.8 Exsp 接口 (exsp.ts)

```typescript
export interface Exsp {
  Name: string;
  Code: string;
  Group: number;
  Genre: number;
  Priorities: number[];
  Occurs: string[];
  Parasitism: string[];
  IsOnce: boolean[];
  IsTermini: boolean[];
  Lock: (boolean | null)[];
  IsHind: boolean[];
  Descripe: string;
}
```

#### 1.9 Operation 接口 (operation.ts)

```typescript
export interface Operation {
  Name: string;
  Code: string;
  Group: number;
  Genre: number;
  Priorities: number[];
  Occurs: string[];
  Parasitism: string[];
  IsOnce: boolean[];
  IsTermini: boolean[];
  Lock: (boolean | null)[];
  IsHind: boolean[];
  Descripe: string;
}
```

#### 1.10 NCAction 接口 (nc-action.ts)

```typescript
export interface NCAction {
  Name: string;
  Code: string;
  Group: number;
  Genre: number;
  Priorities: number[];
  Occurs: string[];
  Parasitism: string[];
  IsOnce: boolean[];
  IsTermini: boolean[];
  Lock: (boolean | null)[];
  IsHind: boolean[];
  Descripe: string;
}
```

#### 1.11 枚举类型 (enums.ts)

```typescript
export enum TuxType {
  HX = 'HX',
  JP = 'JP',
  ZP = 'ZP',
  TP = 'TP',
  WQ = 'WQ',
  FJ = 'FJ',
  XB = 'XB'
}

export enum MonsterLevel {
  WOODEN = 'WOODEN',
  WEAK = 'WEAK',
  STRONG = 'STRONG',
  BOSS = 'BOSS'
}

export enum FiveElement {
  AQUA = 'AQUA',
  AGNI = 'AGNI',
  THUNDER = 'THUNDER',
  AERO = 'AERO',
  SATURN = 'SATURN',
  YINN = 'YINN',
  SOLARIS = 'SOLARIS',
  A = 'A'
}
```

### 2. 数据导出模块 (scripts/export-db.ts)

**功能**:
- 使用 better-sqlite3 读取 psd.db3 数据库
- 将 Hero、Tux、Monster、NPC、Skill、Evenement、Rune、Exsp、Operation、NCAction 表导出为 JSON 文件
- 保存到 src/shared/data/ 目录

**实现要点**:
```typescript
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// 数据库路径
const DB_PATH = '../psd48-master/~ex-lib/psd.db3';
// 输出目录
const OUTPUT_DIR = '../src/shared/data';

// 导出 Hero 表
function exportHero(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT ID, GENRE, VALID, OFCODE, NAME, HP, STR, DEX,
           GENDER, SPOUSE, ISO, SKILL, ALIAS, BIO
    FROM Hero
  `);
  const heroes = stmt.all();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'hero.json'),
    JSON.stringify(heroes, null, 2)
  );
}

// 类似地导出其他表...
```

### 3. 数据加载模块 (src/shared/data/)

**文件结构**:
```
src/shared/data/
├── index.ts          # 导出所有加载器
├── hero.json         # Hero 数据
├── tux.json          # Tux 数据
├── monster.json      # Monster 数据
├── npc.json          # NPC 数据
├── skill.json        # Skill 数据
├── eve.json          # Evenement 数据
├── rune.json         # Rune 数据
├── exsp.json         # Exsp 数据
├── ops.json          # Operation 数据
├── nj.json           # NCAction 数据
└── loader.ts         # 数据加载器
```

**加载器实现**:
```typescript
import { Hero } from '../types/hero';
import { Tux } from '../types/tux';
import { Monster } from '../types/monster';
import { NPC } from '../types/npc';
import { Skill } from '../types/skill';
import { Evenement } from '../types/evenement';
import { Rune } from '../types/rune';
import { Exsp } from '../types/exsp';
import { Operation } from '../types/operation';
import { NCAction } from '../types/nc-action';

import heroData from './hero.json';
import tuxData from './tux.json';
import monsterData from './monster.json';
import npcData from './npc.json';
import skillData from './skill.json';
import eveData from './eve.json';
import runeData from './rune.json';
import exspData from './exsp.json';
import opsData from './ops.json';
import njData from './nj.json';

export function loadHeroes(): Hero[] {
  return heroData as Hero[];
}

export function loadTuxes(): Tux[] {
  return tuxData as Tux[];
}

export function loadMonsters(): Monster[] {
  return monsterData as Monster[];
}

export function loadNPCs(): NPC[] {
  return npcData as NPC[];
}

export function loadSkills(): Skill[] {
  return skillData as Skill[];
}

export function loadEvenements(): Evenement[] {
  return eveData as Evenement[];
}

export function loadRunes(): Rune[] {
  return runeData as Rune[];
}

export function loadExsps(): Exsp[] {
  return exspData as Exsp[];
}

export function loadOperations(): Operation[] {
  return opsData as Operation[];
}

export function loadNCActions(): NCAction[] {
  return njData as NCAction[];
}
```

## 数据流

```
psd.db3 (SQLite)
    ↓
scripts/export-db.ts (better-sqlite3)
    ↓
src/shared/data/*.json (JSON 文件)
    ↓
src/shared/data/loader.ts (数据加载器)
    ↓
core-models (使用类型定义和数据)
```

## 测试策略

### 1. 类型定义测试

- 验证所有接口定义与 C# 代码一致
- 验证枚举值与 C# 枚举对应
- 验证类型导出正确

### 2. 数据导出测试

- 验证数据库连接成功
- 验证所有表数据正确导出
- 验证 JSON 文件格式正确
- 验证数据完整性（无遗漏字段）

### 3. 数据加载测试

- 验证 JSON 文件可正确读取
- 验证数据类型转换正确
- 验证加载器返回正确的对象数组

## 风险与缓解

### 1. 数据库结构变更

**风险**: C# 代码中的数据库结构可能与实际数据库不一致。

**缓解**: 
- 在导出脚本中添加字段验证
- 对比导出数据与 C# 代码中的字段定义
- 添加单元测试验证数据完整性

### 2. 数据类型转换

**风险**: C# 类型与 TypeScript 类型不完全对应。

**缓解**:
- 使用适当的类型断言
- 添加运行时类型检查
- 在文档中说明类型映射关系

### 3. 性能问题

**风险**: 大量数据导出可能导致性能问题。

**缓解**:
- 使用 better-sqlite3 的同步 API
- 一次性导出所有数据
- 优化 JSON 序列化过程

## 实现计划

### 阶段 1: 类型定义 (1-2 天)

1. 创建 src/shared/types/ 目录结构
2. 定义所有枚举类型
3. 定义所有接口类型
4. 创建类型导出文件

### 阶段 2: 数据导出 (1 天)

1. 安装 better-sqlite3 依赖
2. 实现 scripts/export-db.ts
3. 运行导出脚本生成 JSON 文件
4. 验证导出数据完整性

### 阶段 3: 数据加载 (1 天)

1. 创建 src/shared/data/ 目录结构
2. 实现数据加载器
3. 编写单元测试
4. 验证加载器功能

### 阶段 4: 集成测试 (0.5 天)

1. 验证类型定义与数据加载器的兼容性
2. 验证数据完整性
3. 更新文档
