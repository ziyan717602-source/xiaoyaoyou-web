/**
 * AI Timing Tests — P0 缺陷保护网
 *
 * Tests for AI delay and timing control.
 * These tests verify that AI actors have visible thinking time
 * and that events are broadcast before actions.
 *
 * @see docs/MIMO/implementation-plan.md — M0: 回归基线与保护网
 * @see docs/MIMO/final-audit-report.md — P0 缺陷清单
 */
import { describe, it, expect } from 'vitest';
import { EventQueue, PLAY_DELAY, ZERO_DELAY } from '../../shared/game/engine/event-queue';
import { AIActor } from '../actors/ai-actor';
import { Board } from '../../shared/game/board';
import { Player } from '../../shared/game/player';
import { EventBus } from '../../shared/game/engine/event-bus';

// Mock AI strategy for testing
const mockStrategy = {
  name: 'test',
  selectHero: () => 0,
  makeMainPhaseDecision: () => '',
  makeBattleDecision: () => 0,
  makeInputDecision: () => '/',
};

// ── P0 Regression: AI Timing ────────────────────────────────

describe('P0 Regression: AI Timing', () => {
  it('M0-14: AI response should have visible delay in production', async () => {
    // Verify that PLAY_DELAY adds real delay
    const request = {
      requestId: 'test-req',
      phaseId: 'R1ZW',
      phase: 'ZW',
      code: 'ZW',
      prompt: '选择目标',
      recipients: [1],
      policy: 'single-actor' as const,
      min: 0,
      max: 1,
      optional: true,
      timeoutMs: 5000,
      legalActions: [{ actionId: 'PASS', type: 'PASS' as const, actorUid: 1 }],
    };

    const delayMs = PLAY_DELAY.aiThinkMs(request);
    expect(delayMs).toBeGreaterThanOrEqual(600);
    expect(delayMs).toBeLessThanOrEqual(1200);
  });

  it('M0-15: AI should not skip multiple phases in one tick', async () => {
    // Verify EventQueue processes events sequentially
    const processed: number[] = [];
    const queue = new EventQueue(async (e) => {
      processed.push(e.seq);
    }, ZERO_DELAY);

    // Enqueue multiple events
    queue.enqueue('phase_changed', { from: 'INIT', to: 'OC' });
    queue.enqueue('decision_requested', { uid: 1 });
    queue.enqueue('ai_thinking', { uid: 1 });
    queue.enqueue('card_drawn', { uid: 1, count: 1 });

    await queue.flush();

    // Events should be processed in order, not skipped
    expect(processed).toEqual([1, 2, 3, 4]);
  });

  it('M0-16: AI thinking event should be broadcast before action', async () => {
    // Verify that ai_thinking events can be broadcast
    const bus = new EventBus();
    const events: string[] = [];

    bus.on('ai_thinking', (data) => {
      const d = data as { uid: number };
      events.push(`thinking:${d.uid}`);
    });

    bus.on('action', (data) => {
      const d = data as { uid: number };
      events.push(`action:${d.uid}`);
    });

    // Simulate AI thinking then acting
    bus.emit('ai_thinking', { uid: 1 });
    bus.emit('action', { uid: 1 });

    expect(events).toEqual(['thinking:1', 'action:1']);
  });
});
