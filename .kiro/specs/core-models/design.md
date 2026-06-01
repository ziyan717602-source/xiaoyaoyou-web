# Design: core-models

## 概述

本设计将 PSDBase 模块（C# WPF）翻译为 TypeScript，实现所有核心数据模型。采用水平分层策略，翻译工作集中在同一技术层，集中处理 C#→TS 的类型映射和模式转换。设计基于 data-layer 提供的类型定义和 JSON 数据，为后续 game-engine 模块提供基础。

## 边界承诺

**本模块拥有**:
- src/shared/game/utils/ — 工具类（Rueue、Diva、PriorityQueue、UFSet、Algo）
- src/shared/game/card/ — 卡牌类型（Card、Tux、TuxEquip、Luggage、Illusion、Monster、Hero、NPC、Evenement、Rune、Exsp）
- src/shared/game/ — Player、Board
- src/shared/game/skill.ts — Skill、Bless、SKBranch
- src/shared/game/rules/ — Casting、RuleCode
- src/shared/game/nc-action.ts — NCAction
- src/shared/game/operation.ts — Operation
- src/shared/game/lib-group.ts — LibGroup
- src/shared/game/lib/ — 各 Lib 类

**本模块不拥有**:
- 类型定义（属于 data-layer 模块）
- 游戏引擎逻辑（属于 game-engine 模块）
- 卡牌效果实现（属于 card-effects 模块）
- UI 组件（属于 client-ui 模块）
- 网络通信（属于 network-server 模块）

**依赖关系**:
- 上游依赖: data-layer（类型定义和 JSON 数据）
- 下游依赖: game-engine（依赖核心模型）

**可能导致下游重新验证的变更**:
- 修改任何模型类的公共接口（方法签名、属性名）
- 修改 Lib 类的加载接口
- 修改委托类型的签名
- 修改序列化消息格式

## 架构决策

### 1. 翻译模式策略

**决策**: 采用 class 翻译 C# class，保持相同的方法签名和属性结构。

**理由**:
- 保持与原版 C# 代码的结构一致性，降低翻译错误风险
- C# 的属性（getter/setter）直接映射为 TypeScript 的 getter/setter
- C# 的委托（delegate）翻译为 TypeScript 的函数类型（type alias）
- C# 的 readonly 属性翻译为 TypeScript 的 readonly getter

### 2. 委托系统策略

**决策**: 使用函数类型数组模式替代 C# delegate，支持多播委托。

**理由**:
- C# 的 delegate 支持多播（+=），TS 需要数组存储多个处理器
- 保持原版的 Action/Valid/Input 委托链模式
- 每个委托类型定义为独立的 type alias，便于类型安全

### 3. 空对象模式策略

**决策**: 使用 `null` 表示不存在的对象（ghost），而非创建空对象哨兵。

**理由**:
- TS 没有 C# 的 `new Player("鬼", 0, 0, false)` 哨兵模式
- 使用 null 更符合 TS 的空值语义
- 在需要的地方添加 null 检查
- Board 类的 GetOpponent 等方法返回 null 替代 ghost

### 4. 数据加载策略

**决策**: Lib 类从 JSON 数据（data-layer 产物）加载，替代 C# 的 SQLite 读取。

**理由**:
- 保持与 data-layer 的契约：JSON 文件作为数据源
- Lib 类的构造函数接收 JSON 数据数组，进行解析和索引构建
- 提供 Decode/Encode/ListAllSeleable 等查询方法

### 5. 位掩码操作策略

**决策**: 直接移植 C# 的位掩码操作，保持相同的掩码值和操作逻辑。

**理由**:
- 位掩码操作在 TS 中完全等价
- HPEvoMask、ExMask、FyMask 等掩码系统保持一致
- SKBranch 的 MixCode 位掩码组合保持一致

## 组件设计

### 1. 工具类模块 (src/shared/game/utils/)

**文件结构**:
```
src/shared/game/utils/
├── index.ts          # 导出所有工具类
├── rueue.ts          # Rueue<T> 双端队列
├── diva.ts           # Diva 动态 KV 存储
├── priority-queue.ts # PriorityQueue<T> 优先队列
├── ufset.ts          # UFSet<T> 并查集
└── algo.ts           # Algo 静态工具类
```

