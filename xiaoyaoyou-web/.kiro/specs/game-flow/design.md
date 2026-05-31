# Design: game-flow

## 概述

本设计将 core-models、game-engine、card-effects 三个上游模块串联为完整的游戏流程，实现从创建游戏到结束的完整链路。设计一个 Game 主类作为集成入口，协调所有模块的工作；实现 AI 玩家系统支持自动化测试；编写集成测试验证模块协作；运行 100 局 AI 对局压力测试验证稳定性。

## 边界承诺

**本模块拥有**:
- src/shared/game/game.ts — Game 主类（游戏流程编排）
- src/shared/game/ai/ — AI 玩家实现
  - src/shared/game/ai/types.ts — AI 策略接口
  - src/shared/game/ai/random-ai.ts — 随机策略 AI
  - src/shared/game/ai/greedy-ai.ts — 贪心策略 AI
  - src/shared/game/ai/rule-ai.ts — 规则策略 AI
  - src/shared/game/ai/ai-player.ts — AI 玩家适配器
- src/shared/game/__tests__/ — 集成测试
  - src/shared/game/__tests__/game.test.ts — Game 类集成测试
  - src/shared/game/__tests__/ai-stress.test.ts — AI 对局压力测试

**本模块不拥有**:
- 核心数据模型（属于 core-models 模块）
- 游戏引擎逻辑（属于 game-engine 模块）
- 卡牌效果实现（属于 card-effects 模块）
- UI 组件（属于 client-ui 模块）
- 网络通信（属于 network-server 模块）

**依赖关系**:
- 上游依赖: core-models（Board、Player、Skill、Tux、Monster、NPC、LibGroup、Casting 等）、game-engine（EventBus、SkillRegistry、GLoop、RoundManager、SelectHero、XI）、card-effects（CardEffectRegistry、所有 Cottage 效果）
- 下游依赖: network-server（托管 Game 实例、注入玩家操作）、client-ui（读取游戏状态、显示界面）

**可能导致下游重新验证的变更**:
- 修改 Game 类的公共接口（构造参数、run 签名、状态查询方法）
- 修改 AI 玩家接口（AIStrategy 接口签名）
- 修改游戏事件格式（EventBus 事件名称和数据结构）
- 修改游戏结束条件或结算逻辑

## 架构决策

### 1. Game 类集成策略

**决策**: 使用组合模式（Composition）将所有上游模块组装为 Game 类，而非继承 XI 类。

**理由**:
- Game 类需要协调 core-models、game-engine、card-effects 三个模块的初始化和交互
- 组合模式提供更清晰的职责边界和更好的可测试性
- 保持与 XI 类的兼容性（Game 内部使用 XI 进行初始化和游戏循环）
- 便于下游模块（network-server）通过 Game 类管理游戏会话

### 2. AI 玩家注入策略

**决策**: 使用策略模式（Strategy Pattern）实现 AI 玩家，通过 AsyncInput 机制注入操作。

**理由**:
- 策略模式允许运行时切换 AI 算法（随机/贪心/规则）
- AsyncInput 机制与 game-engine 的输入系统兼容，无需修改上游代码
- AI 玩家作为 Player 的扩展，保持 Player 类的单一职责
- 便于测试（可以 mock AI 策略验证特定行为）

### 3. 游戏流程编排策略

**决策**: 使用 async/await 编排游戏流程，每个阶段作为独立的 async 方法。

**理由**:
- game-engine 已使用 async/await 管理异步操作（如等待玩家输入）
- async/await 提供清晰的流程控制，便于调试和测试
- 每个阶段独立封装，便于单独测试和错误处理
- 支持网络延迟（下游 network-server 可以注入异步操作）

### 4. 测试策略

**决策**: 集成测试使用真实模块（非 mock），压力测试使用 AI 玩家自动运行。

