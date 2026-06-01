/**
 * Decision Protocol Tests - M2 InputManager DecisionRequest/Response
 *
 * Tests the new DecisionRequest/Response system in InputManager.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputManager } from '../input-manager';
import type { DecisionRequest, DecisionResponse } from '../../network/protocol';

function makeDecisionRequest(overrides?: Partial<DecisionRequest>): DecisionRequest {
  return {
    requestId: 'test-req-1',
    phaseId: 'R1ZW',
    phase: 'ZW',
    code: 'ZW_SUPPORT',
    prompt: '选择一名支援者',
    recipients: [1],
    policy: 'single-actor',
    min: 0,
    max: 1,
    optional: true,
    timeoutMs: 5000,
    legalActions: [
      { actionId: 'target-2', type: 'SELECT_TARGET', actorUid: 0, targetUids: [2] },
      { actionId: 'PASS', type: 'PASS', actorUid: 0 },
    ],
    ...overrides,
  };
}

function makeDecisionResponse(overrides?: Partial<DecisionResponse>): DecisionResponse {
  return {
    requestId: 'test-req-1',
    phaseId: 'R1ZW',
    uid: 1,
    actionId: 'target-2',
    payload: { targetUids: [2] },
    ...overrides,
  };
}

describe('InputManager Decision Protocol', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  describe('requestDecision', () => {
    it('should resolve when submitDecision is called', async () => {
      const request = makeDecisionRequest();
      let resolved: DecisionResponse | null = null;

      const promise = inputManager.requestDecision(request).then(r => { resolved = r; });

      const response = makeDecisionResponse();
      const result = inputManager.submitDecision(response);

      expect(result.accepted).toBe(true);
      await promise;
      expect(resolved).toEqual(response);
    });

    it('should resolve null on timeout', async () => {
      const request = makeDecisionRequest({ timeoutMs: 50 });

      const result = await inputManager.requestDecision(request);
      expect(result).toBeNull();
    });

    it('should resolve null when player is disconnected', async () => {
      const request = makeDecisionRequest({ recipients: [1] });
      inputManager.markDisconnected(1);

      const result = await inputManager.requestDecision(request);
      expect(result).toBeNull();
    });
  });

  describe('submitDecision', () => {
    it('should reject unknown requestId', () => {
      const response = makeDecisionResponse({ requestId: 'unknown' });
      const result = inputManager.submitDecision(response);

      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('Unknown');
    });

    it('should reject non-recipient player', async () => {
      const request = makeDecisionRequest({ recipients: [1] });
      const promise = inputManager.requestDecision(request);

      const response = makeDecisionResponse({ uid: 3 }); // uid 3 not in recipients
      const result = inputManager.submitDecision(response);

      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('not a recipient');
    });

    it('should reject duplicate submission', async () => {
      const request = makeDecisionRequest();
      const promise = inputManager.requestDecision(request);

      const response = makeDecisionResponse();
      const result1 = inputManager.submitDecision(response);
      expect(result1.accepted).toBe(true);

      // Second submission should be rejected (requestId no longer pending)
      const result2 = inputManager.submitDecision(response);
      expect(result2.accepted).toBe(false);
    });
  });

  describe('cancelDecision', () => {
    it('should resolve pending decision as null', async () => {
      const request = makeDecisionRequest();

      const promise = inputManager.requestDecision(request);
      inputManager.cancelDecision(request.requestId);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('getPendingForUid', () => {
    it('should return pending decisions for a player', async () => {
      const request = makeDecisionRequest({ recipients: [1, 2] });
      const promise = inputManager.requestDecision(request);

      const pending = inputManager.getPendingForUid(1);
      expect(pending).toHaveLength(1);
      expect(pending[0].requestId).toBe('test-req-1');
    });

    it('should not return consumed decisions', async () => {
      const request = makeDecisionRequest();
      const promise = inputManager.requestDecision(request);

      inputManager.submitDecision(makeDecisionResponse());

      const pending = inputManager.getPendingForUid(1);
      expect(pending).toHaveLength(0);
    });
  });

  describe('legacy compatibility', () => {
    it('should still support waitForInput', async () => {
      const inputPromise = inputManager.waitForInput(1, 'S', 'ZW', '');
      inputManager.queueInput(1, 'aka');

      const result = await inputPromise;
      expect(result).toBe('aka');
    });
  });
});
