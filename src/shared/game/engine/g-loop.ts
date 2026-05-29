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
      enableLogging: true,
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
   * Send a raw G-command string. This is the primary entry point (RaiseGMessage equivalent).
   */
  async raiseGMessage(cmd: string): Promise<void> {
    if (!cmd.startsWith('G')) return;

    if (this.config.enableLogging) {
      console.log(`[GLoop] Raise: ${cmd}`);
    }

    // G2 messages go through SimpleGMessage100 path
    if (cmd.startsWith('G2')) {
      await this.simpleGMessage100(cmd);
    } else {
      await this.innerGMessage(cmd, Number.MIN_SAFE_INTEGER);
    }
  }

  /**
   * InnerGMessage - process with priority control.
   * This is the core dispatch loop from XIG.cs.
   */
  async innerGMessage(cmd: string, priorty: number): Promise<void> {
    if (!cmd || !cmd.startsWith('G')) return;

    const zero = extractEventKey(cmd);
    const skTriples = this.skillRegistry.sk02.get(zero);

    if (!skTriples || skTriples.length === 0) {
      // No registered handlers - reset zhu flags
      for (const py of this.board.garden.values()) {
        py.isZhu = false;
      }
      return;
    }

    const skeList = this.skillRegistry.parseToSKEs(zero);
    const involved = new Array(this.board.garden.size + 1).fill(false);
    const roads = new Array(this.board.garden.size + 1).fill('');
    let isTermini = false;
    let isAnySet = false;

    do {
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
        // No handlers matched - send ACK
        await this.raiseGMessage('G2AS,0');
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
      const hasInvolved = involved.some((v, idx) => idx > 0 && v);
      if (hasInvolved && !isTermini) {
        if (involved[0]) {
          involved.fill(true);
        }
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

    await this.raiseGMessage('G2AS,0');
    if (!isTermini) {
      await this.innerGMessage(cmd, priorty + 1);
    }
  }

  /**
   * SimpleGMessage - basic handling without skill invocation.
   * Handles the default behavior for each message type.
   */
  async simpleGMessage(cmd: string, priority: number): Promise<void> {
    const args = cmd.split(',');
    const cmdType = args[0];

    // Emit to event bus for downstream handlers
    await this.eventBus.emitAsync(cmdType, {
      cmd,
      args,
      priority,
      board: this.board,
    });

    // Broadcast the message
    if (this.messageHandler) {
      this.messageHandler(cmd);
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

    while (!this.isAllClear(involved)) {
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
