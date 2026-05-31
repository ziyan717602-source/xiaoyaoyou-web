/**
 * G-Loop Core - Event processing engine
 * Translation of C# PSDGamepkg.XIG.cs InnerGMessage / SimpleGMessage
 *
 * The G-Loop is the heart of the game engine. It processes G-messages through
 * the priority-based skill resolution system. When a message like "G0OH,1,2,3,1"
 * is sent, the G-Loop:
 * 1. Looks up registered handlers for "G0OH" in the sk02 registry
 * 2. Filters by team (0=all, 1=red, 2=blue)
 * 3. Executes handlers in priority order
 * 4. Each handler can modify, consume, or terminate the event
 * 5. If not terminated, continues with next priority level
 */

import { EventBus, type EventResult } from './event-bus';
import { type GMessage, SimpleGMessage, extractEventKey, parseGCommand } from './g-message';
import { SkillRegistry, type SKE } from './skill-registry';
import type { Board } from '../board';
import type { Player } from '../player';
import { LibGroup } from '../lib-group';
import { NMBLib } from '../card/nmb';
import { FiveElement, type TuxType } from '../../types/enums';

/** G-Loop configuration */
export interface GLoopConfig {
  maxQueueSize: number;
  processTimeout: number;
  enableLogging: boolean;
}

/** UEchoCode - matching C# enum */
export enum UEchoCode {
  STRANGE = 0,
  RE_REQUEST = 1,
  NO_OPTIONS = 2,
  NEXT_STEP = 3,
  END_CANCEL = 4,
  END_ACTION = 5,
  END_TERMIN = 7,
}

/**
 * GLoop - the core event processing engine.
 * Manages message queue and dispatches through the skill registry.
 */
export class GLoop {
  private eventBus: EventBus;
  private board: Board;
  private skillRegistry: SkillRegistry;
  private libGroup: LibGroup;
  private config: GLoopConfig;
  private queue: GMessage[] = [];
  private running = false;
  private processing = false;
  private messageHandler: ((msg: string) => void) | null = null;
  private inputCallback: ((uid: number, format: string) => Promise<string>) | null = null;
  private uvsnCounter = 0;

  constructor(
    eventBus: EventBus,
    board: Board,
    skillRegistry: SkillRegistry,
    libGroup?: LibGroup,
    config?: Partial<GLoopConfig>,
  ) {
    this.eventBus = eventBus;
    this.board = board;
    this.skillRegistry = skillRegistry;
    this.libGroup = libGroup ?? new LibGroup();
    this.config = {
      maxQueueSize: 1000,
      processTimeout: 5000,
      enableLogging: false,
      ...config,
    };
  }

