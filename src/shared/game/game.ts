/**
 * Game - Main game flow controller
 *
 * Integrates core-models, game-engine, and card-effects into a complete
 * playable game. Uses composition (not inheritance from XI) to assemble
 * all components and manage the full game lifecycle:
 *   initialize -> selectHeroes -> dealCards -> roundLoop -> settle
 *
 * Supports AI players for automated play and testing.
 */

import { Board } from './board';
import { Player } from './player';
import { LibGroup, type LibGroupData } from './lib-group';
import { EventBus } from './engine/event-bus';
import { SkillRegistry } from './engine/skill-registry';
import { GLoop } from './engine/g-loop';
import { RoundManager } from './engine/round';
import { SelectHero } from './engine/select-hero';
import { CardEffectRegistry } from './effects/registry';
import { TuxCottage } from './effects/tux-cottage';
import { SkillCottage } from './effects/skill-cottage';
import { NpcCottage } from './effects/npc-cottage';
import { RuneCottage } from './effects/rune-cottage';
import { EveCottage } from './effects/eve-cottage';
import { OperationCottage } from './effects/operation-cottage';
import type { AIStrategy } from './ai/types';
import { AIPlayer } from './ai/types';

/** Game configuration */
export interface GameConfig {
  /** Number of players (2, 4, or 6) */
  playerCount: number;
  /** Card package numbers to include */
  packages: number[];
  /** Random seed for reproducible games */
  seed: number;
  /** Maximum rounds before forced end (prevents infinite loops) */
  maxRounds: number;
  /** AI strategies for each player slot */
  aiStrategies: AIStrategy[];
  /** LibGroup data to load */
  libGroupData: LibGroupData;
  /** Level code for filtering cards */
  levelCode: number;
}

/** Game result after settlement */
export interface GameResult {
  /** Winner player (null for draw) */
  winner: Player | null;
  /** Total rounds played */
  totalRounds: number;
  /** Red team score */
  akaScore: number;
  /** Blue team score */
  aoScore: number;
  /** Reason for game end */
  reason: 'victory' | 'max_rounds' | 'elimination';
}

/**
 * Game - Main game flow controller.
 *
 * Composes Board, LibGroup, EventBus, SkillRegistry, GLoop, RoundManager,
 * SelectHero, and CardEffectRegistry into a complete playable game.
 */
export class Game {
  // Core components
  private board: Board;
  private libGroup: LibGroup;
  private eventBus: EventBus;
  private skillRegistry: SkillRegistry;
  private gLoop: GLoop;
  private roundManager: RoundManager;
  private selectHero: SelectHero;
  private effectRegistry: CardEffectRegistry;

  // Game state
  private config: GameConfig;
  private players: Map<number, Player>;
  private aiPlayers: Map<number, AIPlayer>;
  private initialized = false;
  private running = false;
  private rng: () => number;

  constructor(config: GameConfig) {
    this.config = config;
    this.players = new Map();
    this.aiPlayers = new Map();
    this.rng = this.createRNG(config.seed);

    // Initialize core components
    this.board = new Board();
    this.libGroup = new LibGroup();
    this.eventBus = new EventBus();
    this.skillRegistry = new SkillRegistry(this.eventBus);
    this.gLoop = new GLoop(this.eventBus, this.board, this.skillRegistry);
    this.roundManager = new RoundManager(this.board, this.eventBus);
    this.selectHero = new SelectHero(
      this.board,
      this.eventBus,
      this.libGroup,
      config.levelCode,
    );
    this.effectRegistry = new CardEffectRegistry();
  }

  /**
   * Run the complete game. Main entry point.
   * Executes: initialize -> selectHeroes -> dealCards -> roundLoop -> settle
   */
  async run(): Promise<GameResult> {
    try {
      await this.initialize();
      await this.selectHeroes();
      this.dealCards();
      await this.roundLoop();
      return this.settle();
    } catch (error) {
      console.error('[Game] Fatal error:', error);
      return this.settle();
    }
  }

  /**
   * Initialize the game: load data, create players, set up piles and effects.
   */
  private async initialize(): Promise<void> {
    // Load LibGroup data
    this.libGroup.init(this.config.libGroupData);

    // Create players
    this.initializePlayers();

    // Set up card piles from LibGroup
    this.initializePiles();

    // Build skill registry from LibGroup
    this.skillRegistry.clear();
    this.skillRegistry.buildFromLibGroup(this.libGroup, this.config.levelCode);

    // Register card effects
    this.registerEffects();

    // Set initial rounder to first player
    const firstPlayer = this.players.get(1);
    if (firstPlayer) {
      this.board.rounder = firstPlayer;
    }

    this.initialized = true;
  }

  /**
   * Create Player objects and add them to the Board.
   */
  private initializePlayers(): void {
    const names = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6'];
    for (let i = 1; i <= this.config.playerCount; i++) {
      const player = new Player(names[i - 1] ?? `Player ${i}`, 0, i, true);
      player.team = i % 2 === 1 ? 1 : 2;
      player.isAlive = true;
      this.board.garden.set(i, player);
      this.players.set(i, player);
    }
  }

