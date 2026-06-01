/**
 * BattleActionWindow Tests
 *
 * Tests the ZD battle card phase action window.
 */
import { describe, it, expect } from 'vitest';
import { BattleActionWindow, type BattleActionContext, type BattleActionResult } from '../battle-action-window';
import type { CardInstanceState, DecisionResponse } from '../../../network/protocol';

function makeCard(instanceId: number, code: string): CardInstanceState {
  return { instanceId, code, name: code, type: 'tux', zone: 'hand', visible: true };
}

function makeResponse(uid: number, actionId: string, optionValues?: string[]): DecisionResponse {
  return {
    requestId: 'test-req',
    phaseId: 'R1ZD',
    uid,
    actionId,
    payload: { optionValues },
  };
}

function makeContext(overrides?: Partial<BattleActionContext>): BattleActionContext {
  return {
    rounderUid: 1,
    supporterUid: 2,
    hinderUid: 3,
    supportSucc: true,
    hinderSucc: true,
    rPool: 0,
    oPool: 0,
    ...overrides,
  };
}

describe('BattleActionWindow', () => {
  describe('collectLegalActions', () => {
    it('should include ZP01 only for combatants', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3, 4]);
      const hand = [makeCard(101, 'ZP01')];

      // Rounder (combatant) should see ZP01
      const rounderActions = window.collectLegalActions(1, hand);
      expect(rounderActions.some(a => a.actionId === 'ZP01')).toBe(true);

      // Non-combatant (uid 4) should NOT see ZP01
      const nonCombatantActions = window.collectLegalActions(4, hand);
      expect(nonCombatantActions.some(a => a.actionId === 'ZP01')).toBe(false);
    });

    it('should include ZP04 for anyone with the card', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3, 4]);
      const hand = [makeCard(101, 'ZP04')];

      // Non-combatant should see ZP04
      const actions = window.collectLegalActions(4, hand);
      expect(actions.some(a => a.actionId === 'ZP04')).toBe(true);
    });

    it('should not include ZP02/ZP03 for non-combatants', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3, 4]);
      const hand = [makeCard(101, 'ZP02'), makeCard(102, 'ZP03')];

      const actions = window.collectLegalActions(4, hand);
      expect(actions.some(a => a.actionId === 'ZP02')).toBe(false);
      expect(actions.some(a => a.actionId === 'ZP03')).toBe(false);
    });

    it('should always include PASS', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      const actions = window.collectLegalActions(1, []);
      expect(actions.some(a => a.actionId === 'PASS')).toBe(true);
    });

    it('should not include battle cards when restZP is 0', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      const hand = [makeCard(101, 'ZP01')];

      // Use up the battle card
      window.apply(makeResponse(1, 'ZP01'));

      // Now should only have PASS
      const actions = window.collectLegalActions(1, hand);
      expect(actions).toHaveLength(1);
      expect(actions[0].actionId).toBe('PASS');
    });
  });

  describe('apply', () => {
    it('should consume restZP on successful apply', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);

      expect(window.getRestZP(1)).toBe(1);
      window.apply(makeResponse(1, 'ZP01'));
      expect(window.getRestZP(1)).toBe(0);
    });

    it('should return applied: false for PASS', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      const result = window.apply(makeResponse(1, 'PASS'));
      expect(result.applied).toBe(false);
    });

    it('should return applied: false when restZP is 0', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      window.apply(makeResponse(1, 'ZP01'));
      const result = window.apply(makeResponse(1, 'ZP02'));
      expect(result.applied).toBe(false);
    });

    it('ZP01 should terminate battle', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      const result = window.apply(makeResponse(1, 'ZP01'));
      expect(result.terminateBattle).toBe(true);
    });

    it('ZP04 should require option selection', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      const result = window.apply(makeResponse(1, 'ZP04', ['aka']));
      expect(result.applied).toBe(true);
      expect(result.poolChange).toEqual({ side: 'r', delta: 2 });
    });

    it('ZP04 with ao option should affect opponent pool', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      const result = window.apply(makeResponse(1, 'ZP04', ['ao']));
      expect(result.applied).toBe(true);
      expect(result.poolChange).toEqual({ side: 'o', delta: 2 });
    });
  });

  describe('shouldContinue', () => {
    it('should return true when players have restZP', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      expect(window.shouldContinue()).toBe(true);
    });

    it('should return false when all players have used restZP', () => {
      const window = new BattleActionWindow(makeContext(), [1, 2, 3]);
      // All players use their battle cards (not PASS)
      window.apply(makeResponse(1, 'ZP01'));
      window.apply(makeResponse(2, 'ZP04', ['aka']));
      window.apply(makeResponse(3, 'ZP03'));
      expect(window.shouldContinue()).toBe(false);
    });
  });
});