**理由**:
- 集成测试验证模块间的实际交互，mock 无法发现接口不兼容问题
- AI 玩家可以覆盖各种游戏场景（出牌、战斗、技能触发等）
- 100 局压力测试可以发现随机性导致的边界情况
- 固定随机种子确保测试可重复

### 5. 错误处理策略

**决策**: 使用 try-catch 包裹关键流程，捕获异常并记录日志，而非让游戏崩溃。

**理由**:
- AI 对局压力测试要求游戏不崩溃，异常必须被捕获
- 详细的错误日志便于定位问题
- 游戏状态异常时需要优雅降级（如跳过当前操作、强制结束回合）
- 下游 network-server 需要稳定的 Game 实例管理

## 组件设计

### 1. Game 主类 (src/shared/game/game.ts)

```typescript
import { Board } from './board';
import { Player } from './player';
import { LibGroup } from './lib-group';
import { EventBus } from './engine/event-bus';
import { SkillRegistry } from './engine/skill-registry';
import { GLoop } from './engine/g-loop';
import { RoundManager } from './engine/round';
import { SelectHero } from './engine/select-hero';
import { CardEffectRegistry } from './effects/registry';
import { TuxCottage } from './effects/tux-cottage';
import { OperationCottage } from './effects/operation-cottage';
import { SkillCottage } from './effects/skill-cottage';
import { MonsterCottage } from './effects/monster-cottage';
import { EveCottage } from './effects/eve-cottage';
import { NPCCottage } from './effects/npc-cottage';
import { RuneCottage } from './effects/rune-cottage';
import { AIStrategy, AIPlayer } from './ai/types';

export interface GameConfig {
  playerCount: number;      // 2, 4, or 6
  packages: number[];       // 卡牌包编号
  seed: number;             // 随机种子
  maxRounds: number;        // 最大回合数（防止死循环）
  aiStrategies: AIStrategy[]; // AI 策略列表
}

export interface GameResult {
  winner: Player | null;    // 胜者（null 表示平局）
  totalRounds: number;      // 总回合数
  akaScore: number;         // 红方分数
  aoScore: number;          // 蓝方分数
  reason: 'victory' | 'max_rounds' | 'elimination'; // 结束原因
}

export class Game {
  // 核心组件
  private board: Board;
  private libGroup: LibGroup;
  private eventBus: EventBus;
  private skillRegistry: SkillRegistry;
  private gLoop: GLoop;
  private roundManager: RoundManager;
  private selectHero: SelectHero;
  private effectRegistry: CardEffectRegistry;

  // 游戏状态
  private config: GameConfig;
  private players: Map<number, Player>;
  private aiPlayers: Map<number, AIPlayer>;
  private initialized: boolean;
  private running: boolean;
  private rng: () => number; // 随机数生成器

  constructor(config: GameConfig) {
    this.config = config;
    this.players = new Map();
    this.aiPlayers = new Map();
    this.initialized = false;
    this.running = false;

    // 初始化随机数生成器（使用种子）
    this.rng = this.createRNG(config.seed);

    // 初始化核心组件
    this.board = new Board();
    this.libGroup = new LibGroup();
    this.eventBus = new EventBus();
    this.skillRegistry = new SkillRegistry(this.eventBus);
    this.gLoop = new GLoop(this.eventBus, this.board);
    this.roundManager = new RoundManager(this.board, this.eventBus);
    this.selectHero = new SelectHero(this.board, this.eventBus);
    this.effectRegistry = new CardEffectRegistry();
  }

  // 启动游戏
  async run(): Promise<GameResult> {
    try {
      // 1. 初始化
      await this.initialize();

      // 2. 选将
      await this.selectHeroes();

      // 3. 发牌
      await this.dealCards();

      // 4. 回合循环
      await this.roundLoop();

      // 5. 结算
      return this.settle();
    } catch (error) {
      console.error('[Game] Fatal error:', error);
      return this.settle();
    }
  }

  // 初始化游戏
  private async initialize(): Promise<void> {
    // 初始化 LibGroup（从 JSON 数据加载）
    this.libGroup.init(/* JSON data */);

    // 初始化牌堆
    this.initializePiles();

    // 初始化玩家
    this.initializePlayers();

    // 构建技能注册表
    this.skillRegistry.buildFromLibGroup(this.libGroup);

    // 注册卡牌效果
    this.registerEffects();

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

    // 使用固定种子打乱牌堆
    this.board.tuxPiles.shuffle(this.rng);
    this.board.monPiles.shuffle(this.rng);
    this.board.evePiles.shuffle(this.rng);
  }

  // 初始化玩家
  private initializePlayers(): void {
    for (let i = 1; i <= this.config.playerCount; i++) {
      const player = new Player(`Player ${i}`, 0, i, 0, 0);
      this.board.garden.set(i, player);
      this.players.set(i, player);
    }
  }

  // 注册卡牌效果
  private registerEffects(): void {
    const tuxCottage = new TuxCottage(
      this.board,
      (msg) => this.gLoop.send(SimpleGMessage.fromString(msg)),
      (uid, format, code, arg) => this.getInput(uid, format, code, arg)
    );
    const operationCottage = new OperationCottage(
      this.board,
      (msg) => this.gLoop.send(SimpleGMessage.fromString(msg)),
      (uid, format, code, arg) => this.getInput(uid, format, code, arg)
    );
    // ... 其他 Cottage

    this.effectRegistry.registerAll([
      ...tuxCottage.registerAll(),
      ...operationCottage.registerAll(),
      // ... 其他效果
    ]);
  }

  // 选将
  private async selectHeroes(): Promise<void> {
    // 为 AI 玩家设置选将策略
    for (const [uid, aiPlayer] of this.aiPlayers) {
      // AI 选将逻辑
      const heroId = aiPlayer.selectHero(
        this.libGroup.hl.listAllSeleable(0)
      );
      this.selectHero.processSelection(uid, heroId);
    }

    // 执行选将流程
    await this.selectHero.run();

    // 确认选将结果
    for (const player of this.players.values()) {
      if (player.isReal) {
        const heroId = this.selectHero.getDing(player.uid);
        if (heroId) {
          player.initFromHero(
            this.libGroup.hl.instanceHero(heroId)!,
            true, false, false
          );
        }
      }
    }
  }

  // 发牌
  private async dealCards(): Promise<void> {
    // 为每位玩家摸取初始手牌
    for (const player of this.players.values()) {
      if (player.isAlive) {
        const cardCount = 4; // 初始手牌数量
        for (let i = 0; i < cardCount; i++) {
          if (this.board.tuxPiles.count > 0) {
            const card = this.board.tuxPiles.dequeue();
            player.tux.push(card);
          }
        }
      }
    }
  }

  // 回合循环
  private async roundLoop(): Promise<void> {
    this.running = true;
    let roundCount = 0;

    while (this.running && roundCount < this.config.maxRounds) {
      roundCount++;

      try {
        // 执行回合
        await this.roundManager.runRound();

        // 检查游戏是否结束
        if (this.isGameOver()) {
          break;
        }
      } catch (error) {
        console.error(`[Game] Round ${roundCount} error:`, error);
        // 继续下一回合，而非崩溃
      }
    }

    // 如果达到最大回合数，强制结束
    if (roundCount >= this.config.maxRounds) {
      console.warn(`[Game] Max rounds reached: ${this.config.maxRounds}`);
    }

    this.running = false;
  }

  // 检查游戏是否结束
  private isGameOver(): boolean {
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.isAlive && p.isReal);
    return alivePlayers.length <= 1;
  }

  // 结算
  private settle(): GameResult {
    // 计算最终分数
    this.board.finalAkaScore = this.calculateAkaScore();
    this.board.finalAoScore = this.calculateAoScore();

    // 确定胜者
    let winner: Player | null = null;
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.isAlive && p.isReal);
    if (alivePlayers.length === 1) {
      winner = alivePlayers[0];
    }

    return {
      winner,
      totalRounds: this.roundManager.roundNumber,
      akaScore: this.board.finalAkaScore,
      aoScore: this.board.finalAoScore,
      reason: winner ? 'victory' : 'max_rounds',
    };
  }

  // 计算红方分数
  private calculateAkaScore(): number {
    let score = 0;
    for (const player of this.players.values()) {
      if (player.team === 1 && player.isAlive) {
        score += player.hp;
        score += player.listOutAllCards().length;
      }
    }
    return score;
  }

  // 计算蓝方分数
  private calculateAoScore(): number {
    let score = 0;
    for (const player of this.players.values()) {
      if (player.team === 2 && player.isAlive) {
        score += player.hp;
        score += player.listOutAllCards().length;
      }
    }
    return score;
  }

  // 获取输入（AI 或回调）
  private getInput(uid: number, format: string, code: string, arg: string): string {
    const aiPlayer = this.aiPlayers.get(uid);
    if (aiPlayer) {
      return aiPlayer.getInput(format, code, arg, this.board);
    }
    // 下游网络层会通过事件注入
    return '';
  }

  // 创建随机数生成器（使用种子）
  private createRNG(seed: number): () => number {
    // 使用简单的线性同余生成器
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  // 添加 AI 玩家
  addAIPlayer(uid: number, strategy: AIStrategy): void {
    const player = this.players.get(uid);
    if (player) {
      this.aiPlayers.set(uid, new AIPlayer(uid, strategy, this.board));
    }
  }

  // 获取组件（用于测试）
  getBoard(): Board { return this.board; }
  getLibGroup(): LibGroup { return this.libGroup; }
  getEventBus(): EventBus { return this.eventBus; }
  getSkillRegistry(): SkillRegistry { return this.skillRegistry; }
  getGLoop(): GLoop { return this.gLoop; }
  getRoundManager(): RoundManager { return this.roundManager; }
  getSelectHero(): SelectHero { return this.selectHero; }
  getEffectRegistry(): CardEffectRegistry { return this.effectRegistry; }
  getPlayers(): Map<number, Player> { return this.players; }
  isRunning(): boolean { return this.running; }
}
```