  /**
   * Load card data from LibGroup into Board piles and shuffle.
   */
  private initializePiles(): void {
    const levelCode = this.config.levelCode;

    // Tux (hand card) piles
    const tuxCodes = this.libGroup.tl.listAllTuxCodes(levelCode);
    this.board.tuxPiles.enqueueRange(tuxCodes);

    // Monster/NPC piles
    const monIds = this.libGroup.ml.listAllSeleable(levelCode);
    const npcIds = this.libGroup.nl.listAllSeleable(levelCode);
    const nmbList: number[] = [];
    const maxPairs = Math.min(10, Math.floor(monIds.length / 2), npcIds.length);
    for (let i = 0; i < maxPairs; i++) {
      if (i * 2 < monIds.length) nmbList.push(monIds[i * 2]);
      if (i * 2 + 1 < monIds.length) nmbList.push(monIds[i * 2 + 1]);
      if (i < npcIds.length) {
        // NPC codes are offset by 1000
        nmbList.push(npcIds[i] + 1000);
      }
    }
    this.board.monPiles.enqueueRange(nmbList);

    // Evenement (event) piles
    const eveIds = this.libGroup.el.listAllSeleable(levelCode);
    this.board.evePiles.enqueueRange(eveIds);

    // Shuffle all piles with seeded RNG
    this.board.tuxPiles.shuffle(this.rng);
    this.board.monPiles.shuffle(this.rng);
    this.board.evePiles.shuffle(this.rng);
  }

  /**
   * Register card effects from all Cottage modules.
   */
  private registerEffects(): void {
    const raiseGMessage = (msg: string) => this.gLoop.raiseGMessage(msg);
    const innerGMessage = (msg: string, prior: number) => this.gLoop.innerGMessage(msg, prior);
    const asyncInput = (uid: number, format: string, code: string, arg: string) =>
      this.getInput(uid, format, code, arg);

    // Tux effects (hand cards, equipment)
    const tuxCottage = new TuxCottage(this.board, raiseGMessage, innerGMessage, asyncInput);
    this.effectRegistry.registerAll(tuxCottage.registerAll());

    // Skill effects (hero skills)
    const skillCottage = new SkillCottage(this.board, raiseGMessage, innerGMessage, asyncInput);
    this.effectRegistry.registerAll(skillCottage.registerAll());

    // NPC effects
    const npcCottage = new NpcCottage(this.board, raiseGMessage, innerGMessage, asyncInput);
    const npcRegs = npcCottage.registerAll();
    // NPC effects use a separate registry type; store for future use
    void npcRegs;

    // Rune effects
    const runeCottage = new RuneCottage(this.board, raiseGMessage, innerGMessage, asyncInput);
    const runeRegs = runeCottage.registerAll();
    void runeRegs;

    // Evenement effects
    const eveCottage = new EveCottage(this.board, raiseGMessage, innerGMessage, asyncInput);
    const eveRegs = eveCottage.registerAll();
    void eveRegs;

    // Operation effects (CZ series)
    const operationCottage = new OperationCottage(this.board, raiseGMessage, asyncInput);
    const opRegs = operationCottage.registerAll();
    void opRegs;
  }

  /**
   * Hero selection phase. AI players pick heroes from available pool.
   * Players without heroes get default stats.
   */
  private async selectHeroes(): Promise<void> {
    const availableHeroes = this.libGroup.hl.listAllSeleable(this.config.levelCode);

    if (availableHeroes.length === 0) {
      // No heroes available - initialize players with default stats
      for (const player of this.players.values()) {
        player.isAlive = true;
        player.hp = player.hpBase = 5;
        player.strh = player.strB = 2;
        player.dexh = player.dexB = 2;
        player.tuxLimit = 3;
      }
      return;
    }

    // AI players select heroes
    for (const [uid, aiPlayer] of this.aiPlayers) {
      const heroId = aiPlayer.selectHero(availableHeroes);
      const hero = this.libGroup.hl.instanceHero(heroId);
      const player = this.players.get(uid);
      if (hero && player) {
        player.selectHero = heroId;
        player.initFromHero(hero, true, false, false);
      }
    }

    // For players without AI, assign a default hero if not already set
    for (const player of this.players.values()) {
      if (player.selectHero === 0 && availableHeroes.length > 0) {
        // Pick first available hero not already taken
        const takenHeroes = new Set(
          [...this.players.values()].map(p => p.selectHero).filter(h => h !== 0),
        );
        const hero = availableHeroes.find(h => !takenHeroes.has(h.avatar));
        if (hero) {
          player.selectHero = hero.avatar;
          player.initFromHero(hero, true, false, false);
        }
      }
    }
  }

  /**
   * Deal initial hand cards to all alive players.
   */
  private dealCards(): void {
    const cardCount = 4;
    for (const player of this.players.values()) {
      if (player.isAlive) {
        for (let i = 0; i < cardCount; i++) {
          if (this.board.tuxPiles.count > 0) {
            const card = this.board.tuxPiles.dequeue() as number;
            player.tux.push(card);
          }
        }
      }
    }
  }

