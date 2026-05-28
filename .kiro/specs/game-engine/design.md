# Design: game-engine

## 概述

本设计将 PSDGamepkg 模块（C# WPF，XI.cs + XIG.cs + XIR.cs，共 8,000+ 行）翻译为 TypeScript，实现事件驱动的 G-Loop 系统和回合状态机。设计基于 core-models 提供的核心数据模型，为下游 card-effects 和 game-flow 模块提供基础。

## 边界承诺

**本模块拥有**:
- src/shared/game/engine/ — 游戏引擎核心
- src/shared/game/engine/event-bus.ts — 事件总线
- src/shared/game/engine/skill-registry.ts — 技能注册表
- src/shared/game/engine/g-message.ts — G-Loop 消息类型
- src/shared/game/engine/g-loop.ts — G-Loop 核心
- src/shared/game/engine/round.ts — 回合状态机
- src/shared/game/engine/xi.ts — 游戏初始化
- src/shared/game/engine/select-hero.ts — 选将系统
- src/shared/game/engine/artiad/ — 动作解析器

**本模块不拥有**:
- 核心数据模型（属于 core-models 模块）
- 卡牌效果实现（属于 card-effects 模块）
- 游戏流程集成（属于 game-flow 模块）
- 网络通信（属于 network-server 模块）
- UI 组件（属于 client-ui 模块）

**依赖关系**:
- 上游依赖: core-models（Board、Player、Skill、Tux、Monster、NPC、Evenement、LibGroup、Casting 等）
- 下游依赖: card-effects（依赖事件系统注册效果）、game-flow（依赖回合管理）

**可能导致下游重新验证的变更**:
- 修改事件消息格式（GMessage 结构）
- 修改回合阶段定义（RoundPhase 枚举）
- 修改技能注册表接口（SkillRegistry 公共 API）
- 修改游戏初始化流程（XI.Run 签名）

## 架构决策

### 1. 事件驱动架构策略

**决策**: 使用发布-订阅模式实现事件系统，替代 C# 的反射注册机制。

**理由**:
- TypeScript 没有 C# 的反射能力（`GetType().GetMethod()`）
- 发布-订阅模式更符合 TypeScript 的函数式编程风格
- 事件总线提供解耦的组件通信机制
- 便于测试和调试（可以 mock 事件处理器）

### 2. 异步执行策略

**决策**: 使用 async/await + 状态机替代 C# 的线程管理。

**理由**:
- TypeScript 的单线程模型无法使用 C# 的多线程
- async/await 提供清晰的异步控制流
- 状态机模式可以实现复杂的执行流程控制
- 便于处理网络延迟和用户交互

### 3. 消息协议兼容策略

**决策**: 保持原版字符串命令协议格式，内部转换为类型安全的消息对象。

**理由**:
- 保持与原版的兼容性，便于移植卡牌效果
- 内部使用类型安全的消息对象，提高开发效率
- 序列化/反序列化层隔离协议细节
- 便于未来协议升级（如 JSON 格式）

### 4. 技能注册表策略

**决策**: 构建时静态注册，运行时动态匹配。

**理由**:
- 构建时从 Skill/Tux/Monster/NPC/Evenement 提取注册信息
- 运行时按消息类型快速查找匹配的处理器
- 避免运行时反射开销
- 便于调试和日志记录

### 5. 回合状态机策略

**决策**: 使用有限状态机（FSM）模式实现回合管理。

**理由**:
- 回合阶段转换是典型的 FSM 场景
- 状态机模式提供清晰的阶段转换规则
- 便于实现阶段转换的条件检查和回滚
- 便于测试和调试（可以 mock 状态转换）

## 组件设计

### 1. 事件总线模块 (src/shared/game/engine/event-bus.ts)

**文件结构**:
```
src/shared/game/engine/
├── index.ts              # 导出所有引擎组件
├── event-bus.ts          # 事件总线核心
├── skill-registry.ts     # 技能注册表
├── g-message.ts          # G-Loop 消息类型
├── g-loop.ts             # G-Loop 核心
├── round.ts              # 回合状态机
├── xi.ts                 # 游戏初始化
├── select-hero.ts        # 选将系统
└── artiad/               # 动作解析器
    ├── index.ts
    ├── parser.ts         # 动作解析器
    └── executor.ts       # 动作执行器
```

#### 1.1 EventBus 类 (event-bus.ts)

```typescript
import { SKBranch } from '../skill';

export type EventHandler = (data: unknown) => void | boolean | Promise<void | boolean>;

export interface EventListener {
  handler: EventHandler;
  priority: number;
  once: boolean;
  source: string;  // 来源标识（如 'skill:SK01'、'tux:JP06'）
}

export interface EventResult {
  handled: boolean;
  cancelled: boolean;
  results: unknown[];
}

export class EventBus {
  private listeners: Map<string, EventListener[]>;
  private processing: boolean;
  private queue: Array<{ event: string; data: unknown; resolve: (result: EventResult) => void }>;

  constructor() {
    this.listeners = new Map();
    this.processing = false;
    this.queue = [];
  }

  // 注册事件监听器
  on(event: string, handler: EventHandler, priority: number = 0, source: string = ''): void {
    // 按优先级插入
  }

  // 注册一次性监听器
  once(event: string, handler: EventHandler, priority: number = 0, source: string = ''): void {
    // 设置 once 标志
  }

  // 移除事件监听器
  off(event: string, handler: EventHandler): void {
    // 从监听器列表中移除
  }

  // 移除来源的所有监听器
  offBySource(source: string): void {
    // 按来源标识批量移除
  }

  // 触发事件（同步）
  emit(event: string, data?: unknown): EventResult {
    // 按优先级执行所有监听器
    // 支持 stopPropagation 取消后续执行
  }

  // 触发事件（异步）
  async emitAsync(event: string, data?: unknown): Promise<EventResult> {
    // 异步版本，支持 async 处理器
  }

  // 清除所有监听器
  clear(): void {
    this.listeners.clear();
  }

  // 获取事件的监听器数量
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}
```

