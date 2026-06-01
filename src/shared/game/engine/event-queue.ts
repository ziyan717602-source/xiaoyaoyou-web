/**
 * EventQueue - Time flow control for game events
 *
 * Manages event sequencing, dispatch delays, and AI thinking time.
 * Ensures clients can see game events at a readable pace instead of
 * AI turns completing instantly.
 */

import type { DecisionRequest } from '../../network/protocol';

// ─── Types ───

export type GameEventType =
  | 'phase_changed'
  | 'decision_requested'
  | 'ai_thinking'
  | 'card_drawn'
  | 'card_played'
  | 'card_discarded'
  | 'monster_revealed'
  | 'event_revealed'
  | 'hp_changed'
  | 'battle_power_changed'
  | 'battle_resolved'
  | 'deck_reshuffled';

export interface GameEvent {
  seq: number;
  type: GameEvent['type'];
  payload: unknown;
  visibility: 'public' | { only: number[] };
  minDelayMs?: number;
  snapshotAfter?: boolean;
}

export interface DelayPolicy {
  aiThinkMs(request: DecisionRequest): number;
  eventMs(event: GameEvent): number;
}

// ─── Delay Policies ───

/** Zero delay for testing — events dispatch instantly */
export const ZERO_DELAY: DelayPolicy = {
  aiThinkMs: () => 0,
  eventMs: () => 0,
};

/** Development delay — fast enough to see events, slow enough to read */
export const DEV_DELAY: DelayPolicy = {
  aiThinkMs: () => 300 + Math.random() * 300,
  eventMs: (e) => {
    switch (e.type) {
      case 'monster_revealed':
      case 'event_revealed':
      case 'battle_resolved': return 500;
      case 'card_drawn':
      case 'card_played': return 200;
      default: return 100;
    }
  },
};

/** Production play delay — realistic pacing */
export const PLAY_DELAY: DelayPolicy = {
  aiThinkMs: () => 600 + Math.random() * 600,
  eventMs: (e) => {
    switch (e.type) {
      case 'monster_revealed':
      case 'event_revealed':
      case 'battle_resolved': return 800;
      case 'card_drawn':
      case 'card_played': return 300;
      default: return 200;
    }
  },
};

// ─── EventQueue ───

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class EventQueue {
  private queue: GameEvent[] = [];
  private seq = 0;
  private running = false;
  private dispatch: (event: GameEvent) => Promise<void>;
  private delayPolicy: DelayPolicy;

  constructor(dispatch: (event: GameEvent) => Promise<void>, delayPolicy: DelayPolicy = ZERO_DELAY) {
    this.dispatch = dispatch;
    this.delayPolicy = delayPolicy;
  }

  /**
   * Add an event to the queue. Returns the created event with seq number.
   */
  enqueue(type: GameEvent['type'], payload: unknown, visibility: GameEvent['visibility'] = 'public'): GameEvent {
    const event: GameEvent = {
      seq: ++this.seq,
      type,
      payload,
      visibility,
      minDelayMs: this.delayPolicy.eventMs({ seq: this.seq, type, payload, visibility } as GameEvent),
    };
    this.queue.push(event);
    return event;
  }

  /**
   * Flush all queued events, dispatching each with its delay.
   * If already running, returns immediately (prevents concurrent flushes).
   */
  async flush(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift()!;
        await this.dispatch(event);
        if (event.minDelayMs && event.minDelayMs > 0) {
          await sleep(event.minDelayMs);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Change the delay policy for future events.
   */
  setDelayPolicy(policy: DelayPolicy): void {
    this.delayPolicy = policy;
  }

  /**
   * Get the current sequence number.
   */
  get currentSeq(): number {
    return this.seq;
  }

  /**
   * Get the number of pending events in the queue.
   */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * Clear all pending events without dispatching.
   */
  clear(): void {
    this.queue = [];
  }
}
