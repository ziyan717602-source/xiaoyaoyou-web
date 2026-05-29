/**
 * RuneCottage Tests - Verify rune effect delegates
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { RuneCottage } from '../rune-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { FiveElement } from '@shared/types/enums';
import { FiveElementHelper, HPEvoMask } from '../../card/five-element';
import { LibGroup } from '../../lib-group';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  p.isTared = true;
  return p;
}

describe('RuneCottage', () => {
  let cottage: RuneCottage;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    cottage = new RuneCottage(
      board,
      new LibGroup(),
      (msg: string) => messages.push(msg),
      (msg: string, prior: number) => innerMessages.push({ msg, prior }),
      (_uid: number, _format: string, _code: string, _arg: string) => {
        if (asyncInputResults.length > 0) {
          return Promise.resolve(asyncInputResults.shift()!);
        }
        return Promise.resolve('/');
      },
    );

    // Set up 2 players
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    board.garden.set(1, p1);
    board.garden.set(2, p2);
    board.rounder = p1;
    board.hinder = p2;
  });

  describe('Registration', () => {
    it('should register all 7 runes SF01-SF07', () => {
      const regs = cottage.registerAll();
      expect(regs).toHaveLength(7);
      const codes = regs.map(r => r.code);
      expect(codes).toContain('SF01');
      expect(codes).toContain('SF02');
      expect(codes).toContain('SF03');
      expect(codes).toContain('SF04');
      expect(codes).toContain('SF05');
      expect(codes).toContain('SF06');
      expect(codes).toContain('SF07');
    });
  });

  describe('SF01 - Battle Side Selection', () => {
    it('should raise G0IP with selected side', () => {
      const regs = cottage.registerAll();
      const sf01 = regs.find(r => r.code === 'SF01')!;
      const p1 = board.garden.get(1)!;
      sf01.action!(p1, '', '1');
      expect(messages).toContain('G0IP,1,2');
    });

    it('should be valid when attending war', () => {
      const regs = cottage.registerAll();
      const sf01 = regs.find(r => r.code === 'SF01')!;
      const p1 = board.garden.get(1)!;
      expect(sf01.valid!(p1, '')).toBe(true);
    });

    it('should be invalid when not attending war', () => {
      const regs = cottage.registerAll();
      const sf01 = regs.find(r => r.code === 'SF01')!;
      const p3 = makePlayer(3, 1);
      p3.isAlive = true;
      board.garden.set(3, p3);
      expect(sf01.valid!(p3, '')).toBe(false);
    });

    it('should return S for input', () => {
      const regs = cottage.registerAll();
      const sf01 = regs.find(r => r.code === 'SF01')!;
      const p1 = board.garden.get(1)!;
      expect(sf01.input!(p1, '', '')).toBe('S');
    });
  });

  describe('SF02 - Hit +2', () => {
    it('should raise G0IX with +2', () => {
      const regs = cottage.registerAll();
      const sf02 = regs.find(r => r.code === 'SF02')!;
      const p1 = board.garden.get(1)!;
      sf02.action!(p1, '', '');
      expect(messages).toContain('G0IX,1,1,2');
    });

    it('should be valid when attending war', () => {
      const regs = cottage.registerAll();
      const sf02 = regs.find(r => r.code === 'SF02')!;
      const p1 = board.garden.get(1)!;
      expect(sf02.valid!(p1, '')).toBe(true);
    });
  });

  describe('SF03 - Remove Elemental Damage', () => {
    it('should filter proped elemental damage from fuse', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      // Fuse: player 1 takes 2 damage from element 3 (THUNDER, proped)
      const fuse = `1,0,3,2,0`;
      sf03.action!(p1, fuse, '');
      // The proped damage to p1 should be filtered out; nothing remaining
      expect(innerMessages).toHaveLength(0);
    });

    it('should keep non-proped damage in fuse', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      // Fuse: player 1 takes 2 damage from element 0 (A, non-proped)
      const fuse = '1,0,0,2,0';
      sf03.action!(p1, fuse, '');
      // Non-proped damage should remain
      expect(innerMessages).toHaveLength(1);
      expect(innerMessages[0].msg).toBe('1,0,0,2,0');
    });

    it('should be valid when fuse has proped elemental damage to player', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      // Fuse: player 1 takes damage from element 2 (AGNI, proped)
      expect(sf03.valid!(p1, '1,0,2,2,0')).toBe(true);
    });

    it('should not be valid when fuse has no proped elemental damage to player', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      // Fuse: player 1 takes damage from element 0 (A, non-proped)
      expect(sf03.valid!(p1, '1,0,0,2,0')).toBe(false);
    });

    it('should not filter immune damage', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      // Fuse: player 1 takes 2 damage from element 3 (THUNDER) with IMMUNE_INVAO mask
      const fuse = `1,0,3,2,${HPEvoMask.IMMUNE_INVAO}`;
      sf03.action!(p1, fuse, '');
      // Immune damage should be kept
      expect(innerMessages).toHaveLength(1);
      expect(innerMessages[0].msg).toBe(fuse);
    });

    it('should not filter DECR_INVAO masked damage', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      const fuse = `1,0,3,2,${HPEvoMask.DECR_INVAO}`;
      sf03.action!(p1, fuse, '');
      expect(innerMessages).toHaveLength(1);
      expect(innerMessages[0].msg).toBe(fuse);
    });

    it('should handle multiple damage entries', () => {
      const regs = cottage.registerAll();
      const sf03 = regs.find(r => r.code === 'SF03')!;
      const p1 = board.garden.get(1)!;
      // p1 takes proped damage, p2 takes non-proped damage
      const fuse = '1,0,3,2,0;2,0,0,1,0';
      sf03.action!(p1, fuse, '');
      // p1's proped damage filtered, p2's non-proped damage kept
      expect(innerMessages).toHaveLength(1);
      expect(innerMessages[0].msg).toBe('2,0,0,1,0');
    });
  });

  describe('SF04 - Resist Non-Self Damage', () => {
    it('should ask player whether to avoid damage', async () => {
      const regs = cottage.registerAll();
      const sf04 = regs.find(r => r.code === 'SF04')!;
      const p1 = board.garden.get(1)!;
      // Fuse: player 1 takes 2 damage from source 2, element 0 (A)
      asyncInputResults = ['2'];
      await sf04.action!(p1, '1,2,0,2,0', '');
      // The async input should have been called (we returned '2' = no)
    });

    it('should remove damage when player selects yes', async () => {
      const regs = cottage.registerAll();
      const sf04 = regs.find(r => r.code === 'SF04')!;
      const p1 = board.garden.get(1)!;
      // Player selects '1' (yes, avoid)
      asyncInputResults = ['1'];
      await sf04.action!(p1, '1,2,0,2,0', '');
      // Damage should be removed, no remaining fuse
      expect(innerMessages).toHaveLength(0);
    });

    it('should keep damage when player selects no', async () => {
      const regs = cottage.registerAll();
      const sf04 = regs.find(r => r.code === 'SF04')!;
      const p1 = board.garden.get(1)!;
      // Player selects '2' (no, don't avoid)
      asyncInputResults = ['2'];
      await sf04.action!(p1, '1,2,0,2,0', '');
      // Damage should remain
      expect(innerMessages).toHaveLength(1);
      expect(innerMessages[0].msg).toBe('1,2,0,2,0');
    });

    it('should cure player when alive', async () => {
      const regs = cottage.registerAll();
      const sf04 = regs.find(r => r.code === 'SF04')!;
      const p1 = board.garden.get(1)!;
      asyncInputResults = ['1'];
      await sf04.action!(p1, '1,2,0,2,0', '');
      // Cure message should be raised (cure self for 1)
      expect(messages.some(m => m.startsWith('G0IH,'))).toBe(true);
    });

    it('should be valid when another player deals damage', () => {
      const regs = cottage.registerAll();
      const sf04 = regs.find(r => r.code === 'SF04')!;
      const p1 = board.garden.get(1)!;
      // source 2 (not self), n > 0
      expect(sf04.valid!(p1, '1,2,0,3,0')).toBe(true);
    });

    it('should not be valid when damage is from self', () => {
      const regs = cottage.registerAll();
      const sf04 = regs.find(r => r.code === 'SF04')!;
      const p1 = board.garden.get(1)!;
      // source 1 = self
      expect(sf04.valid!(p1, '1,1,0,3,0')).toBe(false);
    });
  });

  describe('SF05 - DEX -2', () => {
    it('should raise G0OA with DEX reduction', () => {
      const regs = cottage.registerAll();
      const sf05 = regs.find(r => r.code === 'SF05')!;
      const p1 = board.garden.get(1)!;
      sf05.action!(p1, '', '');
      expect(messages).toContain('G0OA,1,1,2');
    });

    it('should be valid when attending war', () => {
      const regs = cottage.registerAll();
      const sf05 = regs.find(r => r.code === 'SF05')!;
      const p1 = board.garden.get(1)!;
      expect(sf05.valid!(p1, '')).toBe(true);
    });
  });

  describe('SF06 - Self Harm + Chain', () => {
    it('should harm self and raise chain', () => {
      const regs = cottage.registerAll();
      const sf06 = regs.find(r => r.code === 'SF06')!;
      const p1 = board.garden.get(1)!;
      sf06.action!(p1, '', '');
      // harm(self, self, 1) => G0OH,1,1,0,1,0 + G2YS target
      expect(messages.some(m => m.includes('G0OH,1,1,0,1,0'))).toBe(true);
      // chain message
      expect(messages).toContain('G1CK,1,SF06,0');
    });

    it('should be valid when fuse has non-chain damage to self', () => {
      const regs = cottage.registerAll();
      const sf06 = regs.find(r => r.code === 'SF06')!;
      const p1 = board.garden.get(1)!;
      // player 1 takes damage with no chain mask
      expect(sf06.valid!(p1, '1,2,0,3,0')).toBe(true);
    });

    it('should not be valid when fuse has chain-inavd damage', () => {
      const regs = cottage.registerAll();
      const sf06 = regs.find(r => r.code === 'SF06')!;
      const p1 = board.garden.get(1)!;
      // player 1 takes damage with CHAIN_INVAO mask
      expect(sf06.valid!(p1, `1,2,0,3,${HPEvoMask.CHAIN_INVAO}`)).toBe(false);
    });

    it('should not be valid when no damage to self in fuse', () => {
      const regs = cottage.registerAll();
      const sf06 = regs.find(r => r.code === 'SF06')!;
      const p1 = board.garden.get(1)!;
      // damage to player 2, not player 1
      expect(sf06.valid!(p1, '2,1,0,3,0')).toBe(false);
    });
  });

  describe('SF07 - Adjust Dice', () => {
    it('should adjust dice value', () => {
      const regs = cottage.registerAll();
      const sf07 = regs.find(r => r.code === 'SF07')!;
      const p1 = board.garden.get(1)!;
      board.diceValue = 3;
      // args='1' => idx=0 => vals[0] which is -2 => new value = 1
      sf07.action!(p1, 'SF07,1', '1');
      expect(messages).toContain('G0T7,1,3,1');
    });

    it('should adjust dice value with +2', () => {
      const regs = cottage.registerAll();
      const sf07 = regs.find(r => r.code === 'SF07')!;
      const p1 = board.garden.get(1)!;
      board.diceValue = 3;
      // vals = [-2, -1, 1, 2] (all valid for dv=3). args='4' => idx=3 => +2 => new=5
      sf07.action!(p1, 'SF07,3', '4');
      expect(messages).toContain('G0T7,1,3,5');
    });

    it('should return valid input options', () => {
      const regs = cottage.registerAll();
      const sf07 = regs.find(r => r.code === 'SF07')!;
      const p1 = board.garden.get(1)!;
      board.diceValue = 3;
      const input = sf07.input!(p1, 'SF07,1', '');
      expect(input).toContain('-2');
      expect(input).toContain('-1');
      expect(input).toContain('+1');
      expect(input).toContain('+2');
      expect(input).toContain('/Y4');
    });

    it('should limit options when near boundaries', () => {
      const regs = cottage.registerAll();
      const sf07 = regs.find(r => r.code === 'SF07')!;
      const p1 = board.garden.get(1)!;
      board.diceValue = 1;
      // Only +1 and +2 are valid (1-2=0 < 1, 1-1=0 < 1)
      const input = sf07.input!(p1, 'SF07,1', '');
      expect(input).toContain('+1');
      expect(input).toContain('+2');
      expect(input).not.toContain('-');
      expect(input).toContain('/Y2');
    });

    it('should limit options when at max', () => {
      const regs = cottage.registerAll();
      const sf07 = regs.find(r => r.code === 'SF07')!;
      const p1 = board.garden.get(1)!;
      board.diceValue = 6;
      // Only -2 and -1 are valid (6+1=7 > 6, 6+2=8 > 6)
      const input = sf07.input!(p1, 'SF07,1', '');
      expect(input).toContain('-2');
      expect(input).toContain('-1');
      expect(input).not.toContain('+');
      expect(input).toContain('/Y2');
    });
  });
});