#### 1.2 EventMessage 接口

```typescript
export interface EventMessage {
  type: string;           // 消息类型（如 'G0OH'）
  sender: number;         // 发送者 UID
  receiver: number;       // 接收者 UID（0 表示全体）
  args: string[];         // 消息参数（解析后的数组）
  timestamp: number;      // 时间戳
  cancelled: boolean;     // 是否已取消
}

export interface EventContext {
  message: EventMessage;
  board: Board;
  sender: Player;
  receiver: Player | null;
  registry: SkillRegistry;
}
```

### 2. 技能注册表模块 (src/shared/game/engine/skill-registry.ts)

#### 2.1 SkillRegistry 类

```typescript
import { Skill, Bless, SKBranch } from '../skill';
import { Tux } from '../card/tux';
import { Monster } from '../card/monster';
import { NPC } from '../card/npc';
import { Evenement } from '../card/evenement';
import { EventBus, EventHandler } from './event-bus';

export interface RegisteredHandler {
  handler: EventHandler;
  branch: SKBranch;
  source: string;         // 来源标识
  sourceType: 'skill' | 'tux' | 'monster' | 'npc' | 'evenement';
  sourceCode: string;     // 来源编码（如 'SK01'、'JP06'）
}

export class SkillRegistry {
  private eventBus: EventBus;
  private handlers: Map<string, RegisteredHandler[]>;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.handlers = new Map();
  }

  // 从 Skill 对象注册
  registerSkill(skill: Skill, handler: EventHandler): void {
    // 提取 SKBranch 信息
    // 按 occur 字符串注册到 EventBus
  }

  // 从 Tux 对象注册
  registerTux(tux: Tux, handler: EventHandler): void {
    // 提取 occurs/priorities 信息
    // 按 occur 字符串注册到 EventBus
  }

  // 从 Monster 对象注册
  registerMonster(monster: Monster, handler: EventHandler): void {
    // 提取 eaOccurs/eaProperties 信息
    // 按 occur 字符串注册到 EventBus
  }

  // 从 NPC 对象注册
  registerNPC(npc: NPC, handler: EventHandler): void {
    // 提取 skills 信息
    // 按 occur 字符串注册到 EventBus
  }

  // 从 Evenement 对象注册
  registerEvenement(eve: Evenement, handler: EventHandler): void {
    // 提取 occurs/priorties 信息
    // 按 occur 字符串注册到 EventBus
  }

  // 构建完整的技能注册表
  buildFromLibGroup(libGroup: LibGroup): void {
    // 遍历所有 Lib，注册所有技能
  }

  // 按消息类型查找匹配的处理器
  findHandlers(messageType: string, team: number): RegisteredHandler[] {
    // 按 occur 匹配
    // 按优先级排序
  }

  // 清除所有注册
  clear(): void {
    this.handlers.clear();
    this.eventBus.clear();
  }
}
```

#### 2.2 Occur 匹配规则

```typescript
// Occur 字符串格式：G{team}O{type}
// team: 0=全体, 1=红方, 2=蓝方
// type: H=效果, T=目标, P=操作, O=其他

// 匹配规则：
// 'G0OH' 匹配所有全体效果消息
// 'G1OH' 匹配红方效果消息
// 'G2OH' 匹配蓝方效果消息
// 'G0OT' 匹配全体目标消息
// 以此类推

export function matchOccur(occurPattern: string, messageType: string): boolean {
  // 解析 occur 模式
  // 匹配消息类型
  // 支持通配符和条件匹配
}
```

### 3. G-Loop 消息类型模块 (src/shared/game/engine/g-message.ts)

#### 3.1 消息类型定义

```typescript
// G-Loop 消息类型枚举
export enum GMessageType {
  // 全体消息
  G0OH = 'G0OH',  // 全体效果
  G0OT = 'G0OT',  // 全体目标
  G0OP = 'G0OP',  // 全体操作
  G0OO = 'G0OO',  // 全体其他

  // 红方消息
  G1OH = 'G1OH',  // 红方效果
  G1OT = 'G1OT',  // 红方目标
  G1OP = 'G1OP',  // 红方操作
  G1OO = 'G1OO',  // 红方其他

  // 蓝方消息
  G2OH = 'G2OH',  // 蓝方效果
  G2OT = 'G2OT',  // 蓝方目标
  G2OP = 'G2OP',  // 蓝方操作
  G2OO = 'G2OO',  // 蓝方其他
}
```

#### 3.2 GMessage 接口

