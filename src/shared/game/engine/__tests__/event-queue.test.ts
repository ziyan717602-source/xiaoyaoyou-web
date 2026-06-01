/**
 * EventQueue Tests
 *
 * Tests the event sequencing, dispatch delays, and delay policies.
 */
import { describe, it, expect, vi } from 'vitest';
import { EventQueue, ZERO_DELAY, DEV_DELAY, type GameEvent } from '../event-queue';

describe('EventQueue', () => {
  describe('enqueue', () => {
    it('should assign incrementing seq numbers', () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);

      const e1 = queue.enqueue('phase_changed', { from: 'INIT', to: 'OC' });
      const e2 = queue.enqueue('card_drawn', { uid: 1, count: 2 });
      const e3 = queue.enqueue('hp_changed', { uid: 1, delta: -1 });

      expect(e1.seq).toBe(1);
      expect(e2.seq).toBe(2);
      expect(e3.seq).toBe(3);
    });

    it('should set visibility to public by default', () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);
      const event = queue.enqueue('phase_changed', {});
      expect(event.visibility).toBe('public');
    });

    it('should accept custom visibility', () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);
      const event = queue.enqueue('card_drawn', {}, { only: [1, 2] });
      expect(event.visibility).toEqual({ only: [1, 2] });
    });
  });

  describe('flush', () => {
    it('should dispatch events in order', async () => {
      const dispatched: number[] = [];
      const queue = new EventQueue(async (e) => {
        dispatched.push(e.seq);
      }, ZERO_DELAY);

      queue.enqueue('phase_changed', {});
      queue.enqueue('card_drawn', {});
      queue.enqueue('hp_changed', {});

      await queue.flush();

      expect(dispatched).toEqual([1, 2, 3]);
    });

    it('should not block with zero delay', async () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);
      queue.enqueue('phase_changed', {});
      queue.enqueue('card_drawn', {});

      const start = Date.now();
      await queue.flush();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should respect minDelayMs when flushing', async () => {
      const queue = new EventQueue(async () => {}, {
        aiThinkMs: () => 0,
        eventMs: () => 50, // 50ms delay per event
      });

      queue.enqueue('phase_changed', {});
      queue.enqueue('card_drawn', {});

      const start = Date.now();
      await queue.flush();
      const elapsed = Date.now() - start;

      // Should take at least 100ms (2 events × 50ms)
      expect(elapsed).toBeGreaterThanOrEqual(80);
    });

    it('should not run concurrent flushes', async () => {
      let flushCount = 0;
      const queue = new EventQueue(async () => {
        flushCount++;
        await new Promise(r => setTimeout(r, 50));
      }, ZERO_DELAY);

      queue.enqueue('phase_changed', {});
      queue.enqueue('card_drawn', {});

      // Start two flushes simultaneously
      const p1 = queue.flush();
      const p2 = queue.flush();

      await Promise.all([p1, p2]);

      // Only 2 events should be dispatched (not 4)
      expect(flushCount).toBe(2);
    });

    it('should clear running flag after completion', async () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);
      queue.enqueue('phase_changed', {});

      await queue.flush();

      // Should be able to flush again
      queue.enqueue('card_drawn', {});
      await queue.flush();
    });
  });

  describe('setDelayPolicy', () => {
    it('should apply new policy to future events', () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);

      const e1 = queue.enqueue('phase_changed', {});
      expect(e1.minDelayMs).toBe(0);

      queue.setDelayPolicy(DEV_DELAY);
      const e2 = queue.enqueue('phase_changed', {});
      expect(e2.minDelayMs).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should remove all pending events', () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);
      queue.enqueue('phase_changed', {});
      queue.enqueue('card_drawn', {});

      expect(queue.pendingCount).toBe(2);
      queue.clear();
      expect(queue.pendingCount).toBe(0);
    });
  });

  describe('currentSeq', () => {
    it('should track sequence number', () => {
      const queue = new EventQueue(async () => {}, ZERO_DELAY);
      expect(queue.currentSeq).toBe(0);

      queue.enqueue('phase_changed', {});
      expect(queue.currentSeq).toBe(1);

      queue.enqueue('card_drawn', {});
      expect(queue.currentSeq).toBe(2);
    });
  });
});

describe('Delay Policies', () => {
  it('ZERO_DELAY should always return 0', () => {
    const queue = new EventQueue(async () => {}, ZERO_DELAY);
    const event = queue.enqueue('phase_changed', {});
    expect(event.minDelayMs).toBe(0);
  });

  it('DEV_DELAY should return positive values for most events', () => {
    const queue = new EventQueue(async () => {}, DEV_DELAY);
    const event = queue.enqueue('monster_revealed', {});
    expect(event.minDelayMs).toBeGreaterThan(0);
  });
});
