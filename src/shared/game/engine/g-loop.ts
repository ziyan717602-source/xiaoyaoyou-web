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
  private config: GLoopConfig;
  private queue: GMessage[] = [];
  private running = false;
  private processing = false;
  private messageHandler: ((msg: string) => void) | null = null;

  constructor(
    eventBus: EventBus,
    board: Board,
    skillRegistry: SkillRegistry,
    config?: Partial<GLoopConfig>,
  ) {
    this.eventBus = eventBus;
    this.board = board;
    this.skillRegistry = skillRegistry;
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
  raiseGMessage(cmd: string): void {
    if (!cmd.startsWith('G')) return;

    if (this.config.enableLogging) {
      console.log(`[GLoop] Raise: ${cmd}`);
    }

    // G2 messages go through SimpleGMessage100 path
    if (cmd.startsWith('G2')) {
      this.simpleGMessage100(cmd);
    } else {
      this.innerGMessage(cmd, Number.MIN_SAFE_INTEGER);
    }
  }

  /**
   * InnerGMessage - process with priority control.
   * This is the core dispatch loop from XIG.cs.
   */
  innerGMessage(cmd: string, priorty: number): void {
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
            this.simpleGMessage(cmd, ske.priorty);
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
        this.raiseGMessage('G2AS,0');
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
          const echo = this.handleU24Message(me, involved, mai, ske);
          if (echo === UEchoCode.END_TERMIN) {
            isTermini = true;
          } else if (echo === UEchoCode.END_ACTION) {
            isAnySet = true;
          }
        }
        this.raiseGMessage('G2AS,0');
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
        const echo = this.ukEvenMessage(involved, purse, roads, sinaG);
        if (echo === UEchoCode.END_TERMIN) {
          isTermini = true;
        } else if (echo === UEchoCode.END_ACTION) {
          isAnySet = true;
        }
      }
    } while (!this.isAllClear(involved) && !isTermini);

    this.raiseGMessage('G2AS,0');
    if (!isTermini) {
      this.innerGMessage(cmd, priorty + 1);
    }
  }

  /**
   * SimpleGMessage - basic handling without skill invocation.
   * Handles the default behavior for each message type.
   */
  simpleGMessage(cmd: string, priority: number): void {
    const args = cmd.split(',');
    const cmdType = args[0];

    // Emit to event bus for downstream handlers
    this.eventBus.emit(cmdType, {
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
  simpleGMessage100(cmd: string): void {
    const args = cmd.split(',');
    const cmdType = args[0];

    this.eventBus.emit(cmdType, {
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
   */
  private handleU24Message(me: number, involved: boolean[], mai: string, ske: SKE): UEchoCode {
    // Simplified: emit and return END_ACTION
    this.eventBus.emit(ske.name, {
      cmd: mai,
      board: this.board,
      player: this.board.garden.get(me) ?? null,
      ske,
    });
    return UEchoCode.END_ACTION;
  }

  /**
   * SendOutU1Message - broadcast U1 messages to involved players.
   */
  private sendOutU1Message(involved: boolean[], roads: string[], sinaG: number[]): void {
    // Simplified: just broadcast
    if (this.messageHandler) {
      for (let i = 1; i < involved.length; i++) {
        if (involved[i]) {
          this.messageHandler(`U1,${i}`);
        }
      }
    }
  }

  /**
   * UKEvenMessage - process event messages for involved players.
   */
  private ukEvenMessage(
    involved: boolean[],
    purse: SKE[],
    roads: string[],
    sinaG: number[],
  ): UEchoCode {
    // Simplified: return END_ACTION
    return UEchoCode.END_ACTION;
  }

  /**
   * DecodeSimplifiedCommand - extract skill name from a simplified command.
   */
  private decodeSimplifiedCommand(cmd: string): string {
    const parts = cmd.split(',');
    return parts[0] || '';
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