### 2. AI 策略接口 (src/shared/game/ai/types.ts)

```typescript
import { Board } from '../board';
import { Player } from '../player';
import { Hero } from '../card/hero';

export interface AIStrategy {
  // 策略名称
  readonly name: string;

  // 选将策略
  selectHero(availableHeroes: Hero[]): number;

  // 主要阶段决策
  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[]
  ): string;

  // 战斗阶段决策
  makeBattleDecision(
    player: Player,
    board: Board,
    validTargets: number[]
  ): number;

  // 输入决策（选择目标、选择卡牌等）
  makeInputDecision(
    player: Player,
    board: Board,
    format: string,
    code: string,
    arg: string
  ): string;
}

export class AIPlayer {
  private uid: number;
  private strategy: AIStrategy;
  private board: Board;

  constructor(uid: number, strategy: AIStrategy, board: Board) {
    this.uid = uid;
    this.strategy = strategy;
    this.board = board;
  }

  selectHero(availableHeroes: Hero[]): number {
    return this.strategy.selectHero(availableHeroes);
  }

  getInput(format: string, code: string, arg: string): string {
    const player = this.board.garden.get(this.uid);
    if (!player) return '';

    return this.strategy.makeInputDecision(
      player,
      this.board,
      format,
      code,
      arg
    );
  }
}
```