  /**
   * Set a handler for outgoing messages (broadcast to network).
   */
  setMessageHandler(handler: (msg: string) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Set input callback for player decisions during G-message processing.
   */
  setInputCallback(callback: (uid: number, format: string) => Promise<string>): void {
    this.inputCallback = callback;
  }

  /**
   * Run skill dispatch for a round stage code (e.g. "R1ST", "R1GR").
   * Equivalent of C# RunQuadStage / RunQuadMixedStage in XIR.cs.
   * Looks up sk02[stageCode] and dispatches registered handlers by priority.
   */
  async runStage(stageCode: string): Promise<void> {
    // Broadcast stage start: R{rounder}XX,0
    if (this.messageHandler) {
      this.messageHandler(`${stageCode},0`);
    }

    // Look up registered handlers for this stage (use findHandlers for wildcard expansion)
    const handlers = this.skillRegistry.findHandlers(stageCode);
    console.log(`[GLoop:runStage] ${stageCode}: ${handlers.length} handlers found`);
    if (handlers.length > 0) {
      // Full RunQuadMixedStage priority dispatch
      await this.runStageDispatch(stageCode);
    }

    // Broadcast stage end: R{rounder}XX,1
    if (this.messageHandler) {
      this.messageHandler(`${stageCode},1`);
    }

    // ACK
    await this.raiseGMessage('G2AS,0');
  }

  /**
   * Run priority dispatch for a stage code (RunQuadMixedStage equivalent).
   * Iterates SKEs by priority, sends U1 messages to involved players,
   * processes their responses, and handles locked skills.
   */
  private async runStageDispatch(stageCode: string): Promise<void> {
    const skeList = this.skillRegistry.parseToSKEs(stageCode);
    if (skeList.length === 0) return;

    const garden = this.board.garden;
    const involved = new Array(garden.size + 1).fill(false) as boolean[];
    const pris = new Array(garden.size + 1).fill('') as string[];

    let priority = Number.MIN_SAFE_INTEGER;
    let isAllThrough = false;

    const MAX_ITERATIONS = 100;
    let iteration = 0;

    do {
      do {
        iteration++;
        if (iteration > MAX_ITERATIONS) {
          console.error(`[GLoop] runStageDispatch exceeded ${MAX_ITERATIONS} iterations for ${stageCode}`);
          involved.fill(false);
          isAllThrough = true;
          break;
        }

        involved.fill(false);
        pris.fill('');
        const locks: string[] = [];
        const purse: SKE[] = [];
        let isAnySet = false;

        for (const ske of skeList) {
          if (!isAnySet && ske.priorty < priority) continue;

          if (!isAnySet || ske.priorty === priority) {
            // Mark involved based on SKE target
            if (ske.tg > 0 && ske.tg < involved.length) {
              involved[ske.tg] = true;
            } else {
              // No specific target — mark all alive players
              for (const [uid] of garden) {
                if (uid > 0 && uid < involved.length) involved[uid] = true;
              }
            }

            // Check if locked
            if (ske.lock === true) {
              locks.push(`${ske.tg},${stageCode};${ske.name}`);
            }

            purse.push(ske);
            isAnySet = true;
            priority = ske.priorty;
          } else {
            break;
          }
        }

        if (!isAnySet) {
          isAllThrough = true;
          break;
        }

        // Process locks first
        if (locks.length > 0) {
          locks.sort();
          const msg = locks[0];
          const idx = msg.indexOf(',');
          const me = parseInt(msg.substring(0, idx)) || 0;
          const jdx = msg.lastIndexOf(';');
          const mai = msg.substring(idx + 1, jdx);
          const skName = this.decodeSimplifiedCommand(mai);

          const ske = purse.find(s => s.name === skName && s.tg === me);
          if (ske) {
            await this.handleU24Message(me, involved, mai, ske);
          }
          involved[me] = true;
          continue; // Re-validate after lock processing
        }

        // Check if any players are actually involved
        let hasInvolved = false;
        for (let i = 1; i < involved.length; i++) {
          if (involved[i]) { hasInvolved = true; break; }
        }
        if (!hasInvolved) break;

        // Build roads (input format strings) for involved players
        for (let i = 1; i < pris.length; i++) {
          if (pris[i] !== '') {
            pris[i] = pris[i].substring(1); // Remove leading marker
          }
        }

        // Send U1 messages and collect responses
        this.sendOutU1Message(involved, pris, [0, 2]);
        const echo = await this.ukEvenMessage(involved, purse, pris, [0, 2]);

        if (echo === UEchoCode.END_TERMIN) {
          // Skills updated — re-parse
          break;
        }
      } while (!this.isAllClear(involved));

      priority++;
    } while (!isAllThrough);
  }

  /**
   * Send a raw G-command string. This is the primary entry point (RaiseGMessage equivalent).
   */
  async raiseGMessage(cmd: string): Promise<void> {
    if (!cmd.startsWith('G')) return;

    if (this.config.enableLogging) {
      console.log(`[GLoop] Raise (logged): ${cmd}`);
    }

    // G2 messages go through SimpleGMessage100 path
    if (cmd.startsWith('G2')) {
      await this.simpleGMessage100(cmd);
    } else {
      // System-level messages bypass skill registry and go directly to simpleGMessage
      const cmdType = cmd.split(',')[0];
      const SYSTEM_MESSAGES = ['G09P', 'G0QR', 'G0HT', 'G0AX', 'G0CZ', 'G1ZK', 'G1HK'];
      if (SYSTEM_MESSAGES.includes(cmdType)) {
        await this.simpleGMessage(cmd, Number.MIN_SAFE_INTEGER);
      } else {
        await this.innerGMessage(cmd, Number.MIN_SAFE_INTEGER);
      }
    }
  }

  /**
   * InnerGMessage - process with priority control.
   * This is the core dispatch loop from XIG.cs.
   */
  async innerGMessage(cmd: string, priorty: number, depth: number = 0): Promise<void> {
    if (!cmd || !cmd.startsWith('G')) return;

    // Safety: prevent stack overflow from recursive priority escalation
    const MAX_RECURSION_DEPTH = 20;
    if (depth > MAX_RECURSION_DEPTH) {
      console.error(`[GLoop] innerGMessage exceeded recursion depth ${MAX_RECURSION_DEPTH} for ${cmd}`);
      if (this.messageHandler) {
        this.messageHandler('G2AS,0');
      }
      return;
    }

    const zero = extractEventKey(cmd);
    const skTriples = this.skillRegistry.sk02.get(zero);

    if (!skTriples || skTriples.length === 0) {
      // No registered handlers - fall through to simpleGMessage for default behavior
      await this.simpleGMessage(cmd, Number.MIN_SAFE_INTEGER);
      if (this.messageHandler) {
        this.messageHandler('G2AS,0');
      }
      return;
    }

    const skeList = this.skillRegistry.parseToSKEs(zero);
    const involved = new Array(this.board.garden.size + 1).fill(false);
    const roads = new Array(this.board.garden.size + 1).fill('');
    let isTermini = false;
    let isAnySet = false;

    // Safety limit to prevent infinite loops in lock-processing path
    const MAX_INNER_ITERATIONS = 100;
    let iterationCount = 0;
    let safetyBreak = false;

    do {
      iterationCount++;
      if (iterationCount > MAX_INNER_ITERATIONS) {
        console.error(`[GLoop] innerGMessage exceeded ${MAX_INNER_ITERATIONS} iterations for ${cmd}, breaking`);
        safetyBreak = true;
        break;
      }

      // Reset state for this iteration
      roads.fill('');
      isAnySet = false;
      isTermini = false;
      involved.fill(false);
      const locks: string[] = [];
      const purse: SKE[] = [];

      for (const ske of skeList) {
        if (!isAnySet && ske.priorty < priorty) continue;

        if (!isAnySet || ske.priorty === priorty) {
          if (ske.name.startsWith('~')) {
            // Basic handler - pass through to SimpleGMessage
            await this.simpleGMessage(cmd, ske.priorty);
            if (this.messageHandler) {
              this.messageHandler('G2AS,0');
            }
            return;
          }

          // Try to match this SKE
          const matched = this.ske2Message(ske, cmd, involved, roads, locks);
          if (matched) purse.push(ske);
          isAnySet = isAnySet || matched;
          priorty = ske.priorty;
        } else {
          break;
        }
      }

      if (!isAnySet) {
        // No skill handlers matched - fall through to simpleGMessage for default behavior
        await this.simpleGMessage(cmd, Number.MIN_SAFE_INTEGER);
        if (this.messageHandler) {
          this.messageHandler('G2AS,0');
        }
        return;
      }

      // Process locks first
      if (locks.length > 0) {
        locks.sort();
        const msg = locks[0];
        const idx = msg.indexOf(',');
        const me = parseInt(msg.substring(0, idx)) || 0;
        const jdx = msg.lastIndexOf(';');
        const mai = msg.substring(idx + 1, jdx);
        const skName = this.decodeSimplifiedCommand(mai);

        const ske = purse.find(s => s.name === skName && s.tg === me);
        if (ske) {
          const echo = await this.handleU24Message(me, involved, mai, ske);
          if (echo === UEchoCode.END_TERMIN) {
            isTermini = true;
          } else if (echo === UEchoCode.END_ACTION) {
            isAnySet = true;
          }
        }
        await this.raiseGMessage('G2AS,0');
        involved[me] = true;
        continue;
      }

      // Process involved players
      // If global flag is set (involved[0]), fill all players as involved
      if (involved[0]) {
        involved.fill(true);
      }
      const hasInvolved = involved.some((v, idx) => idx > 0 && v);
      if (hasInvolved && !isTermini) {
        for (let i = 0; i < roads.length; i++) {
          if (roads[i] !== '') {
            roads[i] = roads[i].substring(1);
          }
        }

        const sinaG = new Array(this.board.garden.size + 1).fill(2);
        for (let i = 1; i <= this.board.garden.size; i++) {
          const py = this.board.garden.get(i);
          if (py && !py.isTPOpt) sinaG[i] = 3;
        }

        this.sendOutU1Message(involved, roads, sinaG);
        const echo = await this.ukEvenMessage(involved, purse, roads, sinaG);
        if (echo === UEchoCode.END_TERMIN) {
          isTermini = true;
        } else if (echo === UEchoCode.END_ACTION) {
          isAnySet = true;
        }
      }
    } while (!this.isAllClear(involved) && !isTermini);

    if (safetyBreak) {
      // Safety limit was hit - send ACK but don't recurse to avoid infinite chain
      if (this.messageHandler) {
        this.messageHandler('G2AS,0');
      }
      return;
    }

    await this.raiseGMessage('G2AS,0');
    if (!isTermini) {
      await this.innerGMessage(cmd, priorty + 1, depth + 1);
    }
  }

  /**
   * SimpleGMessage - basic handling without skill invocation.
   * Handles the default behavior for each message type.
   */
  async simpleGMessage(cmd: string, priority: number): Promise<void> {
    const args = cmd.split(',');
    const cmdType = args[0];

    // Handle default G0/G1 commands with actual state mutations
    await this.handleDefaultCommand(cmdType, args, cmd);

    // System-level messages should not be emitted to EventBus
    // as they would trigger skill handlers that expect player context
    const SYSTEM_MESSAGES = ['G09P', 'G0QR', 'G0HT', 'G0AX', 'G0CZ', 'G1ZK', 'G1HK'];
    if (!SYSTEM_MESSAGES.includes(cmdType)) {
      // Emit to event bus for downstream handlers
      await this.eventBus.emitAsync(cmdType, {
        cmd,
        args,
        priority,
        board: this.board,
      });
    }

    // Broadcast the message
    if (this.messageHandler) {
      this.messageHandler(cmd);
    }
  }

  /**
   * Handle default G0/G1 command state mutations.
   * Translates C# XIG.cs SimpleGMessage/SimpleGMessage100 logic.
   */
  private async handleDefaultCommand(cmdType: string, args: string[], cmd: string): Promise<void> {
    switch (cmdType) {
      case 'G0OH': this.handleDamage(args); break;
      case 'G0ZH': await this.handleDeathCheck(); break;
      case 'G0IT': this.handleAddCards(args); break;
      case 'G0OT': this.handleRemoveCards(args); break;
      case 'G0IA': this.handleAddStatBonus(args); break;
      case 'G0OA': this.handleRemoveStatBonus(args); break;
      case 'G0IH': this.handleHeal(args); break;
      case 'G0IP': this.handleCombatPower(args); break;
      case 'G0QZ': this.handleDiscard(args); break;
      case 'G0HZ': this.handleTangled(args); break;
      case 'G0DS': this.handleFreeze(args); break;
      case 'G0DH': this.handleDrawDiscard(args); break;
      case 'G0CC': this.handleCardUse(args); break;
      case 'G0ZW': await this.handleNineteen(args); break;
      case 'G0IY': this.handleHeroChange(args); break;
      case 'G1TH': await this.handleHarm(args); break;
      case 'G1IU': this.handleInsertPZone(args); break;
      case 'G1DI': this.handleDisposal(args); break;
      case 'G09P': this.handlePondRefresh(args); break;
      case 'G1GE': this.handleWinLoseEffect(args); break;
      case 'G0QR': this.handleQuarterReset(args); break;
      case 'G0HC': this.handleHarvestPet(args); break;
      case 'G0HD': this.handleObtainPet(args); break;
      case 'G1WJ': this.handleExhaustion(args); break;
      case 'G0CZ': this.handleZPCounter(args); break;
      case 'G0HG': this.handleGiveCards(args); break;
      case 'G0HT': this.handleG0HT(args); break;
      case 'G0OY': this.handleLeaveGame(args); break;
      case 'G1EV': this.handleEventCard(args); break;
      case 'G0IV': this.handlePushCos(args); break;
      case 'G0OV': this.handlePopCos(args); break;
      case 'G0OF': this.handleRemoveRune(args); break;
      case 'G0IE': this.handleEnablePetEffect(args); break;
      case 'G0OE': this.handleDisablePetEffect(args); break;
      case 'G0HQ': await this.handleCardTransfer(args); break;
      case 'G0IS': this.handleAddSkill(args); break;
      case 'G0OS': this.handleRemoveSkill(args); break;
      case 'G0CD': this.handleCardTarget(args, cmd); break;
      case 'G0CE': this.handleCardExecute(args, cmd); break;
      case 'G1CW': this.handleTwoTargetCard(args, cmd); break;
      case 'G0XZ': this.handlePeekPile(args); break;
      case 'G0ZB': await this.handleEquipStandard(args, cmd); break;
      case 'G0ZJ': this.handleEquipSlotVariation(args); break;
    }
  }

  /**
   * G0OH - Apply damage to a player.
   * Format: G0OH,target,source,element,damage,mask
   * Mask: 0=normal, 1=ALIVE_HARD (cap at HP-1), 2=ALIVE (cap at max(1,HP-1))
   */
  private handleDamage(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const damage = parseInt(args[4], 10);
    const mask = parseInt(args[5] ?? '0', 10);
    const target = this.board.garden.get(targetUid);
    if (!target || !target.isAlive || damage <= 0) return;

    let actualDamage = Math.min(damage, target.hp);

    // Apply alive masks to prevent lethal damage
    if (mask === 1) {
      // ALIVE_HARD: reduce to HP-1 (can survive with 1 HP minimum? No - reduces damage so HP stays >= 1)
      actualDamage = Math.min(actualDamage, target.hp - 1);
    } else if (mask === 2) {
      // ALIVE: reduce to max(1, HP-1)
      actualDamage = Math.min(actualDamage, target.hp - 1);
      if (actualDamage < 0) actualDamage = 0;
    }

    if (actualDamage > 0) {
      target.hp -= actualDamage;
    }
  }

  /**
   * G0ZH - Death check with devotion (倾慕).
   * Phase 1 (P100): Try to save dying players via spouse devotion.
   * Phase 2 (P200): Kill any players still at HP 0.
   *
   * C# reference: XIG.cs lines 166-342 (G0ZH handler).
   */
  private async handleDeathCheck(): Promise<void> {
    // Phase 1: Devotion - try to save HP-0 players via spouse connection
    this.processDevotion();

    // Phase 2: Kill - any remaining HP-0 players die
    const dying: number[] = [];
    for (const player of this.board.garden.values()) {
      if (player.isAlive && player.hp <= 0) {
        dying.push(player.uid);
      }
    }

    if (dying.length > 0) {
      await this.raiseGMessage(`G0ZW,${dying.join(',')}`);
    }
  }

  /**
   * Process devotion (倾慕) for dying players.
   * Each dying player checks their hero's Spouses list and ExSpouses.
   * Found spouses each lose 1 HP; the dying player gains HP equal to the number of spouses.
   * Each player can only be saved once per death check (loved flag).
   *
   * Special spouse codes:
   * !1 = any alive player (chooses via input - simplified: all alive)
   * !5 = any female player
   * !6 = any male player (excluding self)
   */
  private processDevotion(): void {
    // Collect all alive players with HP == 0 who haven't been loved yet
    const dyingPlayers: Player[] = [];
    for (const player of this.board.garden.values()) {
      if (player.isAlive && player.hp <= 0 && !player.loved) {
        dyingPlayers.push(player);
      }
    }

    if (dyingPlayers.length === 0) return;

    // Track HP changes to apply atomically
    const hpGains = new Map<number, number>(); // uid -> HP gain
    const hpLosses = new Map<number, number>(); // uid -> HP loss

    for (const dying of dyingPlayers) {
      const hero = this.libGroup.hl.instanceHero(dying.selectHero);
      if (!hero) continue;

      // Combine hero.spouses and player.exSpouses
      const spouseEntries = [...new Set([...hero.spouses, ...dying.exSpouses])];

      // Find matching spouses
      const matchedSpouses: Player[] = [];
      let entityExists = false; // For !2/!8/!9: monster/weapon existence

      for (const entry of spouseEntries) {
        if (entry.startsWith('!')) {
          // Special spouse code
          const code = parseInt(entry.substring(1), 10);
          const result = this.findSpecialSpouse(dying, code);
          matchedSpouses.push(...result.players);
          if (result.exists) entityExists = true;
        } else {
          // Direct spouse ID - find player whose selectHero or hero archetype matches
          const spouseHeroId = parseInt(entry, 10);
          if (isNaN(spouseHeroId)) continue;

          for (const candidate of this.board.garden.values()) {
            if (!candidate.isAlive || candidate.hp <= 0 || candidate.uid === dying.uid) continue;
            if (candidate.selectHero === spouseHeroId) {
              matchedSpouses.push(candidate);
              continue;
            }
            // Check archetype
            const candidateHero = this.libGroup.hl.instanceHero(candidate.selectHero);
            if (candidateHero && candidateHero.archetype === spouseHeroId) {
              matchedSpouses.push(candidate);
            }
          }
        }
      }

      if (matchedSpouses.length > 0 || entityExists) {
        dying.loved = true;

        // Dying player gains HP equal to number of matched spouses + 1 if entity exists
        const currentGain = hpGains.get(dying.uid) ?? 0;
        hpGains.set(dying.uid, currentGain + matchedSpouses.length + (entityExists ? 1 : 0));

        // Each spouse loses 1 HP
        for (const spouse of matchedSpouses) {
          const currentLoss = hpLosses.get(spouse.uid) ?? 0;
          hpLosses.set(spouse.uid, currentLoss + 1);
        }
      }
    }

    // Apply HP changes
    for (const [uid, gain] of hpGains) {
      const player = this.board.garden.get(uid);
      if (player) {
        player.hp = Math.min(player.hp + gain, player.hpBase);
      }
    }

    for (const [uid, loss] of hpLosses) {
      const player = this.board.garden.get(uid);
      if (player && player.isAlive) {
        player.hp = Math.max(0, player.hp - loss);
      }
    }

    // Chain reactions are handled by the G-Loop's recursive raiseGMessage:
    // G0ZW triggers death effects which may cause more HP loss → G0ZH re-check
  }

  /**
   * Find players matching a special spouse code.
   * Returns { players, exists } where:
   * - players: matched Player[] (each loses 1 HP)
   * - exists: true if a monster/weapon entity was found (dying player gains 1 HP, no one loses)
   */
  private findSpecialSpouse(dying: Player, code: number): { players: Player[]; exists: boolean } {
    const players: Player[] = [];

    switch (code) {
      case 1: // !1: Any alive player (simplified - all alive players)
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.uid !== dying.uid) {
            players.push(p);
          }
        }
        break;

      case 2: // !2: 水魔兽 (GS04) exists on board/pets/tokenExcl/luggage
        if (this.isMonsterPresent('GS04')) {
          return { players: [], exists: true };
        }
        break;

      case 3: // !3: All alive players whose hero Bio contains "A"
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.uid !== dying.uid) {
            const hero = this.libGroup.hl.instanceHero(p.selectHero);
            if (hero && hero.bio.includes('A')) {
              players.push(p);
            }
          }
        }
        break;

      case 4: // !4: All alive players whose hero Bio contains "B"
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.uid !== dying.uid) {
            const hero = this.libGroup.hl.instanceHero(p.selectHero);
            if (hero && hero.bio.includes('B')) {
              players.push(p);
            }
          }
        }
        break;

      case 5: // !5: Any female player
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.gender === 'F' && p.uid !== dying.uid) {
            players.push(p);
          }
        }
        break;

      case 6: // !6: Any male player (excluding self)
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.gender === 'M' && p.uid !== dying.uid) {
            players.push(p);
          }
        }
        break;

      case 7: // !7: All alive players whose hero Bio contains "D"
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.uid !== dying.uid) {
            const hero = this.libGroup.hl.instanceHero(p.selectHero);
            if (hero && hero.bio.includes('D')) {
              players.push(p);
            }
          }
        }
        break;

      case 8: // !8: 魔剑 (WQ04) equipped by any player
        if (this.isWeaponPresent('WQ04')) {
          return { players: [], exists: true };
        }
        break;

      case 9: // !9: TR金翅凤凰 (GFT2) exists on board/pets/tokenExcl/luggage
        if (this.isMonsterPresent('GFT2')) {
          return { players: [], exists: true };
        }
        break;

      default:
        break;
    }

    return { players, exists: false };
  }

  /**
   * Check if a monster card exists anywhere (board slots, player pets, tokenExcl, luggage).
   */
  private isMonsterPresent(monsterCode: string): boolean {
    const card = this.libGroup.ml.encode(monsterCode);
    if (card === 0) return false;

    // Check board monster slots
    if (this.board.monster1 === card || this.board.monster2 === card) return true;

    // Check all players
    for (const p of this.board.garden.values()) {
      if (!p.isAlive) continue;
      // Pets array
      if (p.pets.includes(card)) return true;
      // TokenExcl: "M" + cardId
      if (p.tokenExcl.includes(`M${card}`)) return true;
      // Luggage capacities
      const lug = this.libGroup.tl.decodeTux(p.trove);
      if (lug && 'capacities' in lug && (lug as { capacities: string[] }).capacities.includes(`M${card}`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a weapon card is equipped by any player (equipment, tokenExcl, luggage).
   */
  private isWeaponPresent(tuxCode: string): boolean {
    const tux = this.libGroup.tl.encodeTuxCode(tuxCode);
    if (!tux) return false;
    const cardId = (tux as unknown as { singleEntry: number }).singleEntry ?? 0;
    if (cardId === 0) return false;

    for (const p of this.board.garden.values()) {
      if (!p.isAlive) continue;
      // All equipment slots
      if (p.listOutAllEquips().includes(cardId)) return true;
      // TokenExcl: "C" + cardId
      if (p.tokenExcl.includes(`C${cardId}`)) return true;
    }
    return false;
  }

  /**
   * G0IT - Add cards to player hand.
   * Format: G0IT,target,cardId[,cardId2,...]
   */
  private handleAddCards(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    for (let i = 2; i < args.length; i++) {
      const cardId = parseInt(args[i], 10);
      if (cardId > 0) {
        target.tux.push(cardId);
      }
    }
  }

  /**
   * G0OT - Remove cards from player hand.
   * Format: G0OT,target,cardId[,cardId2,...]
   */
  private handleRemoveCards(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    for (let i = 2; i < args.length; i++) {
      const cardId = parseInt(args[i], 10);
      const idx = target.tux.indexOf(cardId);
      if (idx >= 0) {
        target.tux.splice(idx, 1);
      }
      // Also unequip if it's an equipped card
      if (target.weapon === cardId) target.weapon = 0;
      if (target.armor === cardId) target.armor = 0;
      if (target.trove === cardId) target.trove = 0;
      if (target.exEquip === cardId) target.exEquip = 0;
    }
  }

  /**
   * G0IA - Add stat bonus.
   * Format: G0IA,target,statType,bonus
   * statType: 0=STR, 1=DEX
   */
  private handleAddStatBonus(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const statType = parseInt(args[2], 10);
    const bonus = parseInt(args[3], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    if (statType === 0) {
      // STR
      target.mSTRb += bonus;
      if (this.board.poolEnabled) {
        target.strC += bonus;
      }
    } else if (statType === 1) {
      // DEX
      target.mDEXb += bonus;
      if (this.board.poolEnabled) {
        target.dexC += bonus;
      }
    }
  }

  /**
   * G0OA - Remove stat bonus.
   * Format: G0OA,target,statType,bonus
   */
  private handleRemoveStatBonus(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const statType = parseInt(args[2], 10);
    const bonus = parseInt(args[3], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    if (statType === 0) {
      target.mSTRb -= bonus;
      if (this.board.poolEnabled) {
        target.strC -= bonus;
      }
    } else if (statType === 1) {
      target.mDEXb -= bonus;
      if (this.board.poolEnabled) {
        target.dexC -= bonus;
      }
    }
  }

  /**
   * G0IH - Heal a player.
   * Format: G0IH,target,source,element,heal,mask
   * Clamps heal to (hpBase - hp).
   */
  private handleHeal(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const heal = parseInt(args[4], 10);
    const target = this.board.garden.get(targetUid);
    if (!target || !target.isAlive || heal <= 0) return;

    const maxHeal = target.hpBase - target.hp;
    const actualHeal = Math.min(heal, maxHeal);
    if (actualHeal > 0) {
      target.hp += actualHeal;
    }
  }

  /**
   * G0IP - Combat power change (pool increment).
   * Format: G0IP,side,delta
   * side: team number (1 or 2)
   */
  private handleCombatPower(args: string[]): void {
    if (!this.board.poolEnabled) return;

    const side = parseInt(args[1], 10);
    const delta = parseInt(args[2], 10);
    if (isNaN(delta)) return;

    if (side === this.board.rounder.team) {
      this.board.rPool += delta;
    } else {
      this.board.oPool += delta;
    }
  }

  /**
   * G0QZ - Discard cards from hand.
   * Format: G0QZ,target,cardId[,cardId2,...]
   * Broadcasts E0QZ and raises G0OT.
   */
  private handleDiscard(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    const cards: number[] = [];
    for (let i = 2; i < args.length; i++) {
      const cardId = parseInt(args[i], 10);
      if (cardId > 0) {
        cards.push(cardId);
      }
    }

    if (cards.length > 0) {
      // Remove cards from hand
      for (const cardId of cards) {
        const idx = target.tux.indexOf(cardId);
        if (idx >= 0) {
          target.tux.splice(idx, 1);
        }
      }
      // Add to discard pile
      this.board.tuxDises.push(...cards);
    }
  }

  /**
   * G0HZ - Tangled/fight with monster.
   * Format: G0HZ,target,monsterId
   */
  private handleTangled(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const monsterId = parseInt(args[2], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    if (monsterId === 0) {
      // No monster - neutral result
      this.board.fightTangled = false;
    } else {
      // Set monster2 and mark as tangled
      this.board.monster2 = monsterId;
      this.board.fightTangled = true;

      // Add monster's STR to opponent pool
      const mon = this.board.battler;
      if (mon) {
        const oppSide = target.oppTeam;
        if (oppSide === this.board.rounder.team) {
          this.board.rPool += mon.str;
        } else {
          this.board.oPool += mon.str;
        }
      }
    }
  }

  /**
   * G0DS - Freeze a player (prevent actions).
   * Format: G0DS,target
   */
  private handleFreeze(args: string[]): void {
    const targetUid = parseInt(args[1], 10);
    const target = this.board.garden.get(targetUid);
    if (!target) return;

    target.immobilized = true;
  }

  /**
   * G1DI - Card disposal (move cards to discard pile).
   * Format: G1DI,zone,cards...
   */
  private handleDisposal(args: string[]): void {
    const zone = parseInt(args[1], 10);
    for (let i = 2; i < args.length; i++) {
      const cardId = parseInt(args[i], 10);
      if (cardId > 0) {
        if (zone === 0) {
          this.board.tuxDises.push(cardId);
        } else if (zone === 1) {
          this.board.monDises.push(cardId);
        } else if (zone === 2) {
          this.board.eveDises.push(cardId);
        }
      }
    }
  }

  /**
   * G09P - PondRefresh: recalculate hit checks and pool values.
   * Format: G09P,checkHit (0=check hit, 1=skip hit check)
   * Broadcasts E09P with pool values.
   */
  private handlePondRefresh(args: string[]): void {
    const checkHit = args[1] === '0';

    if (checkHit) {
      // Recalculate hit checks for supporter, hinder, and drums
      const battler = this.board.battler;
      if (battler) {
        const hit = (p: import('../player').Player): boolean => {
          if (p.dexI > 0) return true;
          if (p.dexI === 0) return p.dex >= battler.agl;
          return false;
        };

        if (this.board.hinder) {
          this.board.hinderSucc = hit(this.board.hinder);
        }
        if (this.board.supporter) {
          this.board.supportSucc = hit(this.board.supporter);
        }
        for (const [p] of this.board.rDrums) {
          this.board.rDrums.set(p, hit(p));
        }
        for (const [p] of this.board.oDrums) {
          this.board.oDrums.set(p, hit(p));
        }
      }
    }

    // Broadcast pool values: E09P,1,RTeam,RPool,OTeam,OPool
    const rPool = this.board.calculateRPool();
    const oPool = this.board.calculateOPool();
    if (this.messageHandler) {
      this.messageHandler(`E09P,1,${this.board.rounder.team},${rPool},${this.board.rounder.oppTeam},${oPool}`);
    }
  }

  /**
   * G1GE - Win/Lose effect dispatch for monsters.
   * Format: G1GE,W/L,monsterId[,W/L,monsterId2,...]
   * Calls monster.winEff() or monster.loseEff() which raise G1TH (harm) messages.
   */
  private handleWinLoseEffect(args: string[]): void {
    for (let i = 1; i < args.length - 1; i += 2) {
      const winStr = args[i];
      const monId = parseInt(args[i + 1], 10);
      const monster = this.libGroup.ml.decode(monId);
      if (!monster) continue;

      if (winStr === 'W') {
        monster.winEff();
      } else if (winStr === 'L') {
        monster.loseEff();
      }
    }
  }

  /**
   * G0QR - Quarter Reset: enforce hand limit.
   * Format: G0QR,who
   * If player has more cards than tuxLimit, raise G0DH type 1 (player chooses discard).
   */
  private handleQuarterReset(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;

    const excess = player.tux.length - player.tuxLimit;
    if (excess > 0) {
      this.raiseGMessage(`G0DH,${uid},1,${excess}`);
    }
  }

  /**
   * G0HC - HarvestPet: capture monster as pet.
   * Format: G0HC,0,Farmer,Farmland,mask,pet1,pet2,...
   * mask: bits 0-1=Treaty(0=NL,1=KOKAN,2=ACTIVE,3=PASSIVE), bit2=Trophy, bit3=Reposit, bit4=Plow
   * For AI: simplified - auto-assign to element slot (overwrite if conflict).
   */
  private handleHarvestPet(args: string[]): void {
    const type = parseInt(args[1], 10);
    if (type !== 0) return; // Only handle harvest (0), not trade (1)

    const farmer = parseInt(args[2], 10);
    const mask = parseInt(args[4], 10);
    const pets: number[] = [];
    for (let i = 5; i < args.length; i++) {
      const petId = parseInt(args[i], 10);
      if (petId > 0) pets.push(petId);
    }

    const player = this.board.garden.get(farmer);
    if (!player || pets.length === 0) return;

    // Raise G0HD to broadcast the pet assignment.
    // In production, pet capture is also handled by game.ts round:vs handler,
    // but this broadcast is needed for client state sync.
    const trophy = (mask >> 2) & 1;
    const petList = pets.join(',');
    this.raiseGMessage(`G0HD,${farmer},0,${trophy},${petList}`);
  }

  /**
   * G0HD - ObtainPet: assign pet to player's pet slot.
   * Format: G0HD,Farmer,Farmland,Trophy,pet1,pet2,...
   */
  private handleObtainPet(args: string[]): void {
    const farmer = parseInt(args[1], 10);
    const trophy = parseInt(args[3], 10);

    const player = this.board.garden.get(farmer);
    if (!player) return;

    for (let i = 4; i < args.length; i++) {
      const petId = parseInt(args[i], 10);
      if (petId <= 0) continue;

      const monster = this.libGroup.ml.decode(petId);
      if (!monster) continue;

      const elemIndex = this.elementToIndex(monster.element);
      if (elemIndex >= 0 && elemIndex < player.pets.length) {
        player.pets[elemIndex] = petId;
      }
    }
  }

  /**
   * Convert FiveElement to array index (0-6).
   */
  private elementToIndex(element: import('../card/monster').Monster['element']): number {
    const map: Record<string, number> = {
      [FiveElement.AQUA]: 0,
      [FiveElement.AGNI]: 1,
      [FiveElement.THUNDER]: 2,
      [FiveElement.AERO]: 3,
      [FiveElement.SATURN]: 4,
      [FiveElement.YINN]: 5,
      [FiveElement.SOLARIS]: 6,
    };
    return map[element as string] ?? -1;
  }

  /**
   * G0CZ - ZP (battle card) counter management.
   * Format: G0CZ,mode[,uid]
   * mode 0: decrement RestZP for uid (card used)
   * mode 1: set RestZP to 1 for uid (restore one play)
   * mode 2: set all alive players' RestZP to 1
   */
  private handleZPCounter(args: string[]): void {
    const mode = parseInt(args[1], 10);
    if (mode === 0) {
      // Decrement RestZP for a specific player
      const uid = parseInt(args[2], 10);
      const player = this.board.garden.get(uid);
      if (player) {
        player.restZP = Math.max(0, player.restZP - 1);
      }
      // Broadcast notification
      if (this.messageHandler) {
        this.messageHandler(`E0CZ,${uid},${player?.restZP ?? 0}`);
      }
    } else if (mode === 1) {
      // Set RestZP to 1 for a specific player
      const uid = parseInt(args[2], 10);
      const player = this.board.garden.get(uid);
      if (player) {
        player.restZP = 1;
      }
      if (this.messageHandler) {
        this.messageHandler(`E0CZ,${uid},1`);
      }
    } else if (mode === 2) {
      // Set all alive players' RestZP to 1
      for (const player of this.board.garden.values()) {
        if (player.isAlive) {
          player.restZP = 1;
        }
      }
      if (this.messageHandler) {
        this.messageHandler('E0CZ,0,1');
      }
    }
  }

  /**
   * G1EV - Event card processing.
   * Format: G1EV,trigger,0
   * Priority 100: Dequeue from evePiles, set board.eve, check silence
   * Priority 200: Call eve.Action(triggerPlayer), remove silence
   */
  private handleEventCard(args: string[]): void {
    const triggerUid = parseInt(args[1], 10);
    const trigger = this.board.garden.get(triggerUid);
    if (!trigger) return;

    // Priority 100: Dequeue event card
    if (this.board.evePiles.count > 0) {
      const eveCard = this.board.evePiles.dequeue() as number;

      // Discard previous event if one exists
      if (this.board.eve !== 0) {
        this.board.eveDises.push(this.board.eve);
      }

      this.board.eve = eveCard;

      // Broadcast event card draw with card ID
      if (this.messageHandler) {
        this.messageHandler(`G1EV,${triggerUid},${eveCard}`);
        this.messageHandler('G2IN,2,1');
      }

      // Decode evenement and check silence
      const eve = this.libGroup.el.decodeEvenement(eveCard);
      if (eve !== null) {
        if (eve.isSilence()) {
          this.board.silence.add(eve.code);
        }

        // Priority 200: Execute event action
        // EveActionDelegate only takes (player)
        eve.action(trigger);

        // Remove silence after execution
        if (eve.isSilence()) {
          this.board.silence.delete(eve.code);
        }
      }
    }
  }

  /**
   * G1WJ - Game over by exhaustion (monster pile empty).
   * Calculate pet scores and determine winner.
   * Format: G1WJ,0
   */
  private handleExhaustion(_args: string[]): void {
    // Calculate pet scores for each team
    let akaScore = 0;
    let aoScore = 0;

    for (const player of this.board.garden.values()) {
      if (!player.isAlive) continue;

      for (const petId of player.pets) {
        if (petId <= 0) continue;
        const monster = this.libGroup.ml.decode(petId);
        if (!monster) continue;

        const petPower = monster.str;
        if (player.team === 1) {
          akaScore += petPower;
        } else {
          aoScore += petPower;
        }
      }
    }

    this.board.finalAkaScore = akaScore;
    this.board.finalAoScore = aoScore;
    this.board.exhausted = true;

    this.eventBus.emit('game:exhaustion', { akaScore, aoScore });
  }

  /**
   * G0DH - Draw or discard cards.
   * Format: G0DH,me,loseType,n
   * loseType: 0=draw, 1=discard chosen, 2=discard random, 3=discard all
   */
  private handleDrawDiscard(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const loseType = parseInt(args[2], 10);
    const n = parseInt(args[3], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;

    if (loseType === 0) {
      // Draw n cards from tuxPiles
      for (let i = 0; i < n; i++) {
        if (this.board.tuxPiles.count > 0) {
          const card = this.board.tuxPiles.dequeue() as number;
          player.tux.push(card);
        }
      }
    } else if (loseType === 1) {
      // Discard first n cards (chosen discard handled by skill system)
      const toDiscard = player.tux.slice(0, n);
      for (const card of toDiscard) {
        const idx = player.tux.indexOf(card);
        if (idx >= 0) {
          player.tux.splice(idx, 1);
          this.board.tuxDises.push(card);
        }
      }
    } else if (loseType === 2) {
      // Discard n random cards
      const hand = [...player.tux];
      for (let i = hand.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [hand[i], hand[j]] = [hand[j], hand[i]];
      }
      const toDiscard = hand.slice(0, Math.min(n, hand.length));
      for (const card of toDiscard) {
        const idx = player.tux.indexOf(card);
        if (idx >= 0) {
          player.tux.splice(idx, 1);
          this.board.tuxDises.push(card);
        }
      }
    } else if (loseType === 3) {
      // Discard all cards (except protected)
      const allCards = player.listOutAllCards();
      for (const card of allCards) {
        if (this.board.protectedTux.includes(card)) continue;
        player.removeCard(card, this.board.tuxDises);
      }
    }
  }

  /**
   * G0CC - Card use preparation.
   * Format: G0CC,provider,trigger,type,cardId1,cardId2,...
   * Moves cards from player hand to pendingTux queue.
   */
  private handleCardUse(args: string[]): void {
    const provider = parseInt(args[1], 10);
    const trigger = parseInt(args[2], 10);
    // args[3] is card type (e.g. "TP02"), card IDs start at args[4]
    const cardIds: number[] = [];
    for (let i = 4; i < args.length; i++) {
      const id = parseInt(args[i], 10);
      if (id > 0) cardIds.push(id);
    }

    if (provider !== 0) {
      // Cards from player's hand - move to pendingTux
      const player = this.board.garden.get(provider);
      if (player) {
        for (const cardId of cardIds) {
          this.board.pendingTux.enqueue(`${trigger},G0CC,${cardId}`);
          // Remove from player's hand
          const idx = player.tux.indexOf(cardId);
          if (idx >= 0) {
            player.tux.splice(idx, 1);
          }
        }
      }
    } else {
      // Cards from deck source
      for (const cardId of cardIds) {
        this.board.pendingTux.enqueue(`${trigger},G0CC,${cardId}`);
      }
    }
  }

  /**
   * G0ZW - Nineteen / kill players.
   * Format: G0ZW,who1,who2,...
   * Multi-phase death processing:
   * P0: Mark as nineteen (pending death)
   * P100: Kill players (IsAlive=false, remove from turn order)
   * P200: Discard all cards/pets/runes
   * P300: Legacy - dying player chooses teammate to draw 2 cards
   * P400: Leave game (G0OY)
   */
  private async handleNineteen(args: string[]): Promise<void> {
    const uids: number[] = [];
    for (let i = 1; i < args.length; i++) {
      const uid = parseInt(args[i], 10);
      if (uid > 0) uids.push(uid);
    }

    // P0: Mark as nineteen (only alive players can be marked)
    for (const uid of uids) {
      const player = this.board.garden.get(uid);
      if (player && player.isAlive) {
        player.nineteen = true;
      }
    }

    // P100: Kill - set IsAlive=false for nineteen players who are still alive
    for (const uid of uids) {
      const player = this.board.garden.get(uid);
      if (player && player.nineteen && player.isAlive) {
        player.isAlive = false;
        player.isTared = false;
        player.hp = 0;
      }
    }

    // Collect all nineteen players for post-death processing
    const deadPlayers: Player[] = [];
    for (const uid of uids) {
      const player = this.board.garden.get(uid);
      if (player && player.nineteen) {
        deadPlayers.push(player);
      }
    }

    // P200: Discard all cards, pets, runes (only for newly killed players)
    for (const player of deadPlayers) {
      if (!player.isAlive) {
        const allCards = player.listOutAllCards();
        for (const card of allCards) {
          player.removeCard(card, this.board.tuxDises);
        }
        player.pets.fill(0);
        player.escue.length = 0;
        player.runes.length = 0;
      }
    }

    // P300: Legacy - dying player chooses teammate to draw 2 cards
    for (const player of deadPlayers) {
      if (player.isAlive) continue;

      const teammates = [...this.board.garden.values()].filter(
        p => p.isAlive && p.team === player.team && p.uid !== player.uid,
      );

      if (teammates.length === 0) continue;

      let chosenUid: number;

      if (this.inputCallback && teammates.length > 1) {
        const teammateList = teammates.map(p => `T${p.uid}`).join('p');
        const format = `#遗言获得补牌的,T1(p${teammateList})`;
        const decision = await this.inputCallback(player.uid, format);
        chosenUid = parseInt(decision.replace('T', ''), 10) || teammates[0].uid;
      } else {
        chosenUid = teammates[0].uid;
      }

      await this.raiseGMessage(`G0HG,${chosenUid},2`);
    }

    // P400: Leave game - raise G0OY for all dead nineteen players
    if (deadPlayers.length > 0) {
      const leaveArgs = deadPlayers.filter(p => !p.isAlive).map(p => `2,${p.uid}`).join(',');
      if (leaveArgs) {
        await this.raiseGMessage(`G0OY,${leaveArgs}`);
      }
    }
  }

  /**
   * G0HG - Give cards (draw N cards for player).
   * Format: G0HG,who1,n1[,who2,n2,...]
   * Pairs of (player, count) - each player draws n cards.
   */
  private handleGiveCards(args: string[]): void {
    for (let i = 1; i < args.length - 1; i += 2) {
      const uid = parseInt(args[i], 10);
      const n = parseInt(args[i + 1], 10);
      const player = this.board.garden.get(uid);
      if (!player || n <= 0) continue;

      for (let j = 0; j < n; j++) {
        if (this.board.tuxPiles.count > 0) {
          const card = this.board.tuxPiles.dequeue() as number;
          player.tux.push(card);
        }
      }
    }
  }

  /**
   * G0HT - Draw cards (convenience wrapper for G0DH).
   * Format: G0HT,who,n
   * C# XIG.cs: RaiseGMessage("G0DH," + who + ",0," + n)
   */
  private handleG0HT(args: string[]): void {
    const who = parseInt(args[1], 10);
    const n = parseInt(args[2], 10);
    if (isNaN(who) || isNaN(n) || n <= 0) return;
    this.raiseGMessage(`G0DH,${who},0,${n}`);
  }

  /**
   * G0OY - Leave game.
   * Format: G0OY,changeType1,who1[,changeType2,who2,...]
   * changeType: 2=normal death leave
   * Removes player's equipment, pets, and clears their state.
   */
  private handleLeaveGame(args: string[]): void {
    for (let i = 1; i < args.length - 1; i += 2) {
      const changeType = parseInt(args[i], 10);
      const uid = parseInt(args[i + 1], 10);
      const player = this.board.garden.get(uid);
      if (!player) continue;

      // Discard equipment
      if (player.weapon !== 0) {
        this.board.tuxDises.push(player.weapon);
        player.weapon = 0;
      }
      if (player.armor !== 0) {
        this.board.tuxDises.push(player.armor);
        player.armor = 0;
      }
      if (player.trove !== 0) {
        this.board.tuxDises.push(player.trove);
        player.trove = 0;
      }
      if (player.exEquip !== 0) {
        this.board.tuxDises.push(player.exEquip);
        player.exEquip = 0;
      }

      // Lose pets
      for (let j = 0; j < player.pets.length; j++) {
        if (player.pets[j] !== 0) {
          player.pets[j] = 0;
        }
      }

      // Clear escue and runes
      player.escue.length = 0;
      player.runes.length = 0;

      // Mark as not in game
      player.isTared = false;

      // Broadcast leave
      if (this.messageHandler) {
        this.messageHandler(`E0OY,${uid}`);
      }
    }
  }

  /**
   * G0IV - Push hero onto cos stack.
   * Format: G0IV,uid,heroId
   * Broadcast: E0IV,uid,heroId
   */
  private handlePushCos(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const heroId = parseInt(args[2], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;

    player.cossPush(heroId);
    if (this.messageHandler) {
      this.messageHandler(`E0IV,${uid},${heroId}`);
    }
  }

  /**
   * G0OV - Pop hero from cos stack.
   * Format: G0OV,uid
   * Broadcast: E0OV,uid,heroId,nextTop
   */
  private handlePopCos(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;

    const hero = player.cossPop();
    const next = player.cossPeek() ?? 0;
    if (this.messageHandler) {
      this.messageHandler(`E0OV,${uid},${hero ?? 0},${next}`);
    }
  }

  /**
   * G0OF - Remove rune cards from player.
   * Format: G0OF,who,runeId1,runeId2,...
   * Broadcast: E0OF,who,removedRunes (only if any removed)
   */
  private handleRemoveRune(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;

    const removed: number[] = [];
    for (let i = 2; i < args.length; i++) {
      const runeId = parseInt(args[i], 10);
      const idx = player.runes.indexOf(runeId);
      if (idx >= 0) {
        player.runes.splice(idx, 1);
        removed.push(runeId);
      }
    }

    if (removed.length > 0 && this.messageHandler) {
      this.messageHandler(`E0OF,${uid},${removed.join(',')}`);
    }
  }

  /**
   * G0OE - Disable pet effects.
   * Format: G0OE,uid
   */
  private handleDisablePetEffect(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;
    player.petDisabled = true;
  }

  /**
   * G0IE - Enable pet effects.
   * Format: G0IE,uid
   */
  private handleEnablePetEffect(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const player = this.board.garden.get(uid);
    if (!player) return;
    player.petDisabled = false;
  }

  /**
   * G0HQ - Card transfer with 5 modes.
   * Type 0: Player-to-player transfer
   * Type 1: Take all cards from player(s)
   * Type 2: Get cards from piles
   * Type 3: Direct add cards
   * Type 4: Exchange cards between two players
   */
  private async handleCardTransfer(args: string[]): Promise<void> {
    const type = parseInt(args[1], 10);
    const me = parseInt(args[2], 10);
    const receiver = this.board.garden.get(me);
    if (!receiver) return;

    if (type === 0) {
      // Player-to-player transfer
      let idx = 3;
      while (idx < args.length) {
        const fromUid = parseInt(args[idx], 10);
        const utype = parseInt(args[idx + 1], 10);
        const n = parseInt(args[idx + 2], 10);
        const fromPlayer = this.board.garden.get(fromUid);
        if (fromPlayer && (utype === 0 || utype === 1)) {
          const cards: number[] = [];
          for (let i = 0; i < n; i++) {
            const cardId = parseInt(args[idx + 3 + i], 10);
            cards.push(cardId);
          }
          // Remove from source
          for (const cardId of cards) {
            const cardIdx = fromPlayer.tux.indexOf(cardId);
            if (cardIdx >= 0) fromPlayer.tux.splice(cardIdx, 1);
          }
          // Add to receiver
          receiver.tux.push(...cards);
          if (this.messageHandler) {
            this.messageHandler(`E0HQ,0,${me},${fromUid},0,${n},${cards.join(',')}`);
          }
        } else if (fromPlayer && utype === 2) {
          // Random take n cards from source
          const available = fromPlayer.tux.filter(c => !this.board.protectedTux.includes(c));
          const takeN = Math.min(n, available.length);
          // Shuffle and take
          for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
          }
          const taken = available.slice(0, takeN);
          for (const cardId of taken) {
            const cardIdx = fromPlayer.tux.indexOf(cardId);
            if (cardIdx >= 0) fromPlayer.tux.splice(cardIdx, 1);
          }
          receiver.tux.push(...taken);
          if (this.messageHandler) {
            this.messageHandler(`E0HQ,0,${me},${fromUid},0,${takeN},${taken.join(',')}`);
          }
        }
        idx += (utype === 2) ? 3 : (3 + n);
      }
    } else if (type === 1) {
      // Take all cards from player(s)
      for (let i = 3; i < args.length; i++) {
        const fromUid = parseInt(args[i], 10);
        const fromPlayer = this.board.garden.get(fromUid);
        if (!fromPlayer) continue;

        // Take hand cards
        const handCards = fromPlayer.tux.filter(c => !this.board.protectedTux.includes(c));
        if (handCards.length > 0) {
          for (const cardId of handCards) {
            const idx = fromPlayer.tux.indexOf(cardId);
            if (idx >= 0) fromPlayer.tux.splice(idx, 1);
          }
          receiver.tux.push(...handCards);
          if (this.messageHandler) {
            this.messageHandler(`E0HQ,0,${me},${fromUid},0,${handCards.length},${handCards.join(',')}`);
          }
        }

        // Take equipment
        const equips = fromPlayer.listOutAllEquips().filter(c => !this.board.protectedTux.includes(c));
        if (equips.length > 0) {
          for (const cardId of equips) {
            fromPlayer.removeCard(cardId, []);
          }
          receiver.tux.push(...equips);
          if (this.messageHandler) {
            this.messageHandler(`E0HQ,0,${me},${fromUid},0,${equips.length},${equips.join(',')}`);
          }
        }
      }
    } else if (type === 2) {
      // Get cards from piles
      const utype = parseInt(args[3], 10);
      if (utype === 1) {
        // Draw N random from tuxPiles
        const n = parseInt(args[4], 10);
        for (let i = 0; i < n; i++) {
          if (this.board.tuxPiles.count > 0) {
            const card = this.board.tuxPiles.dequeue() as number;
            receiver.tux.push(card);
          }
        }
        if (this.messageHandler) {
          this.messageHandler(`E0HQ,2,${me},${receiver.tux.slice(-n).join(',')}`);
        }
      } else if (utype === 2) {
        // Direct add specified cards
        const cards: number[] = [];
        for (let i = 4; i < args.length; i++) {
          const cardId = parseInt(args[i], 10);
          if (cardId > 0) cards.push(cardId);
        }
        receiver.tux.push(...cards);
        if (this.messageHandler) {
          this.messageHandler(`E0HQ,2,${me},${cards.join(',')}`);
        }
      }
    } else if (type === 3) {
      // Direct add cards to player
      let idx = 3;
      while (idx < args.length) {
        const n = parseInt(args[idx], 10);
        for (let i = 0; i < n; i++) {
          const cardId = parseInt(args[idx + 1 + i], 10);
          if (cardId > 0) receiver.tux.push(cardId);
        }
        idx += (1 + n);
      }
      if (this.messageHandler) {
        this.messageHandler(`E0HQ,4,${args.slice(3).join(',')}`);
      }
    } else if (type === 4) {
      // Exchange cards between two players
      // Format: G0HQ,4,u1,u2,n1,cards1(n1),n2,cards2(n2)
      const u1 = parseInt(args[2], 10);
      const u2 = parseInt(args[3], 10);
      const n1 = parseInt(args[4], 10);
      const player1 = this.board.garden.get(u1);
      const player2 = this.board.garden.get(u2);
      if (!player1 || !player2) return;

      // Collect cards from player1
      let offset = 5;
      const cards1: number[] = [];
      for (let i = 0; i < n1; i++) {
        cards1.push(parseInt(args[offset + i], 10));
      }
      offset += n1;
      // Read n2 and cards from player2
      const n2 = parseInt(args[offset], 10);
      offset++;
      const cards2: number[] = [];
      for (let i = 0; i < n2; i++) {
        cards2.push(parseInt(args[offset + i], 10));
      }

      // Remove cards from both players
      for (const cardId of cards1) {
        const idx = player1.tux.indexOf(cardId);
        if (idx >= 0) player1.tux.splice(idx, 1);
      }
      for (const cardId of cards2) {
        const idx = player2.tux.indexOf(cardId);
        if (idx >= 0) player2.tux.splice(idx, 1);
      }

      // Add cards to opposite players
      player1.tux.push(...cards2);
      player2.tux.push(...cards1);

      if (this.messageHandler) {
        if (n2 > 0) {
          this.messageHandler(`E0HQ,0,${u1},${u2},0,${n2},${cards2.join(',')}`);
        }
        if (n1 > 0) {
          this.messageHandler(`E0HQ,0,${u2},${u1},0,${n1},${cards1.join(',')}`);
        }
      }
    }
  }

  /**
   * G0IS - Add skill to player.
   * Format: G0IS,who,op,skillCode1[,skillCode2,...]
   * op: bit0=hind(no broadcast), bit1=rollback(set isZhu)
   */
  private handleAddSkill(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const op = parseInt(args[2], 10);
    const hind = (op & 1) !== 0;
    const rollback = (op & 2) === 0;
    const player = this.board.garden.get(uid);
    if (!player) return;

    const added: string[] = [];
    for (let i = 3; i < args.length; i++) {
      const skillCode = args[i];
      if (!player.skills.has(skillCode)) {
        player.skills.add(skillCode);
        added.push(skillCode);
        if (rollback) player.isZhu = true;
      }
    }

    if (added.length > 0 && !hind && this.messageHandler) {
      this.messageHandler(`E0IS,${uid},${added.join(',')}`);
    }
  }

  /**
   * G0OS - Remove skill from player.
   * Format: G0OS,who,hind,skillCode1[,skillCode2,...]
   * hind: "0"=broadcast, "1"=hide
   */
  private handleRemoveSkill(args: string[]): void {
    const uid = parseInt(args[1], 10);
    const hind = args[2] === '1';
    const player = this.board.garden.get(uid);
    if (!player) return;

    const removed: string[] = [];
    for (let i = 3; i < args.length; i++) {
      const skillCode = args[i];
      if (player.skills.delete(skillCode)) {
        removed.push(skillCode);
      }
    }

    if (removed.length > 0 && !hind && this.messageHandler) {
      this.messageHandler(`E0OS,${uid},${removed.join(',')}`);
    }
  }

  /**
   * G0CD - Card use targeting.
   * Format: G0CD,A,T,cardName;inType,fuse
   * Broadcast: E0CD,A,T,cardName
   */
  private handleCardTarget(args: string[], cmd: string): void {
    // Parse: G0CD,A,T,cardName;inType,fuse
    // args[0]='G0CD', args[1]=A, args[2]=T, args[3]='cardName;inType'
    const a = args[1];
    const t = args[2];
    const cardPart = args[3] ?? '';
    const cardName = cardPart.split(';')[0];

    if (this.messageHandler) {
      this.messageHandler(`E0CD,${a},${t},${cardName}`);
    }

    // Raise G0CE for execution
    // Reconstruct G0CE from the original command
    const hdx = cmd.indexOf(';');
    if (hdx >= 0) {
      const fusePart = cmd.substring(hdx);
      // G0CE format: G0CE,A,T,0,cardName;inType,fuse
      const g0ceCmd = `G0CE,${a},${t},0,${args[3]}${fusePart !== args[3] ? fusePart : ''}`;
      // Broadcast G0CE
      if (this.messageHandler) {
        this.messageHandler(g0ceCmd);
      }
    }
  }

  /**
   * G0CE - Card action execution.
   * Format: G0CE,A,T,0/1(eq),cardName;inType,fuse
   * Broadcast: E0CE,A,T,cardName
   */
  private handleCardExecute(args: string[], cmd: string): void {
    const a = args[1];
    const t = args[2];
    const cardPart = args[4] ?? '';
    const cardName = cardPart.split(';')[0];

    if (this.messageHandler) {
      this.messageHandler(`G0CE,${a},${t},${cardName}`);
    }
  }

  /**
   * G1CW - Two-target card.
   * Format: G1CW,A,B,C,cardName;cdFuse;inType,fuse
   */
  private handleTwoTargetCard(args: string[], _cmd: string): void {
    if (this.messageHandler) {
      this.messageHandler(`G1CW,${args.slice(1, 5).join(',')},${args[4]?.split(';')[0] ?? ''}`);
    }
  }

  /**
   * G0XZ - Peek at pile contents.
   * Format: G0XZ,me,dicesType,control,count[,pick]
   * dicesType: 0=player hand, 1=tuxPiles, 2=monPiles, 3=evePiles
   * control: 0=peek only, 1=reorder
   */
  private handlePeekPile(args: string[]): void {
    const me = parseInt(args[1], 10);
    const dicesType = parseInt(args[2], 10);

    if (dicesType === 0) {
      // Peek at player hand
      const who = parseInt(args[3], 10);
      const target = this.board.garden.get(who);
      if (target && this.messageHandler) {
        this.messageHandler(`E0XZ,${me},5,${who},${target.tux.join(',')}`);
      }
    } else {
      // Peek at pile
      let pile: import('../utils/rueue').Rueue<number> | null = null;
      if (dicesType === 1) pile = this.board.tuxPiles;
      else if (dicesType === 2) pile = this.board.monPiles;
      else if (dicesType === 3) pile = this.board.evePiles;
      else return;

      if (!pile) return;
      const count = parseInt(args[4], 10);
      const watched = pile.watch(count);
      const watchedArr = Array.isArray(watched) ? watched : [watched];

      if (this.messageHandler) {
        this.messageHandler(`E0XZ,${me},0,${dicesType},${watchedArr.join(',')}`);
        this.messageHandler(`E0XZ,${me},4,0`);
      }
    }
  }

  /**
   * G0IY - Hero change / identity swap.
   * Format: G0IY,changeType,who,heroNum[,HP]
   * changeType: 0=full reset, 1=partial refresh, 2=full reset with HP override
   */
  private handleHeroChange(args: string[]): void {
    const changeType = parseInt(args[1], 10);
    const uid = parseInt(args[2], 10);
    const heroNum = parseInt(args[3], 10);
    const hpOverride = args.length > 4 ? parseInt(args[4], 10) : undefined;

    const player = this.board.garden.get(uid);
    if (!player) return;

    const hero = this.libGroup.hl.instanceHero(heroNum);
    if (!hero) return;

    player.selectHero = heroNum;

    if (changeType === 0 || changeType === 2) {
      // Full reset: clear skills, reinitialize from hero
      player.initFromHero(hero, true, false, false);
    } else if (changeType === 1) {
      // Partial refresh: keep some existing state
      player.initFromHero(hero, false, false, false);
    }

    // HP override
    if (hpOverride !== undefined) {
      player.hp = Math.min(hpOverride, player.hpBase);
    }

    // Awake ABC values if pool is enabled
    if (this.board.poolEnabled) {
      player.strA = player.strB;
      player.dexA = player.dexB;
    }
  }

  /**
   * G1TH - Harm / HP issue.
   * Format: G1TH,who1,harm1,who2,harm2,...
   * Applies HP changes and triggers death check (G0ZH) for any player at 0 HP.
   */
  private async handleHarm(args: string[]): Promise<void> {
    const deadUids: number[] = [];
    for (let i = 1; i < args.length - 1; i += 2) {
      const uid = parseInt(args[i], 10);
      const harm = parseInt(args[i + 1], 10);
      const player = this.board.garden.get(uid);
      if (!player || !player.isAlive) continue;

      player.hp = Math.max(0, player.hp - harm);

      if (player.hp <= 0) {
        deadUids.push(uid);
      }
    }
    // Trigger death check for any players at 0 HP (includes devotion, auto-revive, etc.)
    for (const uid of deadUids) {
      await this.raiseGMessage(`G0ZH,${uid}`);
    }
  }

  /**
   * G1IU - Insert cards into PZone.
   * Format: G1IU,card1,card2,...
   */
  private handleInsertPZone(args: string[]): void {
    for (let i = 1; i < args.length; i++) {
      const cardId = parseInt(args[i], 10);
      if (cardId > 0) {
        this.board.pZone.push(cardId);
      }
    }
  }

  /**
   * G0ZB - Equip standard items to a player.
   * Format: G0ZB,0,who,source,coach,slotAssign,card1,card2,...
   * The leading "0" after G0ZB indicates standard equipment (vs 1=ExCards, 2=Fakeq).
   */
  private async handleEquipStandard(args: string[], cmd: string): Promise<void> {
    // Only handle standard equip format (G0ZB,0,...)
    if (args.length < 6 || args[1] !== '0') return;

    const who = parseInt(args[2], 10);
    const source = parseInt(args[3], 10);
    const slotAssign = args[5] === '1';
    const cards = args.slice(6).map(Number).filter(id => id > 0);

    const player = this.board.garden.get(who);
    if (!player || cards.length === 0) return;

    for (const cardId of cards) {
      const tux = this.libGroup.tl.decodeTux(cardId);
      if (!tux || !tux.isTuxEquip()) continue;

      // Remove from source hand
      if (source !== 0) {
        const sourcePlayer = this.board.garden.get(source);
        if (sourcePlayer?.hasCard(cardId)) {
          await this.raiseGMessage(`G0OT,${source},1,${cardId}`);
        }
      }

      // Assign to slot - try primary slot first, then exEquip fallback
      let slot = -1;
      const tuxType = tux.type;

      if (tuxType === 'WQ') {
        if (player.weapon === 0) { player.weapon = cardId; slot = 0; }
        else if (player.exEquip === 0) { player.exEquip = cardId; slot = 3; }
      } else if (tuxType === 'FJ') {
        if (player.armor === 0) { player.armor = cardId; slot = 1; }
        else if (player.exEquip === 0) { player.exEquip = cardId; slot = 3; }
      } else if (tuxType === 'XB') {
        if (player.trove === 0) { player.trove = cardId; slot = 2; }
        else if (player.exEquip === 0) { player.exEquip = cardId; slot = 3; }
      } else if (player.exEquip === 0) {
        player.exEquip = cardId; slot = 3;
      }

      if (slot >= 0) {
        // Broadcast equip event: E0ZB,who,source,slot,card
        if (this.messageHandler) {
          this.messageHandler(`E0ZB,${who},${source},${slot},${cardId}`);
        }
      } else {
        // No slot available - discard
        if (source !== 0 && this.board.garden.get(source)?.hasCard(cardId)) {
          await this.raiseGMessage(`G0QZ,${source},${cardId}`);
        }
      }
    }
  }

  /**
   * G0ZJ - Equipment slot variation (increase/decrease capacity).
   * Format: G0ZJ,who,slot,increase
   * slot: 0=WQ, 1=FJ, 2=XB (weapon, armor, trove)
   * increase: 1=increase capacity, 0=decrease capacity
   */
  private handleEquipSlotVariation(args: string[]): void {
    if (args.length < 4) return;

    const who = parseInt(args[1], 10);
    const slotType = parseInt(args[2], 10);
    const increase = args[3] === '1';

    const player = this.board.garden.get(who);
    if (!player) return;

    // Map slot type to bitmask: WQ=0x1, FJ=0x2, XB=0x4
    const mask = slotType === 0 ? 0x1 : slotType === 1 ? 0x2 : slotType === 4 ? 0x4 : 0;
    if (mask === 0) return;

    if (increase) {
      // Increase capacity: clear forced-disable mask, set extra mask
      if ((player.fyMask & mask) !== 0) {
        player.fyMask &= ~mask;
      } else {
        player.exMask |= mask;
      }
    } else {
      // Decrease capacity
      if ((player.exMask & mask) !== 0) {
        // Had extra slot - remove it
        player.exMask &= ~mask;
        // If exEquip is occupied and the original slot is empty, move exEquip to original slot
        if (player.exEquip !== 0) {
          const orgEquip = slotType === 0 ? player.weapon : slotType === 1 ? player.armor : player.trove;
          if (orgEquip === 0) {
            // Move exEquip to original slot
            if (slotType === 0) player.weapon = player.exEquip;
            else if (slotType === 1) player.armor = player.exEquip;
            else player.trove = player.exEquip;
            player.exEquip = 0;
          } else {
            // Both occupied - discard exEquip
            this.raiseGMessage(`G0QZ,${who},${player.exEquip}`);
            player.exEquip = 0;
          }
        }
      } else {
        // No extra slot - add forced-disable mask
        player.fyMask |= mask;
        // If the original slot is occupied, discard it
        const orgEquip = slotType === 0 ? player.weapon : slotType === 1 ? player.armor : player.trove;
        if (orgEquip !== 0) {
          this.raiseGMessage(`G0QZ,${who},${orgEquip}`);
        }
      }
    }
  }

  /**
   * SimpleGMessage100 - for G2 messages.
   */
  async simpleGMessage100(cmd: string): Promise<void> {
    const args = cmd.split(',');
    const cmdType = args[0];

    await this.eventBus.emitAsync(cmdType, {
      cmd,
      args,
      board: this.board,
    });

    if (this.messageHandler) {
      this.messageHandler(cmd);
    }
  }

  /**
   * SKE2Message - check if an SKE matches the current command context.
   * Returns true if the handler should be invoked.
   */
  private ske2Message(
    ske: SKE,
    cmd: string,
    involved: boolean[],
    roads: string[],
    locks: string[],
  ): boolean {
    const args = cmd.split(',');
    const team = parseInt(ske.name.length >= 2 ? ske.name[1] : '0') || 0;

    // Check team match
    if (team !== 0) {
      const sender = parseInt(args[1]) || 0;
      const player = this.board.garden.get(sender);
      if (player && player.team !== team) return false;
    }

    // Check if locked
    if (ske.lock === true) {
      const sender = parseInt(args[1]) || 0;
      locks.push(`${sender},${cmd};${ske.name}`);
      return true;
    }

    // Mark involved based on team
    if (team === 0) {
      involved[0] = true;
    } else {
      const sender = parseInt(args[1]) || 0;
      if (sender > 0 && sender < involved.length) {
        involved[sender] = true;
      }
    }

    return true;
  }

  /**
   * HandleU24Message - process a locked skill message.
   * Matches C# XI.HandleU24Message in XIU.cs
   */
  private async handleU24Message(me: number, involved: boolean[], mai: string, ske: SKE): Promise<UEchoCode> {
    const idx = mai.indexOf(',');
    const player = this.board.garden.get(me);
    if (!player || !ske) return UEchoCode.END_CANCEL;

    const skName = ske.name;
    const args = idx < 0 ? '' : mai.substring(idx + 1);

    // Check if this is a skill handler (SK type)
    if (ske.type === 'SK' || ske.type === 'BK') {
      // Emit to event bus for skill handler
      await this.eventBus.emitAsync(skName, {
        cmd: mai,
        board: this.board,
        player,
        ske,
        type: ske.type,
        inType: ske.inType,
        args,
      });

      // Broadcast U5 confirmation message
      if (this.messageHandler) {
        const sTop = `U5,${me};;${skName}`;
        const sType = `;;${ske.inType}`;
        const mEnc = sTop + (args !== '' ? `,${args}` : '') + sType;
        this.messageHandler(mEnc);
      }

      ++ske.tick;
      return ske.isTermini ? UEchoCode.END_TERMIN : UEchoCode.END_ACTION;
    }

    // Check if this is a tux handler (TX/EQ type)
    if (ske.type === 'TX' || ske.type === 'EQ') {
      // Emit to event bus for tux handler
      await this.eventBus.emitAsync(skName, {
        cmd: mai,
        board: this.board,
        player,
        ske,
        type: ske.type,
        inType: ske.inType,
        args,
      });

      if (this.messageHandler) {
        const sTop = `U5,${me};;${skName}`;
        const sType = `;;${ske.inType}`;
        const mEnc = sTop + (args !== '' ? `,${args}` : '') + sType;
        this.messageHandler(mEnc);
      }

      ++ske.tick;
      return ske.isTermini ? UEchoCode.END_TERMIN : UEchoCode.END_ACTION;
    }

    // Check if this is an operation handler (CZ type)
    if (ske.type === 'CZ') {
      await this.eventBus.emitAsync(skName, {
        cmd: mai,
        board: this.board,
        player,
        ske,
        type: ske.type,
        inType: ske.inType,
        args,
      });

      ++ske.tick;
      return ske.isTermini ? UEchoCode.END_TERMIN : UEchoCode.END_ACTION;
    }

    // Default: emit and return END_ACTION
    await this.eventBus.emitAsync(skName, {
      cmd: mai,
      board: this.board,
      player,
      ske,
      args,
    });

    ++ske.tick;
    return ske.isTermini ? UEchoCode.END_TERMIN : UEchoCode.END_ACTION;
  }

  /**
   * SendOutU1Message - broadcast U1 messages to involved players.
   * Matches C# XI.SendOutU1Message in XIU.cs
   *
   * U1 format: "U1,uvsn;;involved;;road_or_options"
   * Each player gets their specific input options based on their road.
   */
  private sendOutU1Message(involved: boolean[], roads: string[], sinaG: number[]): void {
    if (!this.messageHandler) return;

    // Build involved player list
    const involvedPlayers: number[] = [];
    for (let i = 1; i < involved.length; i++) {
      if (involved[i]) involvedPlayers.push(i);
    }
    if (involvedPlayers.length === 0) return;

    // Generate a UVSN (unique version sequence number)
    const uvsn = this.uvsnCounter++;
    const inv = involvedPlayers.join(',');
    const head = `U1,${uvsn};;${inv};;`;

    // Send personalized U1 to each involved player
    for (let i = 1; i < involved.length; i++) {
      if (!involved[i]) continue;

      const py = this.board.garden.get(i);
      let content: string;

      if (roads[i] !== '' && roads[i] !== '0') {
        // Player has specific input options
        content = head + roads[i];
      } else if (py && py.isAlive) {
        // Player is alive but has no specific options - send default sina
        content = head + `0,${sinaG[i]}`;
      } else {
        // Player is dead - send reduced sina
        content = head + `0,${sinaG[0] & (~1)}`;
      }

      this.messageHandler(content);
    }
  }

  /**
   * UKEvenMessage - process event messages for involved players.
   * Matches C# XI.UKEvenMessage in XIR.cs
   *
   * Waits for U-messages (player responses) from involved players,
   * dispatches them through HandleUMessage, and processes the result.
   */
  private async ukEvenMessage(
    involved: boolean[],
    purse: SKE[],
    roads: string[],
    sinaG: number[],
  ): Promise<UEchoCode> {
    // Clear the global involved flag
    involved[0] = false;

    // In the C# version, this loops waiting for player input via WI.RecvInfRecv().
    // In the network version, we process any pending U-messages from the queue.
    // For now, we iterate through involved players and emit events for their handlers.

    const MAX_UK_ITERATIONS = 100;
    let ukIteration = 0;

    while (!this.isAllClear(involved)) {
      ukIteration++;
      if (ukIteration > MAX_UK_ITERATIONS) {
        console.error(`[GLoop] ukEvenMessage exceeded ${MAX_UK_ITERATIONS} iterations, breaking`);
        involved.fill(false);
        break;
      }

      // Find next involved player
      let nextPlayer = -1;
      for (let i = 1; i < involved.length; i++) {
        if (involved[i]) {
          nextPlayer = i;
          break;
        }
      }
      if (nextPlayer === -1) break;

      const player = this.board.garden.get(nextPlayer);
      if (!player) {
        involved[nextPlayer] = false;
        continue;
      }

      // Find matching SKE for this player
      let matched = false;
      for (const ske of purse) {
        if (ske.tg === nextPlayer || ske.tg === 0) {
          // Emit the event for this player's handler
          await this.eventBus.emitAsync(ske.name, {
            cmd: `G0${ske.name.substring(2)},${nextPlayer}`,
            board: this.board,
            player,
            ske,
            inType: ske.inType,
            fuse: ske.fuse,
          });

          // Mark as processed
          involved[nextPlayer] = false;
          matched = true;

          if (ske.isTermini) {
            return UEchoCode.END_TERMIN;
          }
          break;
        }
      }

      if (!matched) {
        // No matching handler - clear this player
        involved[nextPlayer] = false;
      }
    }

    return UEchoCode.END_ACTION;
  }

  /**
   * DecodeSimplifiedCommand - extract skill name from a simplified command.
   * Matches C# XI.DecodeSimplifiedCommand in XIU.cs
   *
   * Handles various command formats:
   * - "JN60102(2),args" -> extracts owner from parentheses
   * - "TX2,args" -> resolves tux code from numeric ID
   * - "PT16,args" -> resolves monster code from numeric ID
   * - "FW1,args" -> resolves rune code from numeric ID
   * - "YJ1,args" -> resolves NPC action code from numeric ID
   */
  private decodeSimplifiedCommand(cmd: string): string {
    const idx = cmd.indexOf(',');
    let skName = idx < 0 ? cmd : cmd.substring(0, idx);
    const comrest = idx < 0 ? '' : cmd.substring(idx);

    // BK: JN60102(2) => JN60102,2
    const jdx = cmd.indexOf('(');
    if (jdx >= 0) {
      const kdx = cmd.indexOf(')');
      if (kdx > jdx) {
        const owner = cmd.substring(jdx + 1, kdx);
        skName = skName.substring(0, jdx);
        return skName + ',' + owner + comrest;
      }
    }

    // TX: TX2 => TP01,2 (resolve tux code)
    if (skName.startsWith('TX')) {
      const card = parseInt(skName.substring(2), 10);
      const tux = this.libGroup.tl.decodeTux(card);
      if (tux) {
        skName = tux.code;
        return skName + ',' + card + comrest;
      }
      return cmd;
    }

    // PT: PT16 => GF04,16 (resolve monster code)
    if (skName.startsWith('PT')) {
      const card = parseInt(skName.substring(2), 10);
      const mon = this.libGroup.ml.decode(card);
      if (mon) {
        skName = mon.code;
        return skName + ',' + card + comrest;
      }
      return cmd;
    }

    // FW: FW1 => SF01 (resolve rune code)
    if (skName.startsWith('FW')) {
      const card = parseInt(skName.substring(2), 10);
      const rune = this.libGroup.rl.decode(card);
      if (rune) {
        skName = rune.code;
        return skName + comrest;
      }
      return cmd;
    }

    // YJ: YJ1 => NJ09,1001 (resolve NPC action code)
    if (skName.startsWith('YJ')) {
      const card = parseInt(skName.substring(2), 10);
      const npc = this.libGroup.nl.decode(card);
      if (npc) {
        // Find the first skill with NCAction branches
        const skill = npc.skills.find(s => {
          const nc = this.libGroup.nl2.encodeNCAction(s);
          return nc && nc.branches.length > 0;
        });
        if (skill) {
          skName = skill;
          return skName + ',' + NMBLib.codeOfNPC(card) + comrest;
        }
      }
      return cmd;
    }

    return cmd;
  }

  /**
   * Check if all involved flags are cleared.
   */
  private isAllClear(involved: boolean[]): boolean {
    for (let i = 0; i < involved.length; i++) {
      if (involved[i]) return false;
    }
    return true;
  }

  // --- Queue management ---

  /**
   * Send a message to the queue.
   */
  send(message: GMessage): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Message queue overflow');
    }
    this.queue.push(message);
    if (this.running) {
      this.processQueue();
    }
  }

  /**
   * Process the message queue.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.running) {
      const message = this.queue.shift()!;
      await this.processMessage(message);
    }

    this.processing = false;
  }

  /**
   * Process a single message through the event bus.
   */
  private async processMessage(message: GMessage): Promise<void> {
    if (this.config.enableLogging) {
      console.log(`[GLoop] Processing: ${message.toString()}`);
    }

    const sender = this.board.garden.get(message.sender) ?? null;
    const receiver = message.receiver === 0
      ? null
      : this.board.garden.get(message.receiver) ?? null;

    await this.eventBus.emitAsync(message.type, {
      message,
      board: this.board,
      sender,
      receiver,
    });
  }

  /**
   * Start the main loop.
   */
  start(): void {
    this.running = true;
    this.processQueue();
  }

  /**
   * Stop the main loop.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Pause the main loop.
   */
  pause(): void {
    this.running = false;
  }

  /**
   * Resume the main loop.
   */
  resume(): void {
    this.running = true;
    this.processQueue();
  }

  /**
   * Get queue length.
   */
  get queueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the message queue.
   */
  clearQueue(): void {
    this.queue = [];
  }
}
