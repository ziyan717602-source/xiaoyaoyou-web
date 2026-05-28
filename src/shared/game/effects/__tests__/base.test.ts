/**
 * Base Tests - Verify JNSBase utility methods
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JNSBase } from '../base';
import { Player } from '../../player';
import { Board } from '../../board';
import { FiveElement } from '@shared/types/enums';

class TestJNSBase extends JNSBase {
  publicTestHarm(src: Player | null, py: Player, n: number, five?: FiveElement, mask?: number) {
    this.harm(src, py, n, five, mask);
  }
  publicTestHarmMultiple(src: Player | null, invs: Player[], n: number, five?: FiveElement, mask?: number) {
    this.harmMultiple(src, invs, n, five, mask);
  }
  publicTestCure(src: Player | null, py: Player, n: number, five?: FiveElement, mask?: number) {
    this.cure(src, py, n, five, mask);
  }
  publicTestCureMultiple(src: Player | null, invs: Player[], n: number, five?: FiveElement, mask?: number) {
    this.cureMultiple(src, invs, n, five, mask);
  }
  publicTestTargetPlayer(from: number, to: number) {
    this.targetPlayer(from, to);
  }
  publicTestTargetPlayers(from: number, tos: number[]) {
    this.targetPlayers(from, tos);
  }
  publicTestFormatPlayers(condition: (p: Player) => boolean) {
    return this.formatPlayers(condition);
  }
  publicTestAAlls() {
    return this.aAlls(null);
  }
  publicTestATeammates(py: Player) {
    return this.aTeammates(py);
  }
  publicTestAEnemy(py: Player) {
    return this.aEnemy(py);
  }
  publicTestIsMathISOS(skillName: string, player: Player, fuse: string) {
    return this.isMathISOS(skillName, player, fuse);
  }
}

describe('JNSBase', () => {
  let base: TestJNSBase;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputs: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputs = [];
    base = new TestJNSBase(
      board,
      (msg) => messages.push(msg),
      (msg, prior) => innerMessages.push({ msg, prior }),
      (uid, format, code, arg) => {
        asyncInputs.push(format);
        return asyncInputs.length > 0 ? asyncInputs[asyncInputs.length - 1] : '/';
      },
    );

    // Set up 2 players
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
  });

  describe('harm', () => {
    it('should emit G0OH message for single target', () => {
      const p2 = board.garden.get(2)!;
      base.publicTestHarm(null, p2, 3);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^G0OH,2,0,0,3,0$/);
    });

    it('should include source uid when src is not null', () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      base.publicTestHarm(p1, p2, 2);
      // G2YS targeting message comes first, then G0OH
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatch(/^G2YS,T,1,T,2$/);
      expect(messages[1]).toMatch(/^G0OH,2,1,0,2,0$/);
    });

    it('should use correct element', () => {
      const p2 = board.garden.get(2)!;
      base.publicTestHarm(null, p2, 1, FiveElement.THUNDER);
      expect(messages[0]).toMatch(/^G0OH,2,0,3,1,0$/);
    });
  });

  describe('harmMultiple', () => {
    it('should emit harm message for multiple targets', () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      base.publicTestHarmMultiple(null, [p1, p2], 1);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('G0OH,');
    });

    it('should not emit message for empty list', () => {
      base.publicTestHarmMultiple(null, [], 1);
      expect(messages).toHaveLength(0);
    });
  });

  describe('cure', () => {
    it('should emit G0IH message', () => {
      const p1 = board.garden.get(1)!;
      base.publicTestCure(null, p1, 2);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^G0IH,1,0,0,2,0$/);
    });

    it('should include source uid', () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      base.publicTestCure(p2, p1, 3);
      // G2YS targeting message comes first, then G0IH
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatch(/^G2YS,T,2,T,1$/);
      expect(messages[1]).toMatch(/^G0IH,1,2,0,3,0$/);
    });
  });

  describe('cureMultiple', () => {
    it('should emit cure message for multiple targets', () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      base.publicTestCureMultiple(null, [p1, p2], 1);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('G0IH,');
    });
  });

  describe('targetPlayer', () => {
    it('should emit G2YS message for single target', () => {
      base.publicTestTargetPlayer(1, 2);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBe('G2YS,T,1,T,2');
    });

    it('should not emit for target 0', () => {
      base.publicTestTargetPlayer(1, 0);
      expect(messages).toHaveLength(0);
    });

    it('should not emit for target >= 1000', () => {
      base.publicTestTargetPlayer(1, 1000);
      expect(messages).toHaveLength(0);
    });
  });

  describe('targetPlayers', () => {
    it('should emit G2YS message for multiple targets', () => {
      base.publicTestTargetPlayers(1, [2, 3]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBe('G2YS,T,1,T,2,T,3');
    });

    it('should filter out invalid targets', () => {
      base.publicTestTargetPlayers(1, [0, 2, 1000]);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBe('G2YS,T,1,T,2');
    });
  });

  describe('formatPlayers', () => {
    it('should format players matching condition', () => {
      const result = base.publicTestFormatPlayers(p => p.isAlive);
      expect(result).toMatch(/p1/);
      expect(result).toMatch(/p2/);
    });

    it('should return empty string for no matches', () => {
      const result = base.publicTestFormatPlayers(p => p.uid === 99);
      expect(result).toBe('');
    });
  });

  describe('player queries', () => {
    it('aAlls should return all alive players', () => {
      const result = base.publicTestAAlls();
      expect(result).toContain('p1');
      expect(result).toContain('p2');
    });

    it('aTeammates should return teammates', () => {
      const p1 = board.garden.get(1)!;
      const result = base.publicTestATeammates(p1);
      expect(result).toContain('p1');
      expect(result).not.toContain('p2');
    });

    it('aEnemy should return enemies', () => {
      const p1 = board.garden.get(1)!;
      const result = base.publicTestAEnemy(p1);
      expect(result).toContain('p2');
      expect(result).not.toContain('p1');
    });
  });

  describe('isMathISOS', () => {
    it('should return true when skill name matches', () => {
      const p1 = board.garden.get(1)!;
      expect(base.publicTestIsMathISOS('JNH0101', p1, 'ISOS,1,0,JNH0101')).toBe(true);
    });

    it('should return false when skill name does not match', () => {
      const p1 = board.garden.get(1)!;
      expect(base.publicTestIsMathISOS('JNH0101', p1, 'ISOS,1,0,XXXXXX')).toBe(false);
    });

    it('should return false for different player', () => {
      const p2 = board.garden.get(2)!;
      expect(base.publicTestIsMathISOS('JNH0101', p2, 'ISOS,1,0,JNH0101')).toBe(false);
    });
  });

  describe('equal', () => {
    it('should return true for null === null', () => {
      expect(JNSBase['equal'](null, null)).toBe(true);
    });

    it('should return false for null !== value', () => {
      expect(JNSBase['equal'](null, 42)).toBe(false);
      expect(JNSBase['equal'](42, null)).toBe(false);
    });

    it('should return true for same value', () => {
      expect(JNSBase['equal'](42, 42)).toBe(true);
      expect(JNSBase['equal']('a', 'a')).toBe(true);
    });
  });
});
