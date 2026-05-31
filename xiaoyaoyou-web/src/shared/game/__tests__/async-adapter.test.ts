/**
 * Async Input Adapter Tests
 *
 * Tests the adapter that bridges sync AI input with async network input.
 * The adapter allows the game to work with both:
 * - Sync AI players (immediate response)
 * - Async network players (waits for response)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../player';
import { Board } from '../board';
import { InputManager } from '../input-manager';
import { AsyncInputAdapter } from '../async-input-adapter';

describe('AsyncInputAdapter', () => {
  let board: Board;
  let inputManager: InputManager;
  let adapter: AsyncInputAdapter;

  beforeEach(() => {
    board = new Board();
    inputManager = new InputManager();

    // Create players
    const p1 = new Player('Alice', 1, 1);
    p1.isAlive = true;
    p1.isTared = true;
    p1.team = 1;
    const p2 = new Player('Bob', 2, 2);
    p2.isAlive = true;
    p2.isTared = true;
    p2.team = 2;
    board.garden.set(1, p1);
    board.garden.set(2, p2);

    adapter = new AsyncInputAdapter(inputManager, board);
  });

  describe('Sync Mode (AI)', () => {
    it('should use sync callback when provided', async () => {
      const syncCallback = vi.fn().mockReturnValue('T1');
      adapter.setSyncInput(1, syncCallback);

      const result = await adapter.getInput(1, 'S', 'CZ01', '0');
      expect(result).toBe('T1');
      expect(syncCallback).toHaveBeenCalledWith(1, 'S', 'CZ01', '0');
    });

    it('should fallback to async when sync callback not set', async () => {
      // Queue input for async
      inputManager.queueInput(1, 'T2');

      const result = await adapter.getInput(1, 'S', 'CZ01', '0');
      expect(result).toBe('T2');
    });
  });

  describe('Async Mode (Network)', () => {
    it('should wait for network input', async () => {
      const promise = adapter.getInput(1, 'S', 'CZ01', '0');

      // Simulate network response
      setTimeout(() => {
        inputManager.queueInput(1, 'T1');
      }, 50);

      const result = await promise;
      expect(result).toBe('T1');
    });

    it('should timeout for network input', async () => {
      const result = await adapter.getInput(1, 'S', 'CZ01', '0', 200);
      expect(result).toBe('');
    });

    it('should provide input request info', async () => {
      const promise = adapter.getInput(1, 'S', 'CZ01', '0');

      const request = adapter.getCurrentRequest(1);
      expect(request).toBeDefined();
      expect(request?.uid).toBe(1);
      expect(request?.format).toBe('S');

      // Clean up
      inputManager.queueInput(1, '/');
      await promise;
    });
  });

  describe('Player Mode Management', () => {
    it('should mark player as sync (AI)', () => {
      adapter.setPlayerMode(1, 'sync');
      expect(adapter.isSyncMode(1)).toBe(true);
    });

    it('should mark player as async (network)', () => {
      adapter.setPlayerMode(1, 'async');
      expect(adapter.isSyncMode(1)).toBe(false);
    });

    it('should use appropriate callback based on mode', async () => {
      const syncCallback = vi.fn().mockReturnValue('T1');
      adapter.setSyncInput(1, syncCallback);
      adapter.setPlayerMode(1, 'sync');

      const result = await adapter.getInput(1, 'S', 'CZ01', '0');
      expect(result).toBe('T1');
      expect(syncCallback).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cancel all pending inputs', async () => {
      const promise1 = adapter.getInput(1, 'S', 'CZ01', '0');
      const promise2 = adapter.getInput(2, 'S', 'CZ01', '0');

      adapter.cancelAll();

      const [r1, r2] = await Promise.all([promise1, promise2]);
      expect(r1).toBe('');
      expect(r2).toBe('');
    });

    it('should handle disconnect gracefully', async () => {
      const promise = adapter.getInput(1, 'S', 'CZ01', '0');
      adapter.handleDisconnect(1);

      const result = await promise;
      expect(result).toBe('');
    });
  });
});