#### 1.1 Rueue<T> (rueue.ts)

```typescript
export class Rueue<T> {
  private items: T[] = [];

  constructor(collection?: Iterable<T>) {
    if (collection) this.items = [...collection];
  }

  // 尾部入队
  enqueue(value: T): void { this.items.push(value); }
  enqueueRange(values: Iterable<T>): void { this.items.push(...values); }

  // 头部入队（PushBack）
  pushBack(value: T): void { this.items.unshift(value); }
  pushBackRange(values: Iterable<T>): void { this.items.unshift(...values.reverse()); }

  // 头部出队
  dequeue(): T { /* ... */ }
  dequeue(count: number): T[] { /* ... */ }

  // 查看头部
  watch(): T { return this.items[0]; }
  watch(count: number): T[] { return this.items.slice(0, count); }

  // 移除和交集
  remove(value: T): void { /* ... */ }
  intersect(values: Iterable<T>): T[] { /* ... */ }

  // 随机打乱
  shuffle(rng?: () => number): void { /* Fisher-Yates, uses rng if provided */ }

  get count(): number { return this.items.length; }
  [Symbol.iterator](): Iterator<T> { /* ... */ }
}
```

#### 1.2 Diva (diva.ts)

```typescript
export class Diva {
  private store = new Map<string, unknown>();

  constructor(...pairs: unknown[]) { /* 键值对初始化 */ }

  set(key: string, value: unknown): Diva { /* ... */ }
  getInt(key: string): number { /* ... */ }
  getString(key: string): string | null { /* ... */ }
  getBool(key: string): boolean { /* ... */ }
  getUshort(key: string): number { /* ... */ }
  getDiva(key: string): Diva | null { /* ... */ }
  getArray<T>(key: string): T[] | null { /* ... */ }
  getOrSetArray<T>(key: string): T[] { /* ... */ }
  getOrSetDiva(key: string): Diva { /* ... */ }
  getKeys(): string[] { /* ... */ }
  clear(): void { /* ... */ }
  toString(): string { /* ... */ }
}
```

#### 1.3 PriorityQueue<T> (priority-queue.ts)

```typescript
export class PriorityQueue<T> {
  private items: { value: T; priority: number }[] = [];

  enqueue(value: T, priority: number): void { /* 插入排序 */ }
  dequeue(): T { /* 移除最高优先级 */ }
  peek(): T { /* 查看最高优先级 */ }
  get count(): number { return this.items.length; }
}
```

#### 1.4 UFSet<T> (ufset.ts)

```typescript
export class UFSet<T> {
  private parent = new Map<T, T>();
  private rank = new Map<T, number>();

  find(x: T): T { /* 路径压缩 */ }
  union(x: T, y: T): void { /* 按秩合并 */ }
  contains(x: T): boolean { /* ... */ }
  getAll(x: T): T[] { /* ... */ }
}
```

#### 1.5 Algo (algo.ts)

```typescript
export class Algo {
  static shuffle<T>(list: T[], rng?: () => number): void { /* Fisher-Yates, uses rng if provided */ }
  static pickSomeInRandomOrder<T>(items: Iterable<T>, maxCount: number): T[] { /* ... */ }
  static include(object: unknown, ...options: unknown[]): boolean { /* ... */ }
  static substring(content: string, start: number, end: number): string { /* ... */ }
  static splits(line: string, separator: string): string[] { /* ... */ }
  static countItemFromComma(line: string): number { /* ... */ }
  static addToMultiMap<K, V>(dict: Map<K, V[]>, key: K, value: V): void { /* ... */ }
  static plusToMap<K>(dict: Map<K, number>, key: K, delta: number): void { /* ... */ }
  static takeRange<T>(blocks: T[], start: number, end?: number): T[] { /* ... */ }
  static listToString<T>(list: T[]): string { /* ... */ }
  static isSubSet<T>(subset: Iterable<T>, set: Iterable<T>): boolean { /* ... */ }
  static longMessageParse(/* ... */): void { /* ... */ }
}
```