### 3. 随机策略 AI (src/shared/game/ai/random-ai.ts)

```typescript
import { AIStrategy } from './types';
import { Board } from '../board';
import { Player } from '../player';
import { Hero } from '../card/hero';

export class RandomAI implements AIStrategy {
  readonly name = 'random';
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  selectHero(availableHeroes: Hero[]): number {
    if (availableHeroes.length === 0) return 0;
    const index = Math.floor(this.rng() * availableHeroes.length);
    return availableHeroes[index].avatar;
  }

  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[]
  ): string {
    if (validActions.length === 0) return 'skip';
    const index = Math.floor(this.rng() * validActions.length);
    return validActions[index];
  }

  makeBattleDecision(
    player: Player,
    board: Board,
    validTargets: number[]
  ): number {
    if (validTargets.length === 0) return 0;
    const index = Math.floor(this.rng() * validTargets.length);
    return validTargets[index];
  }

  makeInputDecision(
    player: Player,
    board: Board,
    format: string,
    code: string,
    arg: string
  ): string {
    // 根据 format 解析可选值，随机选择
    const options = this.parseOptions(format, board);
    if (options.length === 0) return '';
    const index = Math.floor(this.rng() * options.length);
    return options[index];
  }

  private parseOptions(format: string, board: Board): string[] {
    // 解析 format 字符串，提取可选值
    // 例如: "(p1p2p3)" -> ["1", "2", "3"]
    const match = format.match(/\(p(\d+(?:p\d+)*)\)/);
    if (match) {
      return match[1].split('p');
    }
    return [];
  }
}
```

