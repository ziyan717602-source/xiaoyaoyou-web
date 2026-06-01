/**
 * OperationCottage Tests - Verify operation effect delegates
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { OperationCottage } from '../operation-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { LibGroup } from '../../lib-group';

describe('OperationCottage', () => {
  let cottage: OperationCottage;
  let board: Board;
  let messages: string[];
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    asyncInputResults = [];

    cottage = new OperationCottage(
      board,
      new LibGroup(),
      (msg) => messages.push(msg),
      (uid, format, code, arg) => {
        if (asyncInputResults.length > 0) {
          return Promise.resolve(asyncInputResults.shift()!);
        }
        return Promise.resolve('/');
      },
    );

    const p1 = new Player('Alice', 1, 1);
    p1.isAlive = true;
    p1.isTared = true;
    p1.team = 1;
    p1.tux.push(101, 102);
    board.garden.set(1, p1);
  });

  describe('registerAll', () => {
    it('should register all operation effects', () => {
      const regs = cottage.registerAll();
      expect(regs).toHaveLength(5);
      const codes = regs.map(r => r.code);
      expect(codes).toContain('CZ01');
      expect(codes).toContain('CZ02');
      expect(codes).toContain('CZ03');
      expect(codes).toContain('CZ04');
      expect(codes).toContain('CZ05');
    });
  });

  describe('CZ02 - HunZhan', () => {
    it('should be valid for rounder when not tangled and monPiles available', () => {
      const regs = cottage.registerAll();
      const cz02 = regs.find(r => r.code === 'CZ02')!;
      const p1 = board.garden.get(1)!;
      board.rounder = p1;
      board.fightTangled = false;
      board.monPiles.enqueue(1);
      expect(cz02.valid!(p1, 'R1OP')).toBe(true);
    });

    it('should be invalid for non-rounder', () => {
      const regs = cottage.registerAll();
      const cz02 = regs.find(r => r.code === 'CZ02')!;
      const p1 = board.garden.get(1)!;
      const p2 = new Player('Bob', 2, 2);
      p2.isAlive = true;
      board.garden.set(2, p2);
      board.rounder = p1;
      expect(cz02.valid!(p2, 'R1OP')).toBe(false);
    });

    it('should be invalid when fightTangled', () => {
      const regs = cottage.registerAll();
      const cz02 = regs.find(r => r.code === 'CZ02')!;
      const p1 = board.garden.get(1)!;
      board.rounder = p1;
      board.fightTangled = true;
      board.monPiles.enqueue(1);
      expect(cz02.valid!(p1, 'R1OP')).toBe(false);
    });
  });

  describe('CZ03 - NPC Rescue', () => {
    it('should be valid when player has escue', () => {
      const regs = cottage.registerAll();
      const cz03 = regs.find(r => r.code === 'CZ03')!;
      const p1 = board.garden.get(1)!;
      p1.escue.push(1001);
      expect(cz03.valid!(p1, '')).toBe(true);
    });

    it('should be invalid when player has no escue', () => {
      const regs = cottage.registerAll();
      const cz03 = regs.find(r => r.code === 'CZ03')!;
      const p1 = board.garden.get(1)!;
      expect(cz03.valid!(p1, '')).toBe(false);
    });
  });

  describe('CZ05 - Fake Equip', () => {
    it('should be valid when player has fakeq', () => {
      const regs = cottage.registerAll();
      const cz05 = regs.find(r => r.code === 'CZ05')!;
      const p1 = board.garden.get(1)!;
      p1.fakeq.set(101, 'TPT2');
      expect(cz05.valid!(p1, '')).toBe(true);
    });

    it('should be invalid when player has no fakeq', () => {
      const regs = cottage.registerAll();
      const cz05 = regs.find(r => r.code === 'CZ05')!;
      const p1 = board.garden.get(1)!;
      expect(cz05.valid!(p1, '')).toBe(false);
    });
  });
});