### 2. 卡牌类型模块 (src/shared/game/card/)

**文件结构**:
```
src/shared/game/card/
├── index.ts          # 导出所有卡牌类型
├── card.ts           # Card 静态类 + Genre 枚举
├── tux.ts            # Tux 类
├── tux-equip.ts      # TuxEquip 类
├── luggage.ts        # Luggage 类
├── illusion.ts       # Illusion 类
├── monster.ts        # Monster 类
├── hero.ts           # Hero 类
├── npc.ts            # NPC 类
├── evenement.ts      # Evenement 类
├── rune.ts           # Rune 类
├── exsp.ts           # Exsp 类
├── nmb.ts            # NMB 接口 + NMBLib
└── five-element.ts   # FiveElement 枚举 + 辅助方法
```

#### 2.1 Card 静态类 (card.ts)

```typescript
import { Genre } from '../../types/enums';

export class Card {
  static pickSomeInRandomOrder<T>(items: T[], maxCount: number): T[] { /* ... */ }
  static pickSomeInGivenProbability<T>(items: T[], probability: number): T[] { /* ... */ }
  static level2Pkg(level: number): number[] | null { /* ... */ }
}
```

#### 2.2 Tux 类 (tux.ts)

```typescript
import { Tux as TuxType } from '../../types/tux';

export type ActionDelegate = (player: Player, type: number, fuse: string, argst: string) => void;
export type ValidDelegate = (player: Player, type: number, fuse: string) => boolean;
export type InputDelegate = (player: Player, type: number, fuse: string, prev: string) => string;
// ... 其他委托类型

export class Tux {
  readonly name: string;
  readonly code: string;
  readonly type: TuxType;
  readonly genre: number;
  readonly package: number[];
  readonly range: number[];
  readonly description: string;
  readonly special: Record<string, string>;
  readonly dbSerial: number;

  priorities: number[];
  occurs: string[];
  parasitism: string[];
  targets: string[];
  isTermini: boolean[];

  // 委托属性（使用 getter/setter 模式）
  private _action: ActionDelegate | null = null;
  get action(): ActionDelegate { return this._action ?? Tux.defaultAction; }
  set action(handler: ActionDelegate) { this._action = handler; }
  // ... 其他委托

  isTuxEquip(): boolean { return false; }
  isLinked(inType: number): boolean { /* ... */ }
  isSameType(tux: Tux): boolean { /* ... */ }
  occurString(): string { /* ... */ }

  protected static defaultAction: ActionDelegate = () => {};
  protected static defaultValid: ValidDelegate = () => true;
  // ... 其他默认委托
}
```

#### 2.3 Monster 类 (monster.ts)

```typescript
import { NMB } from './nmb';
import { FiveElement } from './five-element';
import { Diva } from '../utils/diva';

export class Monster implements NMB {
  readonly name: string;
  readonly code: string;
  readonly group: number;
  readonly genre: number;
  readonly element: FiveElement;
  readonly level: MonsterLevel;
  readonly strb: number;
  readonly aglb: number;
  readonly dbSerial: number;

  // 战斗效果属性
  readonly eaOccurs: string[][];
  readonly eaProperties: number[][];
  readonly eaLocks: boolean[][];
  readonly eaOnces: boolean[][];
  readonly eaIsTermini: boolean[][];
  readonly eaHinds: boolean[][];

  // 状态存储
  readonly rom: Diva;
  readonly rfm: Diva;
  readonly ram: Diva;
  teamBursted: boolean;
  readonly seals: Set<string>;

  // SPI 属性（私有，通过方法访问）
  private spiHW: number; /* ... 其他 SPI 字段 */

  isMonster(): boolean { return true; }
  isNpc(): boolean { return false; }
  get str(): number { return this.mSTR >= 0 ? this.mSTR : 0; }
  get agl(): number { return this.mAGL >= 0 ? this.mAGL : 0; }

  parseSpi(spis: string): void { /* ... */ }
  isHarmInvolved(self: boolean, attend: boolean, debut: boolean, win: boolean, round: boolean): boolean { /* ... */ }
  resetRam(): void { /* ... */ }
  resetRfm(): void { /* ... */ }
  resetRom(): void { /* ... */ }
  isLinked(consumeType: number, inType: number): boolean { /* ... */ }
}
```