```typescript
export interface GMessage {
  type: GMessageType;
  sender: number;      // 发送者 UID
  receiver: number;    // 接收者 UID（0 表示全体）
  args: string[];      // 消息参数
  timestamp: number;
  cancelled: boolean;
  source: string;      // 来源标识

  // 序列化为字符串协议
  toString(): string;

  // 从字符串协议反序列化
  static fromString(str: string): GMessage;

  // 克隆消息
  clone(): GMessage;
}
```

#### 3.3 SimpleGMessage 类

```typescript
export class SimpleGMessage implements GMessage {
  type: GMessageType;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
  source: string;

  constructor(type: GMessageType, sender: number, receiver: number, args: string[]) {
    this.type = type;
    this.sender = sender;
    this.receiver = receiver;
    this.args = args;
    this.timestamp = Date.now();
    this.cancelled = false;
    this.source = '';
  }

  toString(): string {
    // 格式: "G0OH,1,2,3,1"
    return `${this.type},${this.sender},${this.receiver},${this.args.join(',')}`;
  }

  static fromString(str: string): SimpleGMessage {
    // 解析字符串格式
    const parts = str.split(',');
    return new SimpleGMessage(
      parts[0] as GMessageType,
      parseInt(parts[1]),
      parseInt(parts[2]),
      parts.slice(3)
    );
  }

  clone(): SimpleGMessage {
    const msg = new SimpleGMessage(this.type, this.sender, this.receiver, [...this.args]);
    msg.source = this.source;
    return msg;
  }
}
```

#### 3.4 InnerGMessage 类

```typescript
// 内部消息，不需要网络传输
export class InnerGMessage implements GMessage {
  type: GMessageType;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
  source: string;

  // 内部消息使用对象格式，不序列化为字符串
  data: Record<string, unknown>;

  constructor(type: GMessageType, data: Record<string, unknown>) {
    this.type = type;
    this.sender = 0;
    this.receiver = 0;
    this.args = [];
    this.timestamp = Date.now();
    this.cancelled = false;
    this.source = '';
    this.data = data;
  }

  toString(): string {
    // 内部消息不序列化
    return '';
  }

  clone(): InnerGMessage {
    return new InnerGMessage(this.type, { ...this.data });
  }
}
```

### 4. G-Loop 核心模块 (src/shared/game/engine/g-loop.ts)

#### 4.1 GLoop 类

```typescript
import { EventBus, EventResult } from './event-bus';
import { GMessage, GMessageType } from './g-message';
import { Board } from '../board';
import { Player } from '../player';

export interface GLoopConfig {
  maxQueueSize: number;
  processTimeout: number;  // 毫秒
  enableLogging: boolean;
}

export class GLoop {
  private eventBus: EventBus;
  private board: Board;
  private config: GLoopConfig;
  private queue: GMessage[];
  private running: boolean;
  private processing: boolean;

  constructor(eventBus: EventBus, board: Board, config?: Partial<GLoopConfig>) {
    this.eventBus = eventBus;
    this.board = board;
    this.config = {
      maxQueueSize: 1000,
      processTimeout: 5000,
      enableLogging: true,
      ...config,
    };
    this.queue = [];
    this.running = false;
    this.processing = false;
  }

  // 发送消息到队列
  send(message: GMessage): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Message queue overflow');
    }
    this.queue.push(message);
    this.processQueue();
  }

  // 发送消息并等待响应
  async sendAsync(message: GMessage): Promise<EventResult> {
    return new Promise((resolve) => {
      this.send(message);
      // 使用事件总线等待响应
      const handler = (result: EventResult) => {
        resolve(result);
        return false;  // 一次性处理器
      };
      this.eventBus.once(`response:${message.type}`, handler);
    });
  }

  // 处理消息队列
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.running) {
      const message = this.queue.shift()!;
      await this.processMessage(message);
    }

    this.processing = false;
  }

  // 处理单条消息
  private async processMessage(message: GMessage): Promise<void> {
    if (this.config.enableLogging) {
      console.log(`[GLoop] Processing: ${message.toString()}`);
    }

    // 预处理
    this.preProcess(message);

    // 分发到事件总线
    const result = this.eventBus.emit(message.type, {
      message,
      board: this.board,
      sender: this.board.garden.get(message.sender) ?? null,
      receiver: message.receiver === 0
        ? null
        : this.board.garden.get(message.receiver) ?? null,
    });

    // 后处理
    this.postProcess(message, result);
  }

  // 预处理
  private preProcess(message: GMessage): void {
    // 参数校验、格式转换
  }

  // 后处理
  private postProcess(message: GMessage, result: EventResult): void {
    // 状态更新、日志记录
  }

  // 启动主循环
  start(): void {
    this.running = true;
    this.processQueue();
  }

  // 停止主循环
  stop(): void {
    this.running = false;
  }

  // 暂停主循环
  pause(): void {
    this.running = false;
  }

  // 恢复主循环
  resume(): void {
    this.running = true;
    this.processQueue();
  }

  // 获取队列长度
  get queueLength(): number {
    return this.queue.length;
  }

  // 清空队列
  clearQueue(): void {
    this.queue = [];
  }
}
```

### 5. 回合状态机模块 (src/shared/game/engine/round.ts)

#### 5.1 RoundPhase 枚举