  /**
   * Main game loop. Runs rounds until game over or max rounds reached.
   */
  private async roundLoop(): Promise<void> {
    this.running = true;
    let roundCount = 0;

    while (this.running && roundCount < this.config.maxRounds) {
      roundCount++;

      try {
        await this.roundManager.runRound();

        if (this.isGameOver()) {
          break;
        }

        // Advance rounder to next alive player
        this.advanceRounder();
      } catch (error) {
        console.error(`[Game] Round ${roundCount} error:`, error);
        // Advance rounder and continue
        this.advanceRounder();
      }
    }

    this.running = false;
  }

  /**
   * Advance the rounder to the next alive player.
   */
  private advanceRounder(): void {
    const current = this.board.rounder;
    const nextUid = this.board.getNextPlayer(current.uid);
    if (nextUid > 0) {
      const nextPlayer = this.board.garden.get(nextUid);
      if (nextPlayer) {
        this.board.rounder = nextPlayer;
      }
    }
  }

  /**
   * Check if the game is over (0 or 1 alive real players).
   */
  private isGameOver(): boolean {
    const alivePlayers = Array.from(this.board.garden.values())
      .filter(p => p.isAlive && p.isReal);
    return alivePlayers.length <= 1;
  }

  /**
   * Settle the game: calculate scores, determine winner, return result.
   */
  private settle(): GameResult {
    // Calculate scores
    this.board.finalAkaScore = this.calculateAkaScore();
    this.board.finalAoScore = this.calculateAoScore();

    // Determine winner
    const alivePlayers = Array.from(this.board.garden.values())
      .filter(p => p.isAlive && p.isReal);

    let winner: Player | null = null;
    if (alivePlayers.length === 1) {
      winner = alivePlayers[0];
    }

    // Determine reason
    let reason: GameResult['reason'] = 'victory';
    if (!winner) {
      reason = 'elimination';
    } else if (this.roundManager.roundNumber >= this.config.maxRounds) {
      reason = 'max_rounds';
    }

    return {
      winner,
      totalRounds: this.roundManager.roundNumber,
      akaScore: this.board.finalAkaScore,
      aoScore: this.board.finalAoScore,
      reason,
    };
  }

  /**
   * Calculate red team (aka) score.
   */
  private calculateAkaScore(): number {
    let score = 0;
    for (const player of this.board.garden.values()) {
      if (player.team === 1 && player.isAlive && player.isReal) {
        score += player.hp;
        score += player.listOutAllCards().length;
      }
    }
    return score;
  }

  /**
   * Calculate blue team (ao) score.
   */
  private calculateAoScore(): number {
    let score = 0;
    for (const player of this.board.garden.values()) {
      if (player.team === 2 && player.isAlive && player.isReal) {
        score += player.hp;
        score += player.listOutAllCards().length;
      }
    }
    return score;
  }

  /**
   * Get input from AI player or empty string for human players.
   * This is the bridge between the game's input system and AI decisions.
   */
  private getInput(uid: number, format: string, code: string, arg: string): string {
    const aiPlayer = this.aiPlayers.get(uid);
    if (aiPlayer) {
      return aiPlayer.getInput(format, code, arg);
    }
    // Human players would be handled by network layer
    return '';
  }

  /**
   * Create a seeded random number generator (linear congruential generator).
   */
  private createRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  // ─── Public API ───

  /**
   * Register an AI player for the given player UID.
   */
  addAIPlayer(uid: number, strategy: AIStrategy): void {
    const player = this.players.get(uid);
    if (player) {
      this.aiPlayers.set(uid, new AIPlayer(uid, strategy, this.board));
    }
  }

  /**
   * Register AI players for all player slots using the configured strategies.
   */
  registerAllAIPlayers(): void {
    const strategies = this.config.aiStrategies;
    for (let i = 0; i < this.config.playerCount; i++) {
      const uid = i + 1;
      const strategy = strategies[i % strategies.length];
      if (strategy) {
        this.addAIPlayer(uid, strategy);
      }
    }
  }

  // ─── Component Getters (for testing and inspection) ───

  getBoard(): Board { return this.board; }
  getLibGroup(): LibGroup { return this.libGroup; }
  getEventBus(): EventBus { return this.eventBus; }
  getSkillRegistry(): SkillRegistry { return this.skillRegistry; }
  getGLoop(): GLoop { return this.gLoop; }
  getRoundManager(): RoundManager { return this.roundManager; }
  getSelectHero(): SelectHero { return this.selectHero; }
  getEffectRegistry(): CardEffectRegistry { return this.effectRegistry; }
  getPlayers(): Map<number, Player> { return this.players; }
  getAIPlayers(): Map<number, AIPlayer> { return this.aiPlayers; }
  isRunning(): boolean { return this.running; }
  isInitialized(): boolean { return this.initialized; }
  getConfig(): GameConfig { return { ...this.config }; }
}