#### 2.4 Hero 类 (hero.ts)

```typescript
export class Hero {
  readonly name: string;
  readonly avatar: number;
  readonly group: number;
  readonly genre: number;
  readonly gender: string;
  readonly hp: number;
  readonly str: number;
  readonly dex: number;
  readonly skills: string[];
  readonly relatedSkills: string[];
  readonly spouses: string[];
  readonly isomorphic: number[];
  readonly archetype: number;
  readonly antecessor: number;
  pioneer: number;
  ofcode: string;

  // 别名属性
  tokenAlias: string;
  peopleAlias: string;
  playerTarAlias: string;
  exCardsAlias: string;
  awakeAlias: string;
  folderAlias: string;
  guestAlias: string;

  forceChange(field: string, value: unknown): void { /* ... */ }
  setAvailableParam(groupString: string): void { /* ... */ }
}
```

### 3. 玩家模块 (src/shared/game/)

**文件结构**:
```
src/shared/game/
├── player.ts         # Player 类
├── board.ts          # Board 类
├── skill.ts          # Skill、Bless、SKBranch
├── nc-action.ts      # NCAction 类
├── operation.ts      # Operation 类
├── lib-group.ts      # LibGroup 类
├── lib/              # Lib 类
│   ├── hero-lib.ts
│   ├── tux-lib.ts
│   ├── monster-lib.ts
│   ├── npc-lib.ts
│   ├── evenement-lib.ts
│   ├── skill-lib.ts
│   ├── operation-lib.ts
│   ├── nc-action-lib.ts
│   ├── rune-lib.ts
│   └── exsp-lib.ts
└── rules/            # 规则系统
    ├── casting.ts    # Casting 子类
    └── rule-code.ts  # RuleCode 常量
```

#### 3.1 Player 类 (player.ts)

```typescript
import { Diva } from './utils/diva';

export class Player {
  // 账户信息
  readonly name: string;
  readonly avatar: number;
  readonly uid: number;
  aUid: number;
  hopeTeam: number;

  // 属性
  selectHero: number;
  team: number;
  readonly isReal: boolean;
  gender: string;

  // HP 和战斗属性
  hp: number;
  hpBase: number;
  private mSTRa: number; private mSTRb: number; private mSTRc: number;
  strh: number;
  private mDEXa: number; private mDEXb: number; private mDEXc: number;
  dexh: number;
  strI: number; dexI: number;
  tuxLimit: number;

  // 卡牌槽位
  readonly tux: number[];
  armor: number;
  weapon: number;
  trove: number;
  exEquip: number;
  readonly exCards: number[];
  readonly fakeq: Map<number, string>;
  readonly pets: number[];
  readonly escue: number[];

  // 状态
  isAlive: boolean;
  nineteen: boolean;
  private _isTared: boolean;
  immobilized: boolean;
  loved: boolean;
  petDisabled: boolean;
  restZP: number;
  exMask: number;
  fyMask: number;
  readonly runes: number[];
  readonly exSpouses: string[];

  // 卡牌禁用系统（位掩码）
  private cardDisabled: Map<string, number>;
  private cardEffDisabled: Map<string, number>;
  private silence: Set<string>;

  // 记忆系统
  tokenAwake: boolean;
  tokenCount: number;
  tokenTars: number[];
  tokenExcl: string[];
  tokenFold: number[];
  readonly rom: Diva;
  readonly rfm: Diva;
  readonly ram: Diva;
  readonly coss: Stack<number>;
  guardian: number;

  // 价格系统
  readonly cz01PriceDict: Map<string, string[]>;

  // 计算属性
  get str(): number { return this.sdCSet ? this.strC : (this.sdASet ? this.strA : this.strB); }
  get dex(): number { return this.sdCSet ? this.dexC : (this.sdASet ? this.dexA : this.dexB); }
  get oppTeam(): number { return 3 - this.team; }
  get isTared(): boolean { return this._isTared && this.uid !== 0 && this.isAlive && this.isReal; }

  // 卡牌操作方法
  removeCard(card: number, discards: number[]): boolean { /* ... */ }
  hasAnyCards(): boolean { /* ... */ }
  hasAnyEquips(): boolean { /* ... */ }
  hasCard(ut: number): boolean { /* ... */ }
  listOutAllCards(): number[] { /* ... */ }
  getSlotCapacity(tuxType: TuxType): number { /* ... */ }
  getCurrentEquipCount(tuxType: TuxType): number { /* ... */ }

  // 重置方法
  resetStatus(): void { /* ... */ }
  resetRam(hero?: number): void { /* ... */ }
  resetRfm(hero?: number): void { /* ... */ }
  resetTokens(): void { /* ... */ }
  resetRom(board: Board, hero?: number): void { /* ... */ }
  initFromHero(hero: Hero, reset: boolean, sdASet: boolean, sdCSet: boolean): void { /* ... */ }

  // 静态工厂
  static warriors(name: string, extUid: number, team: number, str: number, dex: number): Player { /* ... */ }

  // 内部类
  static playerCompare = { /* IEqualityComparer<Player> */ };
}
```

