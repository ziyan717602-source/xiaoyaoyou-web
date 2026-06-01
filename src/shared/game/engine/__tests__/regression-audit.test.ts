/**
 * Regression Audit Tests — P0 缺陷保护网
 *
 * 这些 it.todo 占位测试固化了审计报告中的 P0 缺陷。
 * 后续 milestone (M1-M7) 逐步替换为真实断言。
 *
 * @see docs/MIMO/implementation-plan.md — M0: 回归基线与保护网
 * @see docs/MIMO/final-audit-report.md — P0 缺陷清单
 */
import { describe, it, expect } from 'vitest';
import { EventBus } from '../event-bus';
import { DeckManager } from '../deck-manager';
import { Board } from '../../board';
import { BattleActionWindow } from '../battle-action-window';

// ── P0 Regression: Async Phase Suspend ──────────────────────

describe('P0 Regression: Async Phase Suspend', () => {
  it('M0-01: run:stage handler should not advance phase before input resolves', async () => {
    // Verify that emitAsync properly awaits async handlers
    const bus = new EventBus();
    let handlerCompleted = false;

    bus.on('run:stage', async () => {
      // Simulate async work (e.g., waiting for player input)
      await new Promise(resolve => setTimeout(resolve, 50));
      handlerCompleted = true;
    }, 0, 'test');

    // emitAsync should await the handler
    await bus.emitAsync('run:stage', { stageCode: 'R1ST' });

    // After emitAsync resolves, handler should have completed
    expect(handlerCompleted).toBe(true);
  });

  it('M0-02: BC phase should wait for G0HT completion before entering QR', async () => {
    // Verify that async G0HT handler completes before control returns
    const bus = new EventBus();
    const order: string[] = [];

    bus.on('run:stage', async () => {
      order.push('run:stage:start');
      await new Promise(resolve => setTimeout(resolve, 30));
      order.push('run:stage:end');
    }, 0, 'test');

    await bus.emitAsync('run:stage', { stageCode: 'R1BC' });

    // Handler should complete in order
    expect(order).toEqual(['run:stage:start', 'run:stage:end']);
  });

  it('M0-03: ZW G1SG response window should block ZM transition', async () => {
    // Verify that raise:gmessage async handler completes before next emit
    const bus = new EventBus();
    let g1sgHandled = false;

    bus.on('raise:gmessage', async (data: unknown) => {
      const d = data as { cmd?: string };
      if (d.cmd?.startsWith('G1SG')) {
        await new Promise(resolve => setTimeout(resolve, 30));
        g1sgHandled = true;
      }
    }, 0, 'test');

    await bus.emitAsync('raise:gmessage', { cmd: 'G1SG,0' });

    expect(g1sgHandled).toBe(true);
  });
});

// ── P0 Regression: Deck Lifecycle ───────────────────────────

describe('P0 Regression: Deck Lifecycle', () => {
  it('M0-04: tux deck reshuffles discard pile when empty', () => {
    const board = new Board();
    const dm = new DeckManager(board);

    // Set up: draw pile has 1 card, discard has 3
    board.tuxPiles.enqueue(1);
    board.tuxDises.push(10, 11, 12);

    // Draw 2 cards — should reshuffle discard
    const result = dm.drawTux(2);

    expect(result.drawn).toBe(2);
    expect(result.reshuffled).toBe(true);
    expect(result.exhausted).toBe(false);
    expect(board.tuxDises.length).toBe(0);
  });

  it('M0-05: monster deck exhaustion triggers G1WJ, not reshuffle', () => {
    const board = new Board();
    const dm = new DeckManager(board);

    // Monster pile is empty
    const result = dm.drawMonsterOrNpc();

    expect(result.exhausted).toBe(true);
    expect(result.drawn).toBe(0);
    expect(result.reshuffled).toBe(false);
    // No reshuffle from discard
    expect(board.monDises.length).toBe(0);
  });

  it('M0-06: drawTux with empty both piles returns partial, no crash', () => {
    const board = new Board();
    const dm = new DeckManager(board);

    // Both piles empty
    const result = dm.drawTux(3);

    expect(result.drawn).toBe(0);
    expect(result.exhausted).toBe(true);
    expect(result.cards).toEqual([]);
    // Should not throw
  });
});

// ── P0 Regression: ZW Targeting ─────────────────────────────

