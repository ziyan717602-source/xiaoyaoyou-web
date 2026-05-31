/**
 * OperationCottageAsync Tests
 *
 * Tests the async operation cottage with InputManager.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { InputManager } from '../../input-manager';
import { OperationCottageAsync } from '../operation-cottage-async';

describe('OperationCottageAsync', () => {
  let board: Board;
  let inputManager: InputManager;
  let messages: string[];
  let cottage: OperationCottageAsync;

  beforeEach(() => {
    board = new Board();
    inputManager = new InputManager();
    messages = [];

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
    board.rounder = p1;

    const asyncInput = (uid: number, format: string, code: string, arg: string) =>
      inputManager.waitForInput(uid, format, code, arg, 1000);

    cottage = new OperationCottageAsync(board, (msg) => messages.push(msg), asyncInput, () => null);
  });

  describe('CZ02 - Melee', () => {
    it('should ask for input and handle "yes"', async () => {
      const regs = cottage.registerAll();
      const cz02 = regs.find(r => r.code === 'CZ02')!;

      const p1 = board.garden.get(1)!;
      board.fightTangled = false;
      board.monPiles.enqueueRange([101, 102]);

      // Start the action (it will wait for input)
      const actionPromise = cz02.action(p1, 'R1', '');

      // Queue input
      setTimeout(() => {
        inputManager.queueInput(1, '2');
      }, 50);

      await actionPromise;

      // Should have drawn a monster and raised G0HZ
      expect(messages).toContain('G1SG,0');
      expect(messages.some(m => m.startsWith('G0HZ,1,'))).toBe(true);
    });

    it('should handle "no" response', async () => {
      const regs = cottage.registerAll();
      const cz02 = regs.find(r => r.code === 'CZ02')!;

      const p1 = board.garden.get(1)!;
      board.fightTangled = false;
      board.monPiles.enqueueRange([101]);

      const actionPromise = cz02.action(p1, 'R1', '');

      setTimeout(() => {
        inputManager.queueInput(1, '1');
      }, 50);

      await actionPromise;

      expect(messages).toContain('G1SG,0');
      expect(messages).toContain('G0HZ,1,0');
    });

    it('should timeout with empty response', async () => {
      const regs = cottage.registerAll();
      const cz02 = regs.find(r => r.code === 'CZ02')!;

      const p1 = board.garden.get(1)!;
      board.fightTangled = false;
      board.monPiles.enqueueRange([101]);

      // Don't provide input - should timeout
      await cz02.action(p1, 'R1', '');

      expect(messages).toContain('G1SG,0');
      expect(messages).toContain('G0HZ,1,0');
    });
  });

  describe('CZ03 - NPC Rescue', () => {
    it('should ask for team selection', async () => {
      const regs = cottage.registerAll();
      const cz03 = regs.find(r => r.code === 'CZ03')!;

      const p1 = board.garden.get(1)!;
      p1.escue.push(201, 202);

      const actionPromise = cz03.action(p1, 'R1', '201');

      setTimeout(() => {
        inputManager.queueInput(1, '1');
      }, 50);

      await actionPromise;

      expect(messages).toContain('G2OL,1,201');
      expect(messages).toContain('G0IP,1,1');
    });
  });
});