#### 3.2 Board 类 (board.ts)

```typescript
import { Rueue } from './utils/rueue';

export class Board {
  readonly garden: Map<number, Player>;
  private mRounder: Player | null;
  private mHinder: Player | null;
  private mSupporter: Player | null;
  private mHorn: Player | null;
  readonly ghost: Player;

  roundIN: string;
  supportSucc: boolean;
  hinderSucc: boolean;
  readonly posHinders: string[];
  readonly posSupporters: string[];
  allowNoSupport: boolean;
  allowNoHinder: boolean;
  readonly rDrums: Map<Player, boolean>;
  readonly oDrums: Map<Player, boolean>;
  clockWised: boolean;
  inCampaign: boolean;
  poolEnabled: boolean;
  playerPoolEnabled: boolean;
  isMonsterDebut: boolean;
  rPool: number;
  oPool: number;
  readonly rPoolGain: Map<string, number>;
  readonly oPoolGain: Map<string, number>;
  isBattleWin: boolean;
  poolDelta: number;
  mon1Catchable: boolean;
  mon2Catchable: boolean;
  monster1: number;
  monster2: number;
  mon1From: number;
  readonly wang: number[];
  battler: NMB | null;
  eve: number;
  useCardRound: number;
  fightTangled: boolean;
  diceValue: number;
  readonly pZone: number[];
  readonly csPets: string[];
  readonly csEquips: string[];

  // 牌堆
  tuxPiles: Rueue<number>;
  evePiles: Rueue<number>;
  monPiles: Rueue<number>;
  tuxDises: number[];
  eveDises: number[];
  monDises: number[];
  heroPiles: Rueue<number>;
  restNpcPiles: Rueue<number>;
  restMonPiles: Rueue<number>;
  heroDises: number[];
  restNpcDises: number[];
  restMonDises: number[];

  // 禁止/保护
  readonly bannedHero: number[];
  readonly protectedTux: number[];
  readonly pendingTux: Rueue<string>;
  readonly petProtectedPlayer: number[];
  readonly escueBanned: Set<string>;
  readonly silence: Set<string>;
  readonly jumpTable: Map<string, string>;

  // 分数
  finalAkaScore: number;
  finalAoScore: number;

  // 玩家查找
  get rounder(): Player { /* ... */ }
  set rounder(player: Player | null) { /* ... */ }
  get opponent(): Player { /* ... */ }
  getOpponent(player: Player): Player { /* ... */ }
  getFacer(player: Player): Player { /* ... */ }
  isAttendWar(player: Player): boolean { /* ... */ }
  isAttendWarSucc(player: Player): boolean { /* ... */ }
  getAllAttenders(): Player[] { /* ... */ }

  // 战斗计算
  calculateRPool(): number { /* ... */ }
  calculateOPool(): number { /* ... */ }
  isRounderBattleWin(): boolean { /* ... */ }
  cleanBattler(): void { /* ... */ }

  // 玩家排序
  orderedPlayer(start?: number): number[] { /* ... */ }
  getNextPlayer(rounder: number): number { /* ... */ }
  getPrevPlayer(rounder: number): number { /* ... */ }
  reOrderedPlayers(players: Iterable<number>): number[] { /* ... */ }

  // 序列化
  toSerialMessage(tuple: LibGroup): string { /* ... */ }
  generateSerialFieldMessage(): string { /* ... */ }
  generatePrivateMessage(ut: number): string { /* ... */ }
}

#### 3.3 LibGroup 类 (lib-group.ts)

```typescript
import { HeroLib } from './lib/hero-lib';
import { TuxLib } from './lib/tux-lib';
import { MonsterLib } from './lib/monster-lib';
import { NPCLib } from './lib/npc-lib';
import { EvenementLib } from './lib/evenement-lib';
import { SkillLib } from './lib/skill-lib';
import { OperationLib } from './lib/operation-lib';
import { NCActionLib } from './lib/nc-action-lib';
import { RuneLib } from './lib/rune-lib';
import { ExspLib } from './lib/exsp-lib';