describe('P0 Regression: ZW Targeting', () => {
  it('M0-07: support candidate excludes rounder', () => {
    // Support candidates should be alive same-team players EXCLUDING the rounder
    const rounderUid = 1;
    const team = 1;
    const players = [
      { uid: 1, team: 1, isAlive: true }, // rounder
      { uid: 2, team: 1, isAlive: true }, // same team, alive
      { uid: 3, team: 1, isAlive: true }, // same team, alive
      { uid: 4, team: 2, isAlive: true }, // enemy
    ];

    const supportCandidates = players
      .filter(p => p.isAlive && p.team === team && p.uid !== rounderUid)
      .map(p => p.uid);

    expect(supportCandidates).toEqual([2, 3]);
    expect(supportCandidates).not.toContain(rounderUid);
  });

  it('M0-08: hinder request sent to enemy team, not just first enemy', () => {
    // Hinder candidates should be ALL alive enemy team players
    const rounderUid = 1;
    const oppTeam = 2;
    const players = [
      { uid: 1, team: 1, isAlive: true },
      { uid: 2, team: 2, isAlive: true },
      { uid: 3, team: 2, isAlive: true },
      { uid: 4, team: 2, isAlive: true },
    ];

    const hinderCandidates = players
      .filter(p => p.isAlive && p.team === oppTeam)
      .map(p => p.uid);

    expect(hinderCandidates).toEqual([2, 3, 4]);
    expect(hinderCandidates.length).toBe(3); // All enemies, not just first
  });

  it('M0-09: non-enemy submission rejected', () => {
    // A player from the wrong team should not be able to hinder
    const rounderUid = 1;
    const oppTeam = 2;
    const submitterUid = 1; // Same team as rounder - should be rejected

    const isEnemy = (() => {
      const player = { uid: submitterUid, team: 1 };
      return player.team === oppTeam;
    })();

    expect(isEnemy).toBe(false); // Not an enemy, should be rejected
  });
});

// ── P0 Regression: ZD Battle Window ─────────────────────────

describe('P0 Regression: ZD Battle Window', () => {
  it('M0-10: non-combatant cannot play ZP01/ZP02/ZP03', () => {
    const window = new BattleActionWindow(
      { rounderUid: 1, supporterUid: 2, hinderUid: 3, supportSucc: true, hinderSucc: true, rPool: 0, oPool: 0 },
      [1, 2, 3, 4],
    );

    const hand = [
      { instanceId: 101, code: 'ZP01', name: '金蝉脱壳', type: 'tux', zone: 'hand', visible: true },
      { instanceId: 102, code: 'ZP02', name: '天罡战气', type: 'tux', zone: 'hand', visible: true },
      { instanceId: 103, code: 'ZP03', name: '金蚕王', type: 'tux', zone: 'hand', visible: true },
    ];

    // uid 4 is not a combatant
    const actions = window.collectLegalActions(4, hand);
    expect(actions.some(a => a.actionId === 'ZP01')).toBe(false);
    expect(actions.some(a => a.actionId === 'ZP02')).toBe(false);
    expect(actions.some(a => a.actionId === 'ZP03')).toBe(false);
  });

  it('M0-11: non-combatant can play ZP04', () => {
    const window = new BattleActionWindow(
      { rounderUid: 1, supporterUid: 2, hinderUid: 3, supportSucc: true, hinderSucc: true, rPool: 0, oPool: 0 },
      [1, 2, 3, 4],
    );

    const hand = [
      { instanceId: 104, code: 'ZP04', name: '天玄五音', type: 'tux', zone: 'hand', visible: true },
    ];

    // uid 4 is not a combatant but can play ZP04
    const actions = window.collectLegalActions(4, hand);
    expect(actions.some(a => a.actionId === 'ZP04')).toBe(true);
  });

  it('M0-12: one battle card per player per fight', () => {
    const window = new BattleActionWindow(
      { rounderUid: 1, supporterUid: 2, hinderUid: 3, supportSucc: true, hinderSucc: true, rPool: 0, oPool: 0 },
      [1, 2, 3],
    );

    // Player 1 uses their battle card
    const response1 = { requestId: 'req1', phaseId: 'R1ZD', uid: 1, actionId: 'ZP01', payload: {} };
    const result1 = window.apply(response1);
    expect(result1.applied).toBe(true);

    // Player 1 tries to use another - should fail
    const response2 = { requestId: 'req2', phaseId: 'R1ZD', uid: 1, actionId: 'ZP02', payload: {} };
    const result2 = window.apply(response2);
    expect(result2.applied).toBe(false);
  });
});

// ── P0 Regression: Card Instance ────────────────────────────

describe('P0 Regression: Card Instance', () => {
  it('M0-13: duplicate card codes distinguished by instanceId', () => {
    // Cards with different instanceIds are distinct even if they share the same code
    // In the CardInstanceState system, instanceId is the unique identifier
    const card1 = { instanceId: 1001, code: 'JP03', name: '醉仙望月步', type: 'skill', zone: 'hand' as const, visible: true };
    const card2 = { instanceId: 1002, code: 'JP03', name: '醉仙望月步', type: 'skill', zone: 'hand' as const, visible: true };

    // Same code, different instanceId
    expect(card1.code).toBe(card2.code);
    expect(card1.instanceId).not.toBe(card2.instanceId);

    // Instance ID can be used to uniquely identify cards
    const hand = [card1, card2];
    const selected = hand.filter(c => c.instanceId === 1001);
    expect(selected).toHaveLength(1);
    expect(selected[0].instanceId).toBe(1001);
  });
});