```typescript
export enum RoundPhase {
  // 准备阶段
  PREPARE = 'PREPARE',

  // 回合阶段
  ROUND_START = 'ROUND_START',
  DRAW_PHASE = 'DRAW_PHASE',
  MAIN_PHASE = 'MAIN_PHASE',
  BATTLE_PHASE = 'BATTLE_PHASE',
  END_PHASE = 'END_PHASE',
  ROUND_END = 'ROUND_END',

  // 特殊阶段
  EVENT_PHASE = 'EVENT_PHASE',
  MONSTER_DEBUT = 'MONSTER_DEBUT',
  PET_ACTION = 'PET_ACTION',
}

// 阶段转换规则
export const PHASE_TRANSITIONS: Record<RoundPhase, RoundPhase[]> = {
  [RoundPhase.PREPARE]: [RoundPhase.ROUND_START],
  [RoundPhase.ROUND_START]: [RoundPhase.DRAW_PHASE],
  [RoundPhase.DRAW_PHASE]: [RoundPhase.MAIN_PHASE],
  [RoundPhase.MAIN_PHASE]: [RoundPhase.BATTLE_PHASE, RoundPhase.EVENT_PHASE],
  [RoundPhase.BATTLE_PHASE]: [RoundPhase.END_PHASE, RoundPhase.MONSTER_DEBUT],
  [RoundPhase.EVENT_PHASE]: [RoundPhase.MAIN_PHASE, RoundPhase.END_PHASE],
  [RoundPhase.MONSTER_DEBUT]: [RoundPhase.BATTLE_PHASE, RoundPhase.PET_ACTION],
  [RoundPhase.PET_ACTION]: [RoundPhase.BATTLE_PHASE],
  [RoundPhase.END_PHASE]: [RoundPhase.ROUND_END],
  [RoundPhase.ROUND_END]: [RoundPhase.ROUND_START, RoundPhase.PREPARE],
};
```

#### 5.2 RoundManager 类

```typescript
import { RoundPhase, PHASE_TRANSITIONS } from './round';
import { Board } from '../board';
import { Player } from '../player';
import { EventBus } from './event-bus';

export interface RoundState {
  phase: RoundPhase;
  roundNumber: number;
  currentRounder: Player;
  previousPhase: RoundPhase | null;
  phaseData: Record<string, unknown>;
}

export class RoundManager {
  private board: Board;
  private eventBus: EventBus;
  private state: RoundState;
  private phaseHandlers: Map<RoundPhase, (state: RoundState) => Promise<void>>;

  constructor(board: Board, eventBus: EventBus) {
    this.board = board;
    this.eventBus = eventBus;
    this.state = {
      phase: RoundPhase.PREPARE,
      roundNumber: 0,
      currentRounder: board.rounder,
      previousPhase: null,
      phaseData: {},
    };
    this.phaseHandlers = new Map();
    this.registerPhaseHandlers();
  }

  // 注册阶段处理器
  private registerPhaseHandlers(): void {
    this.phaseHandlers.set(RoundPhase.ROUND_START, this.onRoundStart.bind(this));
    this.phaseHandlers.set(RoundPhase.DRAW_PHASE, this.onDrawPhase.bind(this));
    this.phaseHandlers.set(RoundPhase.MAIN_PHASE, this.onMainPhase.bind(this));
    this.phaseHandlers.set(RoundPhase.BATTLE_PHASE, this.onBattlePhase.bind(this));
    this.phaseHandlers.set(RoundPhase.END_PHASE, this.onEndPhase.bind(this));
    this.phaseHandlers.set(RoundPhase.ROUND_END, this.onRoundEnd.bind(this));
  }

  // 转换到下一阶段
  async transition(nextPhase: RoundPhase): Promise<void> {
    // 验证转换是否合法
    if (!this.canTransition(nextPhase)) {
      throw new Error(`Invalid transition: ${this.state.phase} -> ${nextPhase}`);
    }

    // 触发阶段转换前事件
    this.eventBus.emit('phase:before', {
      from: this.state.phase,
      to: nextPhase,
      state: this.state,
    });

    // 保存上一阶段
    this.state.previousPhase = this.state.phase;

    // 执行阶段处理器
    const handler = this.phaseHandlers.get(nextPhase);
    if (handler) {
      await handler(this.state);
    }

    // 更新当前阶段
    this.state.phase = nextPhase;

    // 触发阶段转换后事件
    this.eventBus.emit('phase:after', {
      from: this.state.previousPhase,
      to: nextPhase,
      state: this.state,
    });
  }

  // 检查是否可以转换
  canTransition(nextPhase: RoundPhase): boolean {
    const allowed = PHASE_TRANSITIONS[this.state.phase];
    return allowed.includes(nextPhase);
  }

  // 执行完整回合流程
  async runRound(): Promise<void> {
    // 回合开始
    await this.transition(RoundPhase.ROUND_START);

    // 摸牌阶段
    await this.transition(RoundPhase.DRAW_PHASE);

    // 主要阶段
    await this.transition(RoundPhase.MAIN_PHASE);

    // 战斗阶段
    await this.transition(RoundPhase.BATTLE_PHASE);

    // 结束阶段
    await this.transition(RoundPhase.END_PHASE);

    // 回合结束
    await this.transition(RoundPhase.ROUND_END);
  }

  // 阶段处理器实现
  private async onRoundStart(state: RoundState): Promise<void> {
    state.roundNumber++;
    this.eventBus.emit('round:start', { roundNumber: state.roundNumber });
  }

  private async onDrawPhase(state: RoundState): Promise<void> {
    // 从牌堆摸牌
    this.eventBus.emit('round:draw', { rounder: state.currentRounder });
  }

  private async onMainPhase(state: RoundState): Promise<void> {
    // 主要阶段处理（出牌、使用技能）
    this.eventBus.emit('round:main', { rounder: state.currentRounder });
  }

  private async onBattlePhase(state: RoundState): Promise<void> {
    // 战斗阶段处理
    this.eventBus.emit('round:battle', { rounder: state.currentRounder });
  }

  private async onEndPhase(state: RoundState): Promise<void> {
    // 结束阶段处理
    this.eventBus.emit('round:end', { rounder: state.currentRounder });
  }

  private async onRoundEnd(state: RoundState): Promise<void> {
    // 回合结束处理
    this.eventBus.emit('round:complete', { roundNumber: state.roundNumber });
  }

  // 获取当前状态
  getState(): RoundState {
    return { ...this.state };
  }

  // 获取当前阶段
  get phase(): RoundPhase {
    return this.state.phase;
  }

  // 获取当前阶段（别名，供 network-server 等下游使用）
  get currentPhase(): RoundPhase {
    return this.state.phase;
  }

  // 获取当前玩家（供 network-server 等下游使用）
  get currentPlayer(): Player {
    return this.state.currentRounder;
  }

  // 获取当前回合数
  get roundNumber(): number {
    return this.state.roundNumber;
  }
}
```