### 4. 贪心策略 AI (src/shared/game/ai/greedy-ai.ts)

```typescript
import { AIStrategy } from './types';
import { Board } from '../board';
import { Player } from '../player';
import { Hero } from '../card/hero';

export class GreedyAI implements AIStrategy {
  readonly name = 'greedy';

  selectHero(availableHeroes: Hero[]): number {
    // 选择 HP 最高的英雄
    let bestHero = availableHeroes[0];
    for (const hero of availableHeroes) {
      if (hero.hp > bestHero.hp) {
        bestHero = hero;
      }
    }
    return bestHero.avatar;
  }

  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[]
  ): string {
    // 优先出牌，其次使用技能
    const cardActions = validActions.filter(a => a.startsWith('play:'));
    if (cardActions.length > 0) {
      return cardActions[0];
    }

    const skillActions = validActions.filter(a => a.startsWith('skill:'));
    if (skillActions.length > 0) {
      return skillActions[0];
    }

    return validActions.length > 0 ? validActions[0] : 'skip';
  }

  makeBattleDecision(
    player: Player,
    board: Board,
    validTargets: number[]
  ): number {
    // 选择 HP 最低的目标
    if (validTargets.length === 0) return 0;

    let bestTarget = validTargets[0];
    let minHp = Infinity;

    for (const targetId of validTargets) {
      const target = board.garden.get(targetId);
      if (target && target.hp < minHp) {
        minHp = target.hp;
        bestTarget = targetId;
      }
    }

    return bestTarget;
  }

  makeInputDecision(
    player: Player,
    board: Board,
    format: string,
    code: string,
    arg: string
  ): string {
    // 贪心选择：优先选择对自己最有利的选项
    const options = this.parseOptions(format, board);
    if (options.length === 0) return '';

    // 简单策略：选择第一个选项
    return options[0];
  }

  private parseOptions(format: string, board: Board): string[] {
    const match = format.match(/\(p(\d+(?:p\d+)*)\)/);
    if (match) {
      return match[1].split('p');
    }
    return [];
  }
}
```

### 5. 规则策略 AI (src/shared/game/ai/rule-ai.ts)

