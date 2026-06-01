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
import { GameLog } from './engine/game-log';
import { CardEffectRegistry, NpcEffectRegistry, RuneEffectRegistry, EveEffectRegistry, OperationEffectRegistry } from './effects/registry';
import { TuxCottage } from './effects/tux-cottage';
import { SkillCottage } from './effects/skill-cottage';
import { NpcCottage } from './effects/npc-cottage';
import { RuneCottage } from './effects/rune-cottage';
import { EveCottage } from './effects/eve-cottage';
import { OperationCottage } from './effects/operation-cottage';
import { MonsterCottage } from './effects/monster-cottage';
import type { AIStrategy } from './ai/types';
import { AIPlayer } from './ai/types';
import { NMBLib } from './card/nmb';
import { FiveElementHelper } from './card/five-element';

/**
 * InputProvider - Interface for getting player input from external sources.
 * AI players use AIPlayer.getInput() which returns synchronously.
 * Network players use this interface which returns a Promise,
 * allowing the game to wait for the player's response over the network.
 */
export interface InputProvider {
  getInput(uid: number, format: string, code: string, arg: string): Promise<string>;
}

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
  /** Optional input provider for network players */
  inputProvider?: InputProvider;
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
  reason: 'victory' | 'max_rounds' | 'elimination' | 'exhaustion';
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
  private gameLog: GameLog;
  private effectRegistry: CardEffectRegistry;
  private npcEffectRegistry: NpcEffectRegistry;
  private runeEffectRegistry: RuneEffectRegistry;
  private eveEffectRegistry: EveEffectRegistry;
  private operationEffectRegistry: OperationEffectRegistry;
  private monsterCottage: MonsterCottage | undefined;

  // Game state
  private config: GameConfig;
  private players: Map<number, Player>;
  private aiPlayers: Map<number, AIPlayer>;
  private inputProvider: InputProvider | null;
  private aiRegistrationPending = false;
  private initialized = false;
  private heroesSelected = false;
  private running = false;
  private rng: () => number;

  constructor(config: GameConfig) {
    this.config = config;
    this.players = new Map();
    this.aiPlayers = new Map();
    this.inputProvider = config.inputProvider ?? null;
    this.rng = this.createRNG(config.seed);

    // Initialize core components
    this.board = new Board();
    this.libGroup = new LibGroup();
    this.eventBus = new EventBus();
    this.skillRegistry = new SkillRegistry(this.eventBus);
    this.gLoop = new GLoop(this.eventBus, this.board, this.skillRegistry, this.libGroup);
    this.roundManager = new RoundManager(this.board, this.eventBus, this.libGroup);
    this.selectHero = new SelectHero(
      this.board,
      this.eventBus,
      this.libGroup,
      config.levelCode,
    );
    this.gameLog = new GameLog();
    this.effectRegistry = new CardEffectRegistry();
    this.npcEffectRegistry = new NpcEffectRegistry();
    this.runeEffectRegistry = new RuneEffectRegistry();
    this.eveEffectRegistry = new EveEffectRegistry();
    this.operationEffectRegistry = new OperationEffectRegistry();
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
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load LibGroup data
    this.libGroup.init(this.config.libGroupData);

    // Create players
    this.initializePlayers();

    // Set up card piles from LibGroup
    this.initializePiles();

    // Register card effects (creates cottages, stores in CardEffectRegistry)
    this.registerEffects();

    // Wire effect delegates onto card objects (mirrors C# RegisterDelegates)
    this.wireDelegates();

    // Build skill registry from LibGroup (now picks up wired delegates)
    this.skillRegistry.clear();
    this.skillRegistry.buildFromLibGroup(this.libGroup, this.config.levelCode);
    const sk02Keys = [...this.skillRegistry.sk02.keys()];
    console.log(`[Game] SkillRegistry: ${sk02Keys.length} event keys registered`);
    console.log(`[Game] R# keys: ${sk02Keys.filter(k => k.startsWith('R#')).join(', ')}`);
    console.log(`[Game] R1ST handlers: ${this.skillRegistry.findHandlers('R1ST').length}`);

    // Set up game log listeners
    this.setupGameLogListeners();

    // Set up battle event listeners
    this.setupBattleListeners();

    // Set input callback for round manager
    this.roundManager.setInputCallback((uid, format, code, arg) => this.getInput(uid, format, code, arg));

    // Set initial rounder to first player
    const firstPlayer = this.players.get(1);
    if (firstPlayer) {
      this.board.rounder = firstPlayer;
    }

    // Deferred AI player registration (players now exist)
    if (this.aiRegistrationPending) {
      this.doRegisterAIPlayers();
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

    console.log(`[Game] Piles initialized: tux=${this.board.tuxPiles.count} mon=${this.board.monPiles.count} eve=${this.board.evePiles.count}`);
  }

  /**
   * Register card effects from all Cottage modules.
   */
  private registerEffects(): void {
    const raiseGMessage = (msg: string) => { this.gLoop.raiseGMessage(msg); };
    const innerGMessage = (msg: string, prior: number) => { this.gLoop.innerGMessage(msg, prior); };
    const asyncInput = (uid: number, format: string, code: string, arg: string) =>
      this.getInput(uid, format, code, arg);

    // Tux effects (hand cards, equipment)
    const tuxCottage = new TuxCottage(this.board, this.libGroup, raiseGMessage, innerGMessage, asyncInput);
    this.effectRegistry.registerAll(tuxCottage.registerAll());

    // Skill effects (hero skills)
    const skillCottage = new SkillCottage(this.board, this.libGroup, raiseGMessage, innerGMessage, asyncInput);
    this.effectRegistry.registerAll(skillCottage.registerAll());

    // NPC effects
    const npcCottage = new NpcCottage(this.board, this.libGroup, raiseGMessage, innerGMessage, asyncInput);
    this.npcEffectRegistry.registerAll(npcCottage.registerAll());

    // Rune effects
    const runeCottage = new RuneCottage(this.board, this.libGroup, raiseGMessage, innerGMessage, asyncInput);
    this.runeEffectRegistry.registerAll(runeCottage.registerAll());

    // Evenement effects
    const eveCottage = new EveCottage(this.board, this.libGroup, raiseGMessage, innerGMessage, asyncInput);
    this.eveEffectRegistry.registerAll(eveCottage.registerAll());

    // Operation effects (CZ series)
    const operationCottage = new OperationCottage(this.board, this.libGroup, raiseGMessage, asyncInput);
    this.operationEffectRegistry.registerAll(operationCottage.registerAll());

    // Monster effects (debut, curtain, win/lose, consume)
    this.monsterCottage = new MonsterCottage(this.board, this.libGroup, raiseGMessage, innerGMessage, asyncInput);
    this.monsterCottage.registerDelegates(this.libGroup.ml);

    // NPC debut effects
    npcCottage.registerNpcDelegates(this.libGroup.nl);
  }

  /**
   * Wire effect delegates from CardEffectRegistry onto card objects in LibGroup.
   * Mirrors C# TuxCottage.RegisterDelegates() / SkillCottage.RegisterDelegates() etc.
   * Must be called after registerEffects() and before buildFromLibGroup().
   */
  private wireDelegates(): void {
    // Wire Tux (hand card) delegates
    for (const tux of this.libGroup.tl.firsts) {
      const reg = this.effectRegistry.get(tux.code);
      if (reg) {
        if (reg.action) tux.action = reg.action;
        if (reg.valid) tux.valid = reg.valid;
        if (reg.input) tux.input = reg.input;
        if (reg.bribe) tux.bribe = reg.bribe;
        if (reg.vestige) tux.vestige = reg.vestige;
        if (reg.locust) tux.locust = reg.locust;
        if (reg.inputHolder) tux.inputHolder = reg.inputHolder;

        // Wire equipment-specific delegates (only on TuxEquip subclass)
        if (tux.isTuxEquip()) {
          const tuxEquip = tux as import('./card/tux-equip').TuxEquip;
          if (reg.consumeAction) tuxEquip.consumeAction = reg.consumeAction;
          if (reg.consumeValid) tuxEquip.consumeValid = reg.consumeValid;
          if (reg.consumeInput) tuxEquip.consumeInput = reg.consumeInput;
          if (reg.consumeActionHolder) tuxEquip.consumeActionHolder = reg.consumeActionHolder;
          if (reg.consumeValidHolder) tuxEquip.consumeValidHolder = reg.consumeValidHolder;
          if (reg.consumeInputHolder) tuxEquip.consumeInputHolder = reg.consumeInputHolder;
          if (reg.incrAction) tuxEquip.incrAction = reg.incrAction;
          if (reg.decrAction) tuxEquip.decrAction = reg.decrAction;
          if (reg.insAction) tuxEquip.insAction = reg.insAction;
          if (reg.delAction) tuxEquip.delAction = reg.delAction;
          if (reg.useAction) tuxEquip.useAction = reg.useAction;
        }
      }
    }

    // Wire Skill delegates (skills share the same CardEffectRegistry)
    let wiredSkills = 0;
    for (const skill of this.libGroup.sl.firsts) {
      const reg = this.effectRegistry.get(skill.code);
      if (reg) {
        if (reg.action) { skill.action = reg.action; wiredSkills++; }
        if (reg.valid) skill.valid = reg.valid;
        if (reg.input) skill.input = reg.input;
      }
    }
    console.log(`[Game] Wired ${wiredSkills} skill actions from ${this.libGroup.sl.firsts.length} skills`);
    console.log(`[Game] Effect registry size: ${this.effectRegistry.getCodes().length}`);

    // Wire Operation delegates
    for (const op of this.libGroup.zl.firsts) {
      const reg = this.operationEffectRegistry.get(op.code);
      if (reg) {
        if (reg.action) op.action = reg.action;
        if (reg.valid) op.valid = reg.valid;
        if (reg.input) op.input = reg.input;
      }
    }

    // Wire Evenement delegates
    for (const eve of this.libGroup.el.firsts) {
      const reg = this.eveEffectRegistry.get(eve.code);
      if (reg) {
        if (reg.action) eve.action = reg.action;
      }
    }

    // Wire Rune delegates
    for (const rune of this.libGroup.rl.firsts) {
      const reg = this.runeEffectRegistry.get(rune.code);
      if (reg) {
        if (reg.action) rune.action = reg.action;
        if (reg.valid) rune.valid = reg.valid;
        if (reg.input) rune.input = reg.input;
      }
    }
  }

  /**
   * Set up EventBus listeners to record key game events in the GameLog.
   */
  private setupGameLogListeners(): void {
    // Monster/NPC reveal
    this.eventBus.on('imperial:left', (data: unknown) => {
      const d = data as { zone?: string; card?: number; trigger?: number };
      if (d.zone === 'M1' && d.card) {
        const mon = this.libGroup.ml.decode(d.card);
        const npc = d.card > 1000 ? this.libGroup.nl.decode(d.card - 1000) : null;
        if (npc) {
          this.gameLog.log(`翻取 NPC: ${npc.name}`);
        } else if (mon) {
          this.gameLog.log(`翻取怪物: ${mon.name} (力${mon.str} 敏${mon.agl})`);
        }
      }
    });

    // Battle start (Z1 phase)
    this.eventBus.on('round:z1', () => {
      const battler = this.board.battler;
      if (battler) {
        this.gameLog.log(`进入战斗: ${battler.name}`);
      }
    });

    // Battle result - check HP changes after battle
    this.eventBus.on('round:zf', () => {
      // Log player HP status after battle
      for (const player of this.board.garden.values()) {
        if (player.isAlive) {
          this.gameLog.log(`P${player.uid}(${player.name}) HP:${player.hp}`);
        }
      }
    });

    // NOTE: G-Loop messageHandler is set by GameSession (after game.initialize())
    // to broadcast G-messages to clients. Do NOT overwrite it here.
    // Logging is handled by GameSession's broadcast handler calling decodeGMessage.
  }

  /**
   * Decode a G-message and log it in readable text.
   */
  decodeGMessage(msg: string): void {
    const parts = msg.split(',');
    const type = parts[0];
    const sender = parseInt(parts[1], 10);
    const receiver = parseInt(parts[2], 10);

    switch (type) {
      case 'G0OH': {
        const element = parseInt(parts[3], 10);
        const damage = parseInt(parts[4], 10);
        const elements = ['物理', '火', '水', '雷', '风', '土'];
        const elemName = elements[element] ?? `E${element}`;
        if (sender > 0 && receiver > 0) {
          this.gameLog.log(`P${sender} 对 P${receiver} 造成 ${damage} 点${elemName}伤害`);
        } else if (receiver > 0) {
          this.gameLog.log(`P${receiver} 受到 ${damage} 点${elemName}伤害`);
        }
        break;
      }
      case 'G0IH': {
        const amount = parts[3];
        if (receiver > 0) {
          this.gameLog.log(`P${receiver} 恢复 ${amount} 点 HP`);
        }
        break;
      }
      case 'G0IT': {
        const cardId = parseInt(parts[3], 10);
        const cardName = this.decodeCardName(cardId);
        if (receiver > 0) {
          this.gameLog.log(`P${receiver} 获得卡牌 [${cardName}]`);
        }
        break;
      }
      case 'G0OT': {
        const cardId = parseInt(parts[3], 10);
        const cardName = this.decodeCardName(cardId);
        if (receiver > 0) {
          this.gameLog.log(`P${receiver} 失去卡牌 [${cardName}]`);
        }
        break;
      }
      case 'G0CC': {
        const cardId = parseInt(parts[3], 10);
        const cardName = this.decodeCardName(cardId);
        if (sender > 0) {
          this.gameLog.log(`P${sender} 使用卡牌 [${cardName}]`);
        }
        break;
      }
      case 'G0ZH': {
        if (receiver > 0) {
          this.gameLog.log(`P${receiver} 进行死亡判定`);
        }
        break;
      }
      case 'G0ZW': {
        if (receiver > 0) {
          this.gameLog.log(`P${receiver} 被击杀`);
        }
        break;
      }
      case 'G0IP': {
        const power = parseInt(parts[3], 10);
        if (receiver > 0) {
          this.gameLog.log(`P${receiver} 战斗力变化: ${power > 0 ? '+' : ''}${power}`);
        }
        break;
      }
      case 'G1EV': {
        const eveId = parseInt(parts[3], 10);
        const eve = this.libGroup.el.decodeEvenement(eveId);
        if (eve) {
          this.gameLog.log(`事件: ${eve.name}`);
        }
        break;
      }
      case 'G0IY': {
        const heroId = parseInt(parts[3], 10);
        const hero = this.libGroup.hl.instanceHero(heroId);
        if (receiver > 0 && hero) {
          this.gameLog.log(`P${receiver} 切换英雄: ${hero.name}`);
        }
        break;
      }
      // Skip sync messages
      case 'G2AS':
      case 'G0AS':
        break;
      // Skip pool refresh broadcasts
      case 'E09P':
        break;
    }
  }

  /**
   * Set up battle event listeners: pond:refresh, raise:gmessage.
   */
  private setupBattleListeners(): void {
    // RunStage: wire round stage dispatch to GLoop.runStage()
    this.eventBus.on('run:stage', async (data: unknown) => {
      const d = data as { stageCode: string };
      if (d.stageCode) {
        console.log(`[Game:run:stage] dispatching ${d.stageCode}`);
        try {
          await this.gLoop.runStage(d.stageCode);
        } catch (err) {
          console.error(`[Game:run:stage] Error in ${d.stageCode}:`, err);
          // Don't re-throw — allow round to continue even if a stage handler fails
        }
      }
    });

    // PondRefresh: forward to G-Loop as G09P message
    this.eventBus.on('pond:refresh', (data: unknown) => {
      const d = data as { checkHit?: boolean };
      const checkHit = d.checkHit !== false ? 0 : 1;
      this.gLoop.raiseGMessage(`G09P,${checkHit}`);
    });

    // RaiseGMessage: forward arbitrary G-messages to G-Loop
    this.eventBus.on('raise:gmessage', async (data: unknown) => {
      const d = data as { cmd?: string };
      if (d.cmd) {
        try {
          await this.gLoop.raiseGMessage(d.cmd);
        } catch (err) {
          console.error(`[Game:raise:gmessage] Error processing ${d.cmd}:`, err);
        }
      }
    });

    // Battle result logging (ZN phase)
    this.eventBus.on('round:zn', (data: unknown) => {
      const d = data as { isBattleWin?: boolean; poolDelta?: number };
      if (d.isBattleWin !== undefined) {
        const result = d.isBattleWin ? '胜利' : '失败';
        const delta = d.poolDelta ?? 0;
        this.gameLog.log(`战斗结果: ${result} (战力差: ${delta > 0 ? '+' : ''}${delta})`);
      }
    });

    // Pet capture on battle win (HarvestPet)
    this.eventBus.on('round:vs', (data: unknown) => {
      const d = data as { isBattleWin?: boolean; state?: { rounderUid?: number } };
      if (!d.isBattleWin || !d.state) return;
      const rounderUid = d.state.rounderUid;
      if (!rounderUid) return;
      const player = this.board.garden.get(rounderUid);
      if (!player) return;

      // Capture monster1 as pet
      if (this.board.monster1 !== 0 && this.board.mon1Catchable) {
        this.captureMonster(player, this.board.monster1);
      }
      // Capture monster2 as pet
      if (this.board.monster2 !== 0 && this.board.mon2Catchable && NMBLib.isMonster(this.board.monster2)) {
        this.captureMonster(player, this.board.monster2);
      }
    });

    // Win/Lose effect logging (G1GE)
    this.eventBus.on('G1GE', (data: unknown) => {
      const d = data as { cmd?: string; args?: string[] };
      if (d.args) {
        for (let i = 1; i < d.args.length - 1; i += 2) {
          const winStr = d.args[i];
          const monId = parseInt(d.args[i + 1], 10);
          const mon = this.libGroup.ml.decode(monId);
          if (mon) {
            const effect = winStr === 'W' ? '胜利效果' : '失败效果';
            this.gameLog.log(`${mon.name} ${effect}触发`);
          }
        }
      }
    });

    // NPC encounter handler (NP phase)
    this.eventBus.on('round:np', async (data: unknown) => {
      const d = data as { npcId?: number; rounderUid?: number };
      if (!d.npcId || !d.rounderUid) return;
      const npcId = d.npcId;
      const rounderUid = d.rounderUid;
      const player = this.board.garden.get(rounderUid);
      if (!player) return;

      // NPC IDs are stored as npcIndex + 1000
      const npcIndex = npcId > 1000 ? npcId - 1000 : npcId;
      const npc = this.libGroup.nl.decode(npcIndex);
      if (!npc) return;

      // Find the NPC's action skill code (NJ01-NJ09, NJT1-NJT2, NJH1-NJH9)
      // Try all NJ skills, use the first valid one
      const actionSkills = npc.skills.filter(s =>
        s.startsWith('NJ') || s.startsWith('NJT') || s.startsWith('NJH'),
      );
      if (actionSkills.length === 0) return;

      let actionSkill: string | undefined;
      let effect: ReturnType<typeof this.npcEffectRegistry.get> | undefined;
      let fuse = '';

      for (const skill of actionSkills) {
        const eff = this.npcEffectRegistry.get(skill);
        if (!eff || !eff.action) continue;
        const f = `${skill},${npc.code}`;
        if (eff.valid && !eff.valid(player, f)) continue;
        actionSkill = skill;
        effect = eff;
        fuse = f;
        break;
      }

      if (!actionSkill || !effect || !effect.action) return;

      // Ask player if they want to use the NPC effect
      const useEffect = await this.getInput(rounderUid,
        `#是否使用NPC效果${npc.name}？##使用##跳过,Y2`, 'NP', '0');
      if (useEffect === '2') return; // Skip NPC effect

      // Collect input if needed (accumulate multi-step args with comma)
      let args = '';
      if (effect.input) {
        let maxSteps = 5; // safety limit
        while (maxSteps-- > 0) {
          const format = await effect.input(player, fuse, args);
          if (!format || format === '') break;
          const input = await this.getInput(rounderUid, format, actionSkill, '0');
          if (!input || input === '' || input === '/') break;
          args = args === '' ? input : `${args},${input}`;
        }
      }

      // Execute NPC effect (skip if no valid args collected)
      if (args === '' && effect.input) return;
      await effect.action(player, fuse, args);

      // Log NPC usage
      this.gameLog.log(`${player.name} 使用NPC效果: ${npc.name} (${actionSkill})`);

      // Draw 2 cards after using NPC effect (per game rules)
      this.gLoop.raiseGMessage(`G0DH,${rounderUid},0,2`);
    });
  }

  /**
   * Decode a card ID to a readable name.
   */
  private decodeCardName(cardId: number): string {
    const tux = this.libGroup.tl.decodeTux(cardId);
    if (tux) return tux.name;

    const mon = this.libGroup.ml.decode(cardId);
    if (mon) return mon.name;

    if (cardId > 1000) {
      const npc = this.libGroup.nl.decode(cardId - 1000);
      if (npc) return npc.name;
    }

    return `Card#${cardId}`;
  }

  /**
   * Hero selection phase. AI players pick heroes from available pool.
   * Players without heroes get default stats.
   */
  private async selectHeroes(): Promise<void> {
    // Skip if heroes were already selected by GameSession
    if (this.heroesSelected) return;

    const availableHeroes = this.libGroup.hl.listAllSeleable(this.config.levelCode);

    this.eventBus.emit('hero_select_start', { availableHeroes });

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

    this.gameLog.log('=== 英雄选择 ===');

    // AI players select heroes (remove selected hero from pool to avoid duplicates)
    const heroPool = [...availableHeroes];
    for (const [uid, aiPlayer] of this.aiPlayers) {
      if (heroPool.length === 0) break;
      const heroId = aiPlayer.selectHero(heroPool);
      const hero = this.libGroup.hl.instanceHero(heroId);
      const player = this.players.get(uid);
      if (hero && player) {
        player.selectHero = heroId;
        player.initFromHero(hero, true, false, false);
        this.gameLog.log(`P${uid} 选择英雄: ${hero.name} (HP:${hero.hp} 力:${hero.str} 敏:${hero.dex})`);
        this.eventBus.emit('hero_selected', { uid, heroId });
        // Remove selected hero from pool
        const idx = heroPool.findIndex(h => h.avatar === heroId);
        if (idx >= 0) heroPool.splice(idx, 1);
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
          this.gameLog.log(`P${player.uid} 选择英雄: ${hero.name} (HP:${hero.hp} 力:${hero.str} 敏:${hero.dex})`);
          this.eventBus.emit('hero_selected', { uid: player.uid, heroId: hero.avatar });
        }
      }
    }
  }

  /**
   * Deal initial hand cards to all alive players.
   */
  private dealCards(): void {
    this.gameLog.log('=== 发牌 ===');
    const cardCount = 3;
    for (const player of this.players.values()) {
      if (player.isAlive) {
        for (let i = 0; i < cardCount; i++) {
          if (this.board.tuxPiles.count > 0) {
            const card = this.board.tuxPiles.dequeue() as number;
            player.tux.push(card);
          }
        }
        this.gameLog.log(`P${player.uid}(${player.name}) 获得 ${player.tux.length} 张手牌`);
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
      this.gameLog.setRound(roundCount);
      console.log(`[Game] Round ${roundCount}: tux=${this.board.tuxPiles.count} mon=${this.board.monPiles.count} eve=${this.board.evePiles.count} monDis=${this.board.monDises.length} eveDis=${this.board.eveDises.length}`);
      this.gameLog.log(`\n=== 第 ${roundCount} 回合 | 当前玩家: P${this.board.rounder.uid} ===`);

      try {
        await this.roundManager.runRound();

        if (this.isGameOver()) {
          break;
        }

        // RoundManager.onTM already advances the rounder, no need to do it again
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
   * Check if the game is over (0 or 1 alive real players, or exhaustion).
   */
  private isGameOver(): boolean {
    // Check for elimination victory
    const alivePlayers = Array.from(this.board.garden.values())
      .filter(p => p.isAlive && p.isReal);
    if (alivePlayers.length <= 1) return true;

    // Check for exhaustion (monster pile empty)
    if (this.board.exhausted) {
      return true;
    }

    return false;
  }

  /**
   * Settle the game: calculate scores, determine winner, return result.
   */
  private settle(): GameResult {
    // Only recalculate scores if not already set by exhaustion handler
    if (!this.board.exhausted) {
      this.board.finalAkaScore = this.calculateAkaScore();
      this.board.finalAoScore = this.calculateAoScore();
    }

    // Determine winner
    const alivePlayers = Array.from(this.board.garden.values())
      .filter(p => p.isAlive && p.isReal);

    let winner: Player | null = null;
    if (alivePlayers.length === 1) {
      winner = alivePlayers[0];
    }

    // Determine reason
    let reason: GameResult['reason'] = 'victory';
    if (this.board.exhausted) {
      reason = 'exhaustion';
    } else if (!winner) {
      reason = 'elimination';
    } else if (this.roundManager.roundNumber >= this.config.maxRounds) {
      reason = 'max_rounds';
    }

    // Log game over
    this.gameLog.log('\n=== 游戏结束 ===');
    if (winner) {
      this.gameLog.log(`胜者: P${winner.uid}(${winner.name}) 阵营${winner.team === 1 ? '仙' : '剑'}`);
    } else {
      this.gameLog.log('平局');
    }
    this.gameLog.log(`总回合: ${this.roundManager.roundNumber} | 仙: ${this.board.finalAkaScore} | 剑: ${this.board.finalAoScore}`);

    // Log player status
    for (const player of this.board.garden.values()) {
      const status = player.isAlive ? '存活' : '阵亡';
      this.gameLog.log(`P${player.uid}(${player.name}) ${status} HP:${player.hp} 阵营:${player.team === 1 ? '仙' : '剑'}`);
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
   * Get input from AI player, InputProvider, or empty string for human players.
   * AI players return synchronously (auto-wrapped in resolved Promise).
   * Network players use InputProvider which returns a Promise that resolves
   * when the player responds over the network.
   */
  private async getInput(uid: number, format: string, code: string, arg: string): Promise<string> {
    const aiPlayer = this.aiPlayers.get(uid);
    const isAI = !!aiPlayer;
    console.log(`[Game:getInput] uid=${uid} isAI=${isAI} format="${format}" code="${code}"`);
    if (aiPlayer) {
      return aiPlayer.getInput(format, code, arg);
    }
    if (this.inputProvider) {
      return this.inputProvider.getInput(uid, format, code, arg);
    }
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
   * Can be called before initialize() — registration is deferred until players exist.
   */
  registerAllAIPlayers(): void {
    this.aiRegistrationPending = true;
    // If players already exist, register immediately
    if (this.players.size > 0) {
      this.doRegisterAIPlayers();
    }
  }

  private doRegisterAIPlayers(): void {
    const strategies = this.config.aiStrategies;
    if (!strategies) return;
    for (let i = 0; i < this.config.playerCount; i++) {
      const uid = i + 1;
      const strategy = strategies[i % strategies.length];
      if (strategy) {
        this.addAIPlayer(uid, strategy);
      }
    }
    this.aiRegistrationPending = false;
  }

  /**
   * Capture a monster as a pet for the given player.
   * Decodes the monster, determines its element, and assigns it to the
   * appropriate pet slot (indexed by element).
   */
  private captureMonster(player: Player, monsterId: number): void {
    const monster = this.libGroup.ml.decode(monsterId);
    if (!monster) return;
    const elemIndex = FiveElementHelper.elem2Index(monster.element);
    if (elemIndex >= 0 && elemIndex < player.pets.length) {
      player.pets[elemIndex] = monsterId;
      this.gameLog.log(`${player.name} 捕获宠物: ${monster.name}`);
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
  getNpcEffectRegistry(): NpcEffectRegistry { return this.npcEffectRegistry; }
  getRuneEffectRegistry(): RuneEffectRegistry { return this.runeEffectRegistry; }
  getEveEffectRegistry(): EveEffectRegistry { return this.eveEffectRegistry; }
  getOperationEffectRegistry(): OperationEffectRegistry { return this.operationEffectRegistry; }
  getMonsterCottage(): MonsterCottage | undefined { return this.monsterCottage; }
  getGameLog(): GameLog { return this.gameLog; }
  getPlayers(): Map<number, Player> { return this.players; }
  getAIPlayers(): Map<number, AIPlayer> { return this.aiPlayers; }
  isRunning(): boolean { return this.running; }
  isInitialized(): boolean { return this.initialized; }
  getConfig(): GameConfig { return { ...this.config }; }

  /** Mark heroes as already selected (by GameSession) to skip duplicate selection in game.run() */
  markHeroesSelected(): void { this.heroesSelected = true; }
}