### 6. 游戏初始化模块 (src/shared/game/engine/xi.ts)

#### 6.1 XI 类

```typescript
import { Board } from '../board';
import { Player } from '../player';
import { LibGroup } from '../lib-group';
import { EventBus } from './event-bus';
import { SkillRegistry } from './skill-registry';
import { GLoop } from './g-loop';
import { RoundManager } from './round';
import { SelectHero } from './select-hero';
import { Casting } from '../rules/casting';

export interface GameConfig {
  playerCount: number;
  packages: number[];
  seed: number;
  mode: string;
}

export class XI {
  // 核心组件
  private board: Board;
  private libGroup: LibGroup;
  private eventBus: EventBus;
  private skillRegistry: SkillRegistry;
  private gLoop: GLoop;
  private roundManager: RoundManager;
  private selectHero: SelectHero;

  // 游戏配置
  private config: GameConfig;
  private initialized: boolean;

  constructor(config: GameConfig) {
    this.config = config;
    this.initialized = false;

    // 初始化核心组件
    this.board = new Board();
    this.libGroup = new LibGroup();
    this.eventBus = new EventBus();
    this.skillRegistry = new SkillRegistry(this.eventBus);
    this.gLoop = new GLoop(this.eventBus, this.board);
    this.roundManager = new RoundManager(this.board, this.eventBus);
    this.selectHero = new SelectHero(this.board, this.eventBus);
  }

  // 启动游戏
  async run(): Promise<void> {
    if (this.initialized) {
      throw new Error('Game already initialized');
    }

    // 初始化游戏
    await this.initialize();

    // 执行选将
    await this.selectHero.run();

    // 启动 G-Loop
    this.gLoop.start();

    // 执行游戏主循环
    await this.gameLoop();
  }

  // 初始化游戏
  private async initialize(): Promise<void> {
    // 初始化牌堆
    this.initializePiles();

    // 初始化玩家
    this.initializePlayers();

    // 构建技能注册表
    this.mappingSksp();

    this.initialized = true;
  }

  // 初始化牌堆
  private initializePiles(): void {
    // 从 LibGroup 加载卡牌到牌堆
    this.board.tuxPiles.enqueueRange(
      this.libGroup.tl.listAllTuxCodes(this.config.packages)
    );
    this.board.monPiles.enqueueRange(
      this.libGroup.ml.listAllSeleable(this.config.packages).map(m => m.code)
    );
    this.board.evePiles.enqueueRange(
      this.libGroup.el.listAllSeleable(this.config.packages).map(e => e.code)
    );

    // 打乱牌堆
    this.board.tuxPiles.shuffle();
    this.board.monPiles.shuffle();
    this.board.evePiles.shuffle();
  }

  // 初始化玩家
  private initializePlayers(): void {
    for (let i = 1; i <= this.config.playerCount; i++) {
      const player = new Player(`Player ${i}`, 0, i, 0, 0);
      this.board.garden.set(i, player);
    }
  }

  // 构建技能注册表
  mappingSksp(): void {
    // 从所有 Tux 注册
    for (const tux of this.libGroup.tl.listAllTuxs(this.config.packages)) {
      if (tux.action) {
        this.skillRegistry.registerTux(tux, tux.action);
      }
    }

    // 从所有 Monster 注册
    for (const monster of this.libGroup.ml.listAllSeleable(this.config.packages)) {
      if (monster.debut) {
        this.skillRegistry.registerMonster(monster, monster.debut);
      }
    }

    // 从所有 NPC 注册
    for (const npc of this.libGroup.nl.listAllSeleable(this.config.packages)) {
      if (npc.debut) {
        this.skillRegistry.registerNPC(npc, npc.debut);
      }
    }

    // 从所有 Evenement 注册
    for (const eve of this.libGroup.el.listAllSeleable(this.config.packages)) {
      if (eve.action) {
        this.skillRegistry.registerEvenement(eve, eve.action);
      }
    }

    // 从所有 Skill/Bless 注册
    for (const skill of this.libGroup.sl.listAllSkills()) {
      if (skill.action) {
        this.skillRegistry.registerSkill(skill, skill.action);
      }
    }
  }

  // 游戏主循环
  private async gameLoop(): Promise<void> {
    while (this.isGameRunning()) {
      // 执行回合
      await this.roundManager.runRound();

      // 检查游戏是否结束
      if (this.isGameOver()) {
        break;
      }
    }

    // 游戏结束处理
    await this.onGameOver();
  }

  // 检查游戏是否运行中
  private isGameRunning(): boolean {
    // 检查是否有玩家存活
    const alivePlayers = Array.from(this.board.garden.values())
      .filter(p => p.isAlive && p.isReal);
    return alivePlayers.length > 1;
  }

  // 检查游戏是否结束
  private isGameOver(): boolean {
    return !this.isGameRunning();
  }

  // 游戏结束处理
  private async onGameOver(): Promise<void> {
    this.gLoop.stop();
    this.eventBus.emit('game:over', {
      board: this.board,
      scores: {
        aka: this.board.finalAkaScore,
        ao: this.board.finalAoScore,
      },
    });
  }

  // 获取组件（用于测试）
  getBoard(): Board { return this.board; }
  getLibGroup(): LibGroup { return this.libGroup; }
  getEventBus(): EventBus { return this.eventBus; }
  getSkillRegistry(): SkillRegistry { return this.skillRegistry; }
  getGLoop(): GLoop { return this.gLoop; }
  getRoundManager(): RoundManager { return this.roundManager; }
  getSelectHero(): SelectHero { return this.selectHero; }
}
```

