/**
 * ActorRegistry Tests - M2 Actor abstraction
 *
 * Tests ActorRegistry, HumanActor, and AIActor.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActorRegistry } from '../actors/actor-registry';
import type { Actor } from '../actors/actor';
import type { DecisionRequest, DecisionResponse } from '../../shared/network/protocol';

function makeMockActor(uid: number, kind: 'human' | 'ai' = 'human'): Actor {
  return {
    uid,
    kind,
    requestDecision: vi.fn().mockResolvedValue({
      requestId: 'mock-req',
      phaseId: 'R1ZW',
      uid,
      actionId: 'PASS',
      payload: {},
    } as DecisionResponse),
  };
}

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

describe('ActorRegistry', () => {
  let registry: ActorRegistry;

  beforeEach(() => {
    registry = new ActorRegistry();
  });

  describe('register and get', () => {
    it('should register and retrieve an actor', () => {
      const actor = makeMockActor(1);
      registry.register(actor);

      expect(registry.get(1)).toBe(actor);
      expect(registry.size).toBe(1);
    });

    it('should return undefined for unregistered uid', () => {
      expect(registry.get(99)).toBeUndefined();
    });

    it('should return all registered actors', () => {
      registry.register(makeMockActor(1));
      registry.register(makeMockActor(2));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('requestDecision', () => {
    it('should request decision from the first matching actor', async () => {
      const actor1 = makeMockActor(1);
      const actor2 = makeMockActor(2);
      registry.register(actor1);
      registry.register(actor2);

      const request = makeDecisionRequest({ recipients: [2, 1] });
      await registry.requestDecision(request);

      expect(actor2.requestDecision).toHaveBeenCalledWith(request);
      expect(actor1.requestDecision).not.toHaveBeenCalled();
    });

    it('should return null if no actor found', async () => {
      const request = makeDecisionRequest({ recipients: [99] });
      const result = await registry.requestDecision(request);

      expect(result).toBeNull();
    });
  });

  describe('requestDecisionAll', () => {
    it('should request decision from all recipients in parallel', async () => {
      const actor1 = makeMockActor(1);
      const actor2 = makeMockActor(2);
      registry.register(actor1);
      registry.register(actor2);

      const request = makeDecisionRequest({ recipients: [1, 2] });
      const results = await registry.requestDecisionAll(request);

      expect(results).toHaveLength(2);
      expect(actor1.requestDecision).toHaveBeenCalled();
      expect(actor2.requestDecision).toHaveBeenCalled();
    });
  });
});