export interface LibGroupData {
  heroData: unknown[];
  tuxData: unknown[];
  monsterData: unknown[];
  npcData: unknown[];
  eveData: unknown[];
  skillData: unknown[];
  opsData: unknown[];
  njData: unknown[];
  runeData: unknown[];
  exspData: unknown[];
}

export class LibGroup {
  readonly hl: HeroLib;
  readonly tl: TuxLib;
  readonly ml: MonsterLib;
  readonly nl: NPCLib;
  readonly el: EvenementLib;
  readonly sl: SkillLib;
  readonly ol: OperationLib;
  readonly nl2: NCActionLib;
  readonly rl: RuneLib;
  readonly xl: ExspLib;

  private initialized: boolean;

  constructor() {
    this.hl = new HeroLib([]);
    this.tl = new TuxLib([]);
    this.ml = new MonsterLib([]);
    this.nl = new NPCLib([]);
    this.el = new EvenementLib([]);
    this.sl = new SkillLib([]);
    this.ol = new OperationLib([]);
    this.nl2 = new NCActionLib([]);
    this.rl = new RuneLib([]);
    this.xl = new ExspLib([]);
    this.initialized = false;
  }

  // 初始化所有 Lib（从 data-layer 加载的 JSON 数据）
  init(data: LibGroupData): void {
    this.hl = new HeroLib(data.heroData);
    this.tl = new TuxLib(data.tuxData);
    this.ml = new MonsterLib(data.monsterData);
    this.nl = new NPCLib(data.npcData);
    this.el = new EvenementLib(data.eveData);
    this.sl = new SkillLib(data.skillData);
    this.ol = new OperationLib(data.opsData);
    this.nl2 = new NCActionLib(data.njData);
    this.rl = new RuneLib(data.runeData);
    this.xl = new ExspLib(data.exspData);
    this.initialized = true;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}
```
```

### 4. 技能和规则模块

#### 4.1 Skill 类 (skill.ts)

```typescript
export type ActionDelegate = (player: Player, type: number, fuse: string, argst: string) => void;
export type ValidDelegate = (player: Player, type: number, fuse: string) => boolean;
export type InputDelegate = (player: Player, type: number, fuse: string, prev: string) => string;
export type EncryptDelegate = (args: string) => string;

export class Skill {
  readonly name: string;
  readonly code: string;
  occurs: string[];
  priorities: number[];
  isOnce: boolean[];
  isTermini: boolean[];
  lock: (boolean | null)[];
  isHind: boolean[];
  isChange: boolean;
  isRestrict: boolean;
  parasitism: string[];
  descripe: string;

  // 委托
  private _action: ActionDelegate | null = null;
  get action(): ActionDelegate { return this._action ?? Skill.defaultAction; }
  set action(handler: ActionDelegate) { this._action = handler; }
  // ... Valid, Input, Encrypt

  get isBK(): boolean { return false; }
  isLinked(inType: number): boolean { /* ... */ }
  forceChange(field: string, value: unknown): void { /* ... */ }

  protected static defaultAction: ActionDelegate = () => {};
  protected static defaultValid: ValidDelegate = () => true;
  protected static defaultInput: InputDelegate = () => '';
  protected static defaultEncrypt: EncryptDelegate = (a) => a;
}

export class Bless extends Skill {
  get isBK(): boolean { return true; }

  bkValid: (player: Player, type: number, fuse: string, owner: number) => boolean;
  // ... 默认实现
}
```

#### 4.2 SKBranch 类 (skill.ts)

```typescript
export class SKBranch {
  occur: string;
  priority: number;
  once: boolean;
  serial: boolean;
  hind: boolean;
  demiurgic: boolean;
  lock: boolean | null;

  get linked(): boolean { return this.occur.includes('&'); }

  get mixCode(): number { /* 位掩码组合 */ }
  set mixCode(value: number) { /* 位掩码解析 */ }

  static parseFromStrings(occurStr: string, priorityStr: string, mixCodeStr: string): SKBranch[] { /* ... */ }
  static parseFromString(str: string): SKBranch[] { /* ... */ }
}
```

### 5. 规则模块 (src/shared/game/rules/)

#### 5.1 Casting 类 (casting.ts)

```typescript
export abstract class Casting {
  static readonly playerCapacity = 6;
}

export class CastingPick extends Casting {
  readonly xuan: Map<number, number[]>;
  readonly huan: Map<number, number[]>;
  readonly ding: Map<number, number>;

  init(ut: number, xuan: number[], huan?: number[]): void { /* ... */ }
  pick(ut: number, which: number): boolean { /* ... */ }
  switch(ut: number, which: number): number { /* ... */ }
  toMessage(ut: number): string { /* ... */ }
}

// CastingTable, CastingPublic, CastingCongress 类似结构
```

#### 5.2 RuleCode 类 (rule-code.ts)

```typescript
export class RuleCode {
  static readonly DEF_CODE = 0x0;
  static readonly HOPE_NO = 0x2;
  static readonly HOPE_YES = 0x4;
  // ... 其他常量

  static castMode(name: string): number { /* ... */ }
  static castMode(mode: number): string { /* ... */ }
}
```

### 6. Lib 模块 (src/shared/game/lib/)

#### 6.1 数据加载模式

每个 Lib 类遵循统一的加载模式：

```typescript
export class HeroLib {
  private dicts: Map<number, Hero>;

  constructor(data: HeroData[]) {
    this.dicts = new Map();
    for (const item of data) {
      const hero = new Hero(/* 从 data 构建 */);
      this.dicts.set(hero.avatar, hero);
    }
  }

  get size(): number { return this.dicts.size; }
  instanceHero(code: number): Hero | null { return this.dicts.get(code) ?? null; }
  listAllHeros(groups: number): Hero[] { /* ... */ }
  listAllSeleable(groups: number): Hero[] { /* ... */ }
}
```

## 文件结构计划

```
src/shared/game/
├── utils/
│   ├── index.ts
│   ├── rueue.ts
│   ├── diva.ts
│   ├── priority-queue.ts
│   ├── ufset.ts
│   └── algo.ts
├── card/
│   ├── index.ts
│   ├── card.ts
│   ├── tux.ts
│   ├── tux-equip.ts
│   ├── luggage.ts
│   ├── illusion.ts
│   ├── monster.ts
│   ├── hero.ts
│   ├── npc.ts
│   ├── evenement.ts
│   ├── rune.ts
│   ├── exsp.ts
│   ├── nmb.ts
│   └── five-element.ts
├── player.ts
├── board.ts
├── skill.ts
├── nc-action.ts
├── operation.ts
├── lib-group.ts
├── lib/
│   ├── index.ts
│   ├── hero-lib.ts
│   ├── tux-lib.ts
│   ├── monster-lib.ts
│   ├── npc-lib.ts
│   ├── evenement-lib.ts
│   ├── skill-lib.ts
│   ├── operation-lib.ts
│   ├── nc-action-lib.ts
│   ├── rune-lib.ts
│   └── exsp-lib.ts
└── rules/
    ├── index.ts
    ├── casting.ts
    └── rule-code.ts
```

## 测试策略

### 1. 工具类测试

- Rueue：验证入队/出队顺序、批量操作、随机打乱、迭代器
- Diva：验证键值存取、类型安全、懒加载、null 删除
- PriorityQueue：验证优先级排序、空队列处理
- UFSet：验证路径压缩、按秩合并、集合查询
- Algo：验证各工具方法的边界情况

### 2. 卡牌类型测试

- Tux：验证构造、委托绑定、类型判断
- TuxEquip/Luggage/Illusion：验证继承链、装备属性
- Monster：验证 SPI 解析、五行属性、等级、内存重置
- Hero：验证属性、别名、版本兼容 ForceChange
- NPC：验证属性、技能列表
- Evenement：验证 SPI 检测、事件属性
- Rune：验证委托绑定、锁状态

### 3. 核心模型测试

- Player：验证卡牌操作、禁用系统、状态重置、价格系统
- Board：验证玩家查找、战斗计算、序列化、牌堆操作
- Skill/Bless/SKBranch：验证委托链、BK 判断、MixCode 位掩码

### 4. 规则系统测试

- Casting 子类：验证选将流程、消息序列化
- RuleCode：验证模式转换

### 5. Lib 测试

- 各 Lib 类：验证 JSON 数据加载、Decode/Encode/ListAllSeleable
- LibGroup：验证聚合初始化

## 风险与缓解

### 1. C# 委托多播语义差异

**风险**: C# delegate 支持多播和返回值链，TS 函数数组需要手动管理执行顺序和返回值。

**缓解**:
- 委托类型统一使用数组模式
- 返回值链通过遍历数组处理
- 在翻译文档中明确委托执行语义

### 2. 空对象模式差异

**风险**: C# 使用 ghost 哨兵对象，TS 使用 null，需要在所有引用处添加 null 检查。

**缓解**:
- Board 类的 ghost 属性保持为 null
- 在 GetOpponent 等方法中返回 null
- 下游 game-engine 需要适配 null 检查

### 3. 泛型类型擦除

**风险**: TS 的泛型在运行时被擦除，可能导致类型不安全。

**缓解**:
- 使用类型守卫（type guard）在运行时检查
- 关键路径添加类型断言
- 单元测试覆盖类型边界

## 实现计划

### 阶段 1: 工具类 (0.5 天)
1. 实现 Rueue<T>
2. 实现 Diva
3. 实现 PriorityQueue<T>
4. 实现 UFSet<T>
5. 实现 Algo
6. 编写工具类单元测试

### 阶段 2: 卡牌基础类型 (1 天)
1. 实现 FiveElement 枚举 + 辅助方法
2. 实现 Card 静态类
3. 实现 NMB 接口 + NMBLib
4. 实现 Tux 类
5. 实现 TuxEquip 类
6. 实现 Luggage 类
7. 实现 Illusion 类
8. 编写卡牌类型单元测试

### 阶段 3: 实体卡牌 (1 天)
1. 实现 Monster 类
2. 实现 Hero 类
3. 实现 NPC 类
4. 实现 Evenement 类
5. 实现 Rune 类
6. 实现 Exsp 类
7. 编写实体卡牌单元测试

### 阶段 4: Player 和 Board (1 天)
1. 实现 Player 类
2. 实现 Board 类
3. 编写 Player 单元测试
4. 编写 Board 单元测试

### 阶段 5: 技能和规则 (1 天)
1. 实现 Skill、Bless、SKBranch
2. 实现 Casting 子类
3. 实现 RuleCode
4. 实现 NCAction、Operation
5. 编写技能和规则单元测试

### 阶段 6: Lib 类 (1 天)
1. 实现所有 Lib 类
2. 实现 LibGroup
3. 编写 Lib 单元测试

### 阶段 7: 集成测试和导出 (0.5 天)
1. 编写集成测试
2. 创建模块导出 index.ts
3. 验证所有模块可编译