### 7. 选将系统模块 (src/shared/game/engine/select-hero.ts)

#### 7.1 SelectHero 类

```typescript
import { Board } from '../board';
import { Player } from '../player';
import { EventBus } from './event-bus';
import { Casting, CastingPick, CastingTable, CastingPublic, CastingCongress } from '../rules/casting';
import { HeroLib } from '../lib/hero-lib';
import { Hero } from '../card/hero';

export interface SelectHeroConfig {
  mode: 'pick' | 'table' | 'public' | 'congress';
  playerCount: number;
  heroCount: number;  // 每人可选英雄数
}

export class SelectHero {
  private board: Board;
  private eventBus: EventBus;
  private config: SelectHeroConfig;
  private casting: Casting;

  constructor(board: Board, eventBus: EventBus) {
    this.board = board;
    this.eventBus = eventBus;
    this.config = {
      mode: 'pick',
      playerCount: 2,
      heroCount: 5,
    };
    this.casting = this.createCasting();
  }

  // 创建 Casting 实例
  private createCasting(): Casting {
    switch (this.config.mode) {
      case 'pick':
        return new CastingPick();
      case 'table':
        return new CastingTable();
      case 'public':
        return new CastingPublic();
      case 'congress':
        return new CastingCongress();
      default:
        return new CastingPick();
    }
  }

  // 执行选将流程
  async run(): Promise<void> {
    // 初始化选将
    await this.initialize();

    // 执行选将循环
    await this.selectLoop();

    // 确认选将结果
    await this.confirmSelection();
  }

  // 初始化选将
  private async initialize(): Promise<void> {
    // 随机分配可选英雄
    const availableHeroes = this.getAvailableHeroes();

    // 初始化 Casting
    for (const player of this.board.garden.values()) {
      if (player.isReal) {
        const heroes = this.pickRandomHeroes(availableHeroes, this.config.heroCount);
        this.casting.init(player.uid, heroes);
      }
    }

    this.eventBus.emit('select:init', {
      casting: this.casting,
      availableHeroes,
    });
  }

  // 选将循环
  private async selectLoop(): Promise<void> {
    let round = 0;
    while (!this.isSelectionComplete()) {
      round++;

      // 轮询每位玩家
      for (const player of this.board.garden.values()) {
        if (player.isReal && !this.hasSelected(player.uid)) {
          // 等待玩家选择
          await this.waitForPlayerSelection(player);
        }
      }

      this.eventBus.emit('select:round', { round });
    }
  }

  // 等待玩家选择
  private async waitForPlayerSelection(player: Player): Promise<void> {
    return new Promise((resolve) => {
      const handler = (data: { playerId: number; heroId: number }) => {
        if (data.playerId === player.uid) {
          this.processSelection(player.uid, data.heroId);
          resolve();
          return false;  // 一次性处理器
        }
      };
      this.eventBus.once('select:pick', handler);
    });
  }

  // 处理选择
  private processSelection(playerId: number, heroId: number): void {
    // 验证选择是否合法
    if (!this.isValidSelection(playerId, heroId)) {
      this.eventBus.emit('select:invalid', { playerId, heroId });
      return;
    }

    // 执行选择
    this.casting.pick(playerId, heroId);

    this.eventBus.emit('select:pick', { playerId, heroId });
  }

  // 验证选择是否合法
  private isValidSelection(playerId: number, heroId: number): boolean {
    // 检查英雄是否可用
    // 检查玩家是否已选择
    return true;
  }

  // 检查选将是否完成
  private isSelectionComplete(): boolean {
    for (const player of this.board.garden.values()) {
      if (player.isReal && !this.hasSelected(player.uid)) {
        return false;
      }
    }
    return true;
  }

  // 检查玩家是否已选择
  private hasSelected(playerId: number): boolean {
    // 检查 Casting 状态
    return false;
  }

  // 确认选将结果
  private async confirmSelection(): Promise<void> {
    // 应用选将结果到 Player 对象
    for (const player of this.board.garden.values()) {
      if (player.isReal) {
        const heroId = this.casting.getDing(player.uid);
        if (heroId) {
          player.selectHero = heroId;
        }
      }
    }

    this.eventBus.emit('select:confirm', {
      casting: this.casting,
    });
  }

  // 获取可用英雄
  private getAvailableHeroes(): Hero[] {
    // 从 HeroLib 获取可选英雄
    return [];
  }

  // 随机选取英雄
  private pickRandomHeroes(heroes: Hero[], count: number): number[] {
    const shuffled = [...heroes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(h => h.avatar);
  }

  // 获取配置
  getConfig(): SelectHeroConfig {
    return { ...this.config };
  }

  // 设置配置
  setConfig(config: Partial<SelectHeroConfig>): void {
    this.config = { ...this.config, ...config };
    this.casting = this.createCasting();
  }
}
```

