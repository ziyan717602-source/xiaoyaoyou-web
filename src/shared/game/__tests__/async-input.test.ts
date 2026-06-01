/**
 * Async Input Tests
 *
 * Tests the async input system for network players.
 * The game needs to wait for player input from the network,
 * which requires async/await support.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../player';
import { Board } from '../board';
import { InputManager } from '../input-manager';

describe('InputManager', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  describe('Basic Input', () => {
    it('should resolve pending input immediately if available', async () => {
      // Queue input before requesting
      inputManager.queueInput(1, 'T1');
      const result = await inputManager.waitForInput(1, 'S', 'CZ01', '0');
      expect(result).toBe('T1');
    });

    it('should wait for input if not immediately available', async () => {
      // Start waiting first
      const promise = inputManager.waitForInput(1, 'S', 'CZ01', '0');

      // Simulate network response after delay
      setTimeout(() => {
        inputManager.queueInput(1, 'T2');
      }, 100);

      const result = await promise;
      expect(result).toBe('T2');
    });

    it('should timeout after specified duration', async () => {
      const promise = inputManager.waitForInput(1, 'S', 'CZ01', '0', 200);

      // Don't provide input - should timeout
      const result = await promise;
      expect(result).toBe(''); // Default empty on timeout
    });

    it('should handle multiple concurrent players', async () => {
      const p1Promise = inputManager.waitForInput(1, 'S', 'CZ01', '0');
      const p2Promise = inputManager.waitForInput(2, 'S', 'CZ01', '0');

      // Provide inputs in reverse order
      setTimeout(() => {
        inputManager.queueInput(2, 'T2');
        inputManager.queueInput(1, 'T1');
      }, 50);

      const [r1, r2] = await Promise.all([p1Promise, p2Promise]);
      expect(r1).toBe('T1');
      expect(r2).toBe('T2');
    });

    it('should cancel pending input', async () => {
      const promise = inputManager.waitForInput(1, 'S', 'CZ01', '0');

      // Cancel before providing input
      inputManager.cancelInput(1);

      const result = await promise;
      expect(result).toBe(''); // Cancelled returns empty
    });

    it('should reject input for disconnected player', async () => {
      inputManager.markDisconnected(1);
      const result = await inputManager.waitForInput(1, 'S', 'CZ01', '0');
      expect(result).toBe(''); // Disconnected returns empty
    });
  });

  describe('Input Queue', () => {
    it('should queue multiple inputs for same player', async () => {
      inputManager.queueInput(1, 'T1');
      inputManager.queueInput(1, 'T2');

      const r1 = await inputManager.waitForInput(1, 'S', 'CZ01', '0');
      const r2 = await inputManager.waitForInput(1, 'S', 'CZ01', '0');

      expect(r1).toBe('T1');
      expect(r2).toBe('T2');
    });

    it('should clear queue for player', () => {
      inputManager.queueInput(1, 'T1');
      inputManager.queueInput(1, 'T2');
      inputManager.clearQueue(1);

      expect(inputManager.hasPendingInput(1)).toBe(false);
    });
  });

  describe('Input Request Tracking', () => {
    it('should track pending requests', () => {
      expect(inputManager.hasPendingInput(1)).toBe(false);

      inputManager.waitForInput(1, 'S', 'CZ01', '0');
      expect(inputManager.hasPendingInput(1)).toBe(true);
    });

    it('should return request info', () => {
      inputManager.waitForInput(1, 'S', 'CZ01', '0');
      const request = inputManager.getRequest(1);

      expect(request).toBeDefined();
      expect(request?.uid).toBe(1);
      expect(request?.format).toBe('S');
      expect(request?.code).toBe('CZ01');
    });
  });
});