```typescript
import { AIStrategy } from './types';
import { Board } from '../board';
import { Player } from '../player';
import { Hero } from '../card/hero';

export class RuleAI implements AIStrategy {
  readonly name = 'rule';

  selectHero(availableHeroes: Hero[]): number {
    // 根据规则选择英雄：优先选择与队友互补的英雄
    // 简化实现：选择 HP 最高且有治疗技能的英雄
    let bestHero = availableHeroes[0];
    let bestScore = -1;

    for (const hero of availableHeroes) {
      let score = hero.hp;
      // 检查是否有治疗技能
      if (hero.skills.some(s => s.includes('heal') || s.includes('cure'))) {
        score += 10;
      }
      // 检查是否有攻击技能
      if (hero.skills.some(s => s.includes('attack') || s.includes('harm'))) {
        score += 5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestHero = hero;
      }
    }

    return bestHero.avatar;
  }

  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[]
  ): string {
    // 规则决策：
    // 1. 如果有治疗牌且 HP < 50%，优先使用治疗
    // 2. 如果有攻击牌且对手 HP < 30%，优先使用攻击
    // 3. 否则使用最强的牌

    const healActions = validActions.filter(a => this.isHealAction(a));
    const attackActions = validActions.filter(a => this.isAttackAction(a));

    // 检查是否需要治疗
    if (player.hp < player.hpBase * 0.5 && healActions.length > 0) {
      return healActions[0];
    }

    // 检查是否可以攻击
    const opponent = board.getOpponent(player);
    if (opponent && opponent.hp < opponent.hpBase * 0.3 && attackActions.length > 0) {
      return attackActions[0];
    }

    // 默认使用第一个可用动作
    return validActions.length > 0 ? validActions[0] : 'skip';
  }

  makeBattleDecision(
    player: Player,
    board: Board,
    validTargets: number[]
  ): number {
    // 选择 HP 最低的目标
    if (validTargets.length === 0) return 0;

    let bestTarget = validTargets[0];
    let minHp = Infinity;

    for (const targetId of validTargets) {
      const target = board.garden.get(targetId);
      if (target && target.hp < minHp) {
        minHp = target.hp;
        bestTarget = targetId;
      }
    }

    return bestTarget;
  }

  makeInputDecision(
    player: Player,
    board: Board,
    format: string,
    code: string,
    arg: string
  ): string {
    // 规则选择：根据当前游戏状态选择最优选项
    const options = this.parseOptions(format, board);
    if (options.length === 0) return '';

    // 简化实现：选择第一个选项
    return options[0];
  }

  private isHealAction(action: string): boolean {
    return action.includes('heal') || action.includes('cure') || action.includes('TP02');
  }

  private isAttackAction(action: string): boolean {
    return action.includes('attack') || action.includes('harm') || action.includes('JP');
  }

  private parseOptions(format: string, board: Board): string[] {
    const match = format.match(/\(p(\d+(?:p\d+)*)\)/);
    if (match) {
      return match[1].split('p');
    }
    return [];
  }
}
```

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        Game 主类                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. initialize()                                         │   │
│  │  LibGroup ──→ Board ──→ Players ──→ Piles               │   │
│  │  EventBus ──→ SkillRegistry ──→ GLoop ──→ RoundManager  │   │
│  │  CardEffectRegistry ──→ Cottage 效果注册                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  2. selectHeroes()                                       │   │
│  │  SelectHero ──→ AIPlayer.selectHero() ──→ Casting        │   │
│  │  Player.initFromHero()                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  3. dealCards()                                          │   │
│  │  Board.tuxPiles.dequeue() ──→ Player.tux.push()          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  4. roundLoop()                                          │   │
│  │  RoundManager.runRound()                                 │   │
│  │    ├── onDrawPhase: Board.tuxPiles ──→ Player.tux        │   │
│  │    ├── onMainPhase: AIPlayer.makeMainPhaseDecision()     │   │
│  │    │     └── EventBus ──→ CardEffectRegistry ──→ Effect  │   │
│  │    ├── onBattlePhase: AIPlayer.makeBattleDecision()      │   │
│  │    │     └── Monster 战斗结算                              │   │
│  │    └── onEndPhase: 检查玩家死亡 ──→ 传递回合权            │   │
│  │  isGameOver() ──→ break                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  5. settle()                                             │   │
│  │  calculateAkaScore() / calculateAoScore()                │   │
│  │  GameResult { winner, totalRounds, scores, reason }      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 文件结构计划