### 8. Artiad 动作解析器模块 (src/shared/game/engine/artiad/)

#### 8.1 Parser 类 (parser.ts)

```typescript
import { GMessage, GMessageType, SimpleGMessage } from '../g-message';

export interface ParsedAction {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  raw: string;
}

export class Parser {
  // 解析动作字符串
  static parse(input: string): ParsedAction {
    const parts = input.split(',');
    return {
      type: parts[0],
      sender: parseInt(parts[1]) || 0,
      receiver: parseInt(parts[2]) || 0,
      args: parts.slice(3),
      raw: input,
    };
  }

  // 解析为 GMessage
  static parseToMessage(input: string): GMessage {
    const action = this.parse(input);
    return new SimpleGMessage(
      action.type as GMessageType,
      action.sender,
      action.receiver,
      action.args
    );
  }

  // 验证动作格式
  static validate(input: string): boolean {
    const parts = input.split(',');
    if (parts.length < 3) return false;

    const type = parts[0];
    if (!type.match(/^G[012]O[A-Z]$/)) return false;

    const sender = parseInt(parts[1]);
    if (isNaN(sender) || sender < 0) return false;

    const receiver = parseInt(parts[2]);
    if (isNaN(receiver) || receiver < 0) return false;

    return true;
  }

  // 提取动作参数
  static extractArgs(input: string): string[] {
    const parts = input.split(',');
    return parts.slice(3);
  }

  // 提取动作类型
  static extractType(input: string): string {
    return input.split(',')[0];
  }

  // 提取发送者
  static extractSender(input: string): number {
    return parseInt(input.split(',')[1]) || 0;
  }

  // 提取接收者
  static extractReceiver(input: string): number {
    return parseInt(input.split(',')[2]) || 0;
  }
}
```

#### 8.2 Executor 类 (executor.ts)

```typescript
import { EventBus } from '../event-bus';
import { GMessage } from '../g-message';
import { Board } from '../../board';
import { Player } from '../../player';

export interface ExecutionContext {
  message: GMessage;
  board: Board;
  sender: Player | null;
  receiver: Player | null;
  args: string[];
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export class Executor {
  private eventBus: EventBus;
  private board: Board;

  constructor(eventBus: EventBus, board: Board) {
    this.eventBus = eventBus;
    this.board = board;
  }

  // 执行动作
  async execute(message: GMessage): Promise<ExecutionResult> {
    // 构建执行上下文
    const context = this.buildContext(message);

    // 执行前检查
    if (!this.preExecute(context)) {
      return { success: false, error: 'Pre-execution check failed' };
    }

    try {
      // 分发到事件总线
      const result = this.eventBus.emit(message.type, context);

      // 执行后处理
      this.postExecute(context, result);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // 构建执行上下文
  private buildContext(message: GMessage): ExecutionContext {
    return {
      message,
      board: this.board,
      sender: this.board.garden.get(message.sender) ?? null,
      receiver: message.receiver === 0
        ? null
        : this.board.garden.get(message.receiver) ?? null,
      args: message.args,
    };
  }

  // 执行前检查
  private preExecute(context: ExecutionContext): boolean {
    // 检查发送者是否有效
    if (context.sender && !context.sender.isAlive) {
      return false;
    }

    // 检查接收者是否有效
    if (context.receiver && !context.receiver.isAlive) {
      return false;
    }

    return true;
  }

  // 执行后处理
  private postExecute(context: ExecutionContext, result: unknown): void {
    // 状态更新
    // 日志记录
  }
}
```

## 数据流

