/**
 * XI - Game Controller / Engine Entry Point
 * Translation of C# PSDGamepkg.XI.cs
 *
 * The XI class is the main game controller that initializes all game components,
 * manages the game lifecycle, and coordinates between subsystems.
 */

import { Board } from '../board';
import { Player } from '../player';
import type { LibGroup } from '../lib-group';
import { EventBus } from './event-bus';
import { SkillRegistry } from './skill-registry';
import { GLoop } from './g-loop';
import { RoundManager } from './round';
import { SelectHero } from './select-hero';
import { Card } from '../card/card';
import { NMBLib } from '../card/nmb';

/** Game configuration */
export interface GameConfig {
  playerCount: number;
  packages: number[];
  seed: number;
  mode: string;
  levelCode: number;
  isTrain: boolean;
}

/**
 * XI - the main game engine controller.
 */
export class XI {
  // Core components
  private board: Board;
  private libGroup: LibGroup;
  private eventBus: EventBus;
  private skillRegistry: SkillRegistry;
  private gLoop: GLoop;
  private roundManager: RoundManager;
  private selectHero: SelectHero;

  // State
  private config: GameConfig;
  private initialized = false;
  private running = false;
  private finished = false;

  // Message handler for network broadcast
  private broadcastHandler: ((msg: string) => void) | null = null;

  constructor(config: GameConfig, libGroup: LibGroup) {
    this.config = config;
    this.libGroup = libGroup;

    // Initialize core components
    this.board = new Board();
    this.eventBus = new EventBus();
    this.skillRegistry = new SkillRegistry(this.eventBus);
    this.gLoop = new GLoop(this.eventBus, this.board, this.skillRegistry, this.libGroup);
    this.roundManager = new RoundManager(this.board, this.eventBus, this.libGroup);
    this.selectHero = new SelectHero(this.board, this.eventBus, libGroup, config.levelCode);
  }

  /**
   * Set the broadcast handler for network messages.
   */
  setBroadcastHandler(handler: (msg: string) => void): void {
    this.broadcastHandler = handler;
    this.gLoop.setMessageHandler(handler);
  }

  /**
   * Run the game. Main entry point.
   */
  async run(): Promise<void> {
    if (this.initialized) {
      throw new Error('Game already initialized');
    }

    await this.initialize();
    await this.selectHero.run(0);
    this.gLoop.start();
    await this.gameLoop();

    this.finished = true;
    await this.onGameOver();
  }

  /**
   * Initialize the game.
   */
  private async initialize(): Promise<void> {
    this.initializePlayers();
    this.constructPiles();
    this.mappingSksp();

    this.board.roundIN = 'H0ST';

    // Initialize heroes
    for (const player of this.board.garden.values()) {
      const hero = this.libGroup.hl.instanceHero(player.selectHero);
      if (hero) {
        player.initFromHero(hero, true, false, false);
      }
    }

    this.initialized = true;
  }

  /**
   * Initialize players.
   */
  private initializePlayers(): void {
    const names = ['撞仙', '笑犬', '翼君', '失影', '厌凉', '彰危'];
    for (let i = 1; i <= this.config.playerCount; i++) {
      const player = new Player(
        names[i - 1] ?? `Player ${i}`,
        0,
        i,
        true,
      );
      player.team = i % 2 === 1 ? 1 : 2;
      player.isAlive = true;
      this.board.garden.set(i, player);
    }
  }

  /**
   * Construct card piles from LibGroup data.
   * Translation of C# XI.ConstructPiles
   */
  private constructPiles(): void {
    // Tux piles
    const tuxCodes = this.libGroup.tl.listAllTuxCodes(this.config.levelCode);
    this.board.tuxPiles.enqueueRange(tuxCodes);
    this.board.tuxPiles.shuffle();

    // Monster/NPC piles - 10 rounds × (2 monsters + 1 NPC) = 20 mon + 10 npc
    const monIds = this.libGroup.ml.listAllSeleable(this.config.levelCode)
      .map(id => NMBLib.codeOfMonster(id));
    const npcIds = this.libGroup.nl.listAllSeleable(this.config.levelCode)
      .map(id => NMBLib.codeOfNPC(id));

    monIds.sort(() => Math.random() - 0.5);
    npcIds.sort(() => Math.random() - 0.5);

    const nmbList: number[] = [];
    for (let i = 0; i < 10; i++) {
      if (i * 2 < monIds.length) nmbList.push(monIds[i * 2]);
      if (i * 2 + 1 < monIds.length) nmbList.push(monIds[i * 2 + 1]);
      if (i < npcIds.length) nmbList.push(npcIds[i]);
    }
    this.board.monPiles.enqueueRange(nmbList);
    this.board.monPiles.shuffle();

    // Rest NPCs (index 10+)
    const restNpc = npcIds.slice(10);
    restNpc.sort(() => Math.random() - 0.5);
    this.board.restNpcPiles.enqueueRange(restNpc);

    // Rest Monsters (index 20+)
    const restMon = monIds.slice(20);
    restMon.sort(() => Math.random() - 0.5);
    this.board.restMonPiles.enqueueRange(restMon);

    // Eve piles
    const eveIds = this.libGroup.el.listAllSeleable(this.config.levelCode);
    this.board.evePiles.enqueueRange(eveIds);
    this.board.evePiles.shuffle();

    // Hero piles
    const allHeroes = this.libGroup.hl.listAllSeleable(this.config.levelCode);
    const heroPool = allHeroes
      .map(h => h.avatar)
      .filter(h => !this.board.garden.has(h) || !Array.from(this.board.garden.values()).some(p => p.selectHero === h));
    this.board.heroPiles.enqueueRange(heroPool);
    this.board.heroPiles.shuffle();
  }

  /**
   * Build the skill registry (sk02).
   * Translation of C# XI.MappingSksp
   */
  mappingSksp(): void {
    this.skillRegistry.clear();
    this.skillRegistry.buildFromLibGroup(this.libGroup, this.config.levelCode);
  }

  /**
   * Game main loop.
   */
  private async gameLoop(): Promise<void> {
    while (this.isGameRunning()) {
      await this.roundManager.runRound();

      if (this.isGameOver()) {
        break;
      }
    }
  }

  /**
   * Check if game is running.
   */
  isGameRunning(): boolean {
    if (this.finished) return false;
    const alivePlayers = Array.from(this.board.garden.values())
      .filter(p => p.isAlive && p.isReal);
    return alivePlayers.length > 1;
  }

  /**
   * Check if game is over.
   */
  isGameOver(): boolean {
    return !this.isGameRunning();
  }

  /**
   * Handle game over.
   */
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

  /**
   * Get board state for serialization.
   */
  toSerialMessage(): string {
    return this.board.toSerialMessage(this.libGroup);
  }

  // --- Component getters ---

  getBoard(): Board { return this.board; }
  getLibGroup(): LibGroup { return this.libGroup; }
  getEventBus(): EventBus { return this.eventBus; }
  getSkillRegistry(): SkillRegistry { return this.skillRegistry; }
  getGLoop(): GLoop { return this.gLoop; }
  getRoundManager(): RoundManager { return this.roundManager; }
  getSelectHero(): SelectHero { return this.selectHero; }
  getConfig(): GameConfig { return { ...this.config }; }
}