```
src/shared/game/
├── game.ts                 # Game 主类（游戏流程编排）
├── ai/                     # AI 玩家实现
│   ├── index.ts            # 导出所有 AI 组件
│   ├── types.ts            # AIStrategy 接口 + AIPlayer 适配器
│   ├── random-ai.ts        # 随机策略 AI
│   ├── greedy-ai.ts        # 贪心策略 AI
│   └── rule-ai.ts          # 规则策略 AI
└── __tests__/              # 集成测试
    ├── game.test.ts        # Game 类集成测试
    └── ai-stress.test.ts   # AI 对局压力测试
```

## 测试策略

### 1. Game 类集成测试

- Game 初始化：验证 LibGroup 加载、Board 初始化、Player 初始化
- Game 初始化：验证 EventBus、SkillRegistry、GLoop 初始化
- Game 初始化：验证 CardEffectRegistry 注册所有效果
- Game 选将：验证 SelectHero 流程、AI 玩家选将
- Game 发牌：验证初始手牌数量、牌堆剩余数量
- Game 回合：验证 RoundManager 阶段转换
- Game 结算：验证分数计算、胜者判定

### 2. AI 玩家测试

- RandomAI：验证随机选将、随机出牌、随机选择目标
- GreedyAI：验证 HP 优先选将、HP 低目标优先攻击
- RuleAI：验证治疗优先、攻击优先规则
- AIPlayer：验证 AsyncInput 机制、操作合法性

### 3. AI 对局压力测试

- 100 局 2 人对局：验证所有对局正常结束
- 100 局 4 人对局：验证所有对局正常结束
- 100 局 6 人对局：验证所有对局正常结束
- 不同随机种子：验证游戏多样性
- 最大回合数：验证强制结束逻辑

### 4. 错误处理测试

- 牌堆为空：验证重洗逻辑
- 玩家死亡：验证回合权移除
- AI 操作超时：验证强制跳过
- 游戏状态异常：验证异常捕获

## 风险与缓解

### 1. 模块集成兼容性

**风险**: 三个上游模块的接口可能不完全兼容，导致集成失败。

**缓解**:
- 在集成测试中逐步验证每个模块的接口
- 使用类型守卫检查参数合法性
- 保持与上游模块的版本同步
- 在设计阶段明确接口契约

### 2. AI 玩家死循环

**风险**: AI 玩家可能在某些游戏状态下陷入死循环（无限选择同一操作）。

**缓解**:
- 设置最大操作次数限制
- 使用 visited 状态集检测重复操作
- 设置操作超时机制
- 在压力测试中检测死循环

### 3. 游戏状态不一致

**风险**: 游戏状态在模块间传递时可能出现不一致（如 HP 计算错误、牌堆状态异常）。

**缓解**:
- 在每个阶段结束时验证游戏状态
- 使用不可变数据结构减少状态突变
- 在集成测试中验证状态一致性
- 详细的日志记录便于调试

### 4. 性能问题

**风险**: 100 局 AI 对局可能运行缓慢，影响开发效率。

**缓解**:
- 使用固定随机种子减少不必要的随机计算
- 优化 AI 策略算法复杂度
- 使用异步操作避免阻塞
- 支持并行运行多个对局

## Requirements Traceability

| Requirement | Summary | Components | Interfaces |
|-------------|---------|------------|------------|
| 1 | Game 主类集成 | game.ts | Game, GameConfig, GameResult |
| 2 | 完整游戏流程 | game.ts | initialize, selectHeroes, dealCards, roundLoop, settle |
| 3 | AI 玩家实现 | ai/*.ts | AIStrategy, AIPlayer, RandomAI, GreedyAI, RuleAI |
| 4 | 固定随机种子 | game.ts | createRNG |
| 5 | 集成测试 | __tests__/game.test.ts | Game 集成测试 |
| 6 | AI 对局压力测试 | __tests__/ai-stress.test.ts | 100 局自动对局 |
| 7 | 模块导出和接口 | game.ts | getBoard, getPlayers, getRoundState |
| 8 | 错误处理和健壮性 | game.ts | try-catch, 异常日志 |