```
┌─────────────────────────────────────────────────────────┐
│                      XI (游戏引擎)                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  初始化流程                        │    │
│  │  LibGroup ──→ Board ──→ Players ──→ Piles       │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │              技能注册表构建                        │    │
│  │  Tux/Monster/NPC/Eve/Skill ──→ SkillRegistry    │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  选将系统                          │    │
│  │  SelectHero ──→ Casting ──→ Player.SelectHero   │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  G-Loop 主循环                     │    │
│  │  EventBus ──→ GLoop ──→ RoundManager             │    │
│  │       ↑                    │                     │    │
│  │       └────────────────────┘                     │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  动作解析器                        │    │
│  │  Parser ──→ Executor ──→ EventBus ──→ Effects   │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 测试策略

### 1. 事件总线测试

- EventBus 注册/移除监听器
- EventBus 事件触发和优先级排序
- EventBus 事件取消（stopPropagation）
- EventBus 一次性监听器（once）
- EventBus 异步事件处理

### 2. 技能注册表测试

- SkillRegistry 从 Skill/Tux/Monster/NPC/Evenement 注册
- SkillRegistry 按消息类型查找处理器
- SkillRegistry 按优先级排序处理器
- SkillRegistry once/lock/hind 标志处理
- SkillRegistry clear 和 offBySource

### 3. G-Loop 消息测试

- GMessage 序列化和反序列化
- SimpleGMessage 字符串协议兼容
- InnerGMessage 内部消息处理
- GMessage 克隆和修改

### 4. G-Loop 核心测试

- GLoop 消息队列管理
- GLoop 消息处理流程
- GLoop 异步处理
- GLoop 启动/暂停/停止

### 5. 回合状态机测试

- RoundPhase 阶段定义和转换规则
- RoundManager 阶段转换
- RoundManager 完整回合流程
- RoundManager 阶段处理器

### 6. 游戏初始化测试

- XI 初始化流程
- XI MappingSksp 技能注册
- XI 配置管理

### 7. 选将系统测试

- SelectHero 选将流程
- SelectHero Casting 集成
- SelectHero 选将事件

### 8. Artiad 动作解析器测试

- Parser 动作解析
- Parser 动作验证
- Executor 动作执行
- Executor 执行上下文

## 文件结构计划

```
src/shared/game/engine/
├── index.ts              # 导出所有引擎组件
├── event-bus.ts          # 事件总线核心
├── skill-registry.ts     # 技能注册表
├── g-message.ts          # G-Loop 消息类型
├── g-loop.ts             # G-Loop 核心
├── round.ts              # 回合状态机
├── xi.ts                 # 游戏初始化
├── select-hero.ts        # 选将系统
├── artiad/               # 动作解析器
│   ├── index.ts          # 导出 Artiad 模块
│   ├── parser.ts         # 动作解析器
│   └── executor.ts       # 动作执行器
└── __tests__/            # 单元测试
    ├── event-bus.test.ts
    ├── skill-registry.test.ts
    ├── g-message.test.ts
    ├── g-loop.test.ts
    ├── round.test.ts
    ├── xi.test.ts
    ├── select-hero.test.ts
    └── artiad/
        ├── parser.test.ts
        └── executor.test.ts
```

## 风险与缓解

### 1. C# 反射机制差异

**风险**: C# 使用反射注册技能效果，TypeScript 没有等价机制。

**缓解**:
- 使用发布-订阅模式替代反射
- 构建时静态注册，运行时动态匹配
- 保持接口一致性，便于移植卡牌效果

### 2. 多线程模型差异

**风险**: C# 使用多线程管理游戏流程，TypeScript 是单线程。

**缓解**:
- 使用 async/await 替代线程
- 使用状态机模式管理复杂流程
- 使用事件驱动架构解耦组件

### 3. 字符串协议兼容性

**风险**: 保持原版字符串协议可能导致序列化/反序列化复杂度增加。

**缓解**:
- 封装序列化/反序列化逻辑
- 提供类型安全的消息对象
- 便于未来协议升级

### 4. 性能问题

**风险**: 事件驱动架构可能引入性能开销。

**缓解**:
- 使用 Map 优化事件查找
- 批量处理消息
- 提供性能监控和调优接口

## 实现计划

### 阶段 1: 事件总线和消息类型 (1 天)
1. 实现 EventBus 类
2. 实现 GMessage 接口和 SimpleGMessage、InnerGMessage 类
3. 编写事件总线单元测试
4. 编写消息类型单元测试

### 阶段 2: 技能注册表 (1 天)
1. 实现 SkillRegistry 类
2. 实现 Occur 匹配规则
3. 编写技能注册表单元测试

### 阶段 3: G-Loop 核心 (1 天)
1. 实现 GLoop 类
2. 实现消息队列管理
3. 编写 G-Loop 核心单元测试

### 阶段 4: 回合状态机 (1 天)
1. 实现 RoundPhase 枚举和转换规则
2. 实现 RoundManager 类
3. 编写回合状态机单元测试

### 阶段 5: 游戏初始化和选将 (1 天)
1. 实现 XI 类
2. 实现 SelectHero 类
3. 编写游戏初始化单元测试
4. 编写选将系统单元测试

### 阶段 6: Artiad 动作解析器 (0.5 天)
1. 实现 Parser 类
2. 实现 Executor 类
3. 编写动作解析器单元测试

### 阶段 7: 集成测试和导出 (0.5 天)
1. 编写集成测试
2. 创建模块导出 index.ts
3. 验证所有模块可编译
