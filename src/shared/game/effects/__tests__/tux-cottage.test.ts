/**
 * TuxCottage Tests - Verify hand card effect delegates
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TuxCottage } from '../tux-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { FiveElement } from '@shared/types/enums';
import { HPEvoMask } from '../../card/five-element';
import { LibGroup } from '../../lib-group';

describe('TuxCottage', () => {
  let cottage: TuxCottage;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    cottage = new TuxCottage(
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
    const p1 = new Player('Alice', 1, 1);
    p1.isAlive = true;
    p1.isTared = true;
    p1.team = 1;
    p1.tux.push(101, 102, 103);
    const p2 = new Player('Bob', 2, 2);
    p2.isAlive = true;
    p2.isTared = true;
    p2.team = 2;
    p2.tux.push(201, 202);
    board.garden.set(1, p1);
    board.garden.set(2, p2);
  });

  describe('registerAll', () => {
    it('should register all hand card effects', () => {
      const regs = cottage.registerAll();
      expect(regs.length).toBeGreaterThan(0);
      const codes = regs.map(r => r.code);
      expect(codes).toContain('JP01');
      expect(codes).toContain('JP06');
      expect(codes).toContain('TP01');
      expect(codes).toContain('TP02');
      expect(codes).toContain('TP03');
      expect(codes).toContain('WQ02');
      expect(codes).toContain('FJ01');
      expect(codes).toContain('FJ03');
      expect(codes).toContain('ZP01');
      expect(codes).toContain('ZP02');
    });
  });

  describe('JP06 - TongQianBiao', () => {
    it('should be valid when another player has cards', () => {
      const regs = cottage.registerAll();
      const jp06 = regs.find(r => r.code === 'JP06')!;
      const p1 = board.garden.get(1)!;
      expect(jp06.valid!(p1, 0, '')).toBe(true);
    });

    it('should be valid when no other player has cards but self has cards', () => {
      const regs = cottage.registerAll();
      const jp06 = regs.find(r => r.code === 'JP06')!;
      const p1 = board.garden.get(1)!;
      // Remove all cards from other players
      const p2 = board.garden.get(2)!;
      p2.tux.splice(0);
      p2.weapon = 0;
      p2.armor = 0;
      p2.trove = 0;
      p2.exEquip = 0;
      // p1 still has tux
      expect(jp06.valid!(p1, 0, '')).toBe(true);
    });

    it('should be invalid when no players have cards', () => {
      const regs = cottage.registerAll();
      const jp06 = regs.find(r => r.code === 'JP06')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.tux.splice(0);
      p1.weapon = 0;
      p1.armor = 0;
      p1.trove = 0;
      p1.exEquip = 0;
      p2.tux.splice(0);
      p2.weapon = 0;
      p2.armor = 0;
      p2.trove = 0;
      p2.exEquip = 0;
      expect(jp06.valid!(p1, 0, '')).toBe(false);
    });
  });

  describe('TP01 - BingXinJue', () => {
    it('should be valid for non-teammate card use', () => {
      const regs = cottage.registerAll();
      const tp01 = regs.find(r => r.code === 'TP01')!;
      const p1 = board.garden.get(1)!;
      // fuse: G0CD,2,0,KN,1;...
      expect(tp01.valid!(p1, 0, 'G0CD,2,0,KN,1;TP01,0')).toBe(true);
    });

    it('should be invalid for teammate card use with TPOpt', () => {
      const regs = cottage.registerAll();
      const tp01 = regs.find(r => r.code === 'TP01')!;
      const p1 = board.garden.get(1)!;
      p1.isTPOpt = true;
      // fuse: G0CD,1,0,KN,1;... (teammate = player 1, same team)
      expect(tp01.valid!(p1, 0, 'G0CD,1,0,KN,1;TP01,0')).toBe(false);
    });
  });

  describe('TP02 - LingHuXianDan', () => {
    it('should be valid for type 0 (heal self)', () => {
      const regs = cottage.registerAll();
      const tp02 = regs.find(r => r.code === 'TP02')!;
      const p1 = board.garden.get(1)!;
      expect(tp02.valid!(p1, 0, '')).toBe(true);
    });

    it('should be valid for type 1 when there are dead players', () => {
      const regs = cottage.registerAll();
      const tp02 = regs.find(r => r.code === 'TP02')!;
      const p2 = board.garden.get(2)!;
      p2.hp = 0;
      expect(tp02.valid!(p2, 1, '')).toBe(true);
    });

    it('should be invalid for type 1 when no dead players', () => {
      const regs = cottage.registerAll();
      const tp02 = regs.find(r => r.code === 'TP02')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 3;
      p2.hp = 3;
      expect(tp02.valid!(p1, 1, '')).toBe(false);
    });
  });

  describe('TP03 - YinGu', () => {
    it('should be valid when player has non-immune damage', () => {
      const regs = cottage.registerAll();
      const tp03 = regs.find(r => r.code === 'TP03')!;
      const p1 = board.garden.get(1)!;
      // Harm: who=1,source=2,element=0,n=3,mask=0
      expect(tp03.valid!(p1, 0, '1,2,0,3,0')).toBe(true);
    });

    it('should be invalid when damage is immune', () => {
      const regs = cottage.registerAll();
      const tp03 = regs.find(r => r.code === 'TP03')!;
      const p1 = board.garden.get(1)!;
      // Harm with TUX_INAVO mask
      expect(tp03.valid!(p1, 0, `1,2,0,3,${HPEvoMask.TUX_INAVO}`)).toBe(false);
    });

    it('should be invalid when no damage to self', () => {
      const regs = cottage.registerAll();
      const tp03 = regs.find(r => r.code === 'TP03')!;
      const p1 = board.garden.get(1)!;
      // Harm to other player
      expect(tp03.valid!(p1, 0, '2,1,0,3,0')).toBe(false);
    });
  });

  describe('WQ02 - Consume', () => {
    it('should have consumeValid that checks for healing', () => {
      const regs = cottage.registerAll();
      const wq02 = regs.find(r => r.code === 'WQ02')!;
      const p1 = board.garden.get(1)!;
      // Cure: who=1,source=0,element=0,n=2,mask=0
      expect(wq02.consumeValid!(p1, 0, 0, '1,0,0,2,0')).toBe(true);
    });
  });

  describe('FJ01 - Consume', () => {
    it('should have consumeValid for revival', () => {
      const regs = cottage.registerAll();
      const fj01 = regs.find(r => r.code === 'FJ01')!;
      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      expect(fj01.consumeValid!(p1, 1, 0, '')).toBe(true);
    });

    it('should be invalid when not at 0 HP', () => {
      const regs = cottage.registerAll();
      const fj01 = regs.find(r => r.code === 'FJ01')!;
      const p1 = board.garden.get(1)!;
      p1.hp = 3;
      expect(fj01.consumeValid!(p1, 1, 0, '')).toBe(false);
    });
  });

  describe('FJ03 - Consume', () => {
    it('should have consumeValid for damage reduction', () => {
      const regs = cottage.registerAll();
      const fj03 = regs.find(r => r.code === 'FJ03')!;
      const p1 = board.garden.get(1)!;
      // Harm: who=1,source=2,element=0,n=2,mask=0
      expect(fj03.consumeValid!(p1, 0, 0, '1,2,0,2,0')).toBe(true);
    });
  });

  describe('ZP01', () => {
    it('should be valid when attending war', () => {
      const regs = cottage.registerAll();
      const zp01 = regs.find(r => r.code === 'ZP01')!;
      const p1 = board.garden.get(1)!;
      board.rounder = p1;
      expect(zp01.valid!(p1, 0, '')).toBe(true);
    });
  });

  describe('ZP02', () => {
    it('should be valid when attending war successfully', () => {
      const regs = cottage.registerAll();
      const zp02 = regs.find(r => r.code === 'ZP02')!;
      const p1 = board.garden.get(1)!;
      board.rounder = p1;
      board.hinderSucc = false;
      board.supportSucc = false;
      expect(zp02.valid!(p1, 0, '')).toBe(true);
    });
  });

  // ─── WQ04 - MoJian (Magic Sword) 典当 Effect ───

  describe('WQ04 - MoJian DianDang', () => {
    // WQ04 numeric ID is 50 (from tux.json Range: [50, 50])
    const WQ04_ID = 50;

    it('should be valid when player has WQ04 in hand cards', () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      p1.tux.push(WQ04_ID);
      expect(wq04.valid!(p1, 0, '')).toBe(true);
    });

    it('should be valid when player has WQ04 as equipped weapon', () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      p1.weapon = WQ04_ID;
      expect(wq04.valid!(p1, 0, '')).toBe(true);
    });

    it('should be valid when WQ04 is in either hand or equipped', () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      p1.tux.push(WQ04_ID);
      p1.weapon = WQ04_ID;
      expect(wq04.valid!(p1, 0, '')).toBe(true);
    });

    it('should be invalid when player has no WQ04', () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      expect(wq04.valid!(p1, 0, '')).toBe(false);
    });

    it('should discard WQ04 from hand and draw 2 cards', async () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      p1.tux.push(WQ04_ID);

      await wq04.action!(p1, 0, '', '');

      // Should raise G0QZ (discard) and G0DH (draw 2)
      expect(messages.some(m => m.includes('G0QZ'))).toBe(true);
      const qzMsg = messages.find(m => m.includes('G0QZ'))!;
      expect(qzMsg).toContain(`${WQ04_ID}`);

      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain(`${p1.uid}`);
      expect(dhMsg).toContain('0,2'); // draw 2 cards
    });

    it('should discard WQ04 from weapon slot and draw 2 cards', async () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      p1.weapon = WQ04_ID;

      await wq04.action!(p1, 0, '', '');

      expect(messages.some(m => m.includes('G0QZ'))).toBe(true);
      const qzMsg = messages.find(m => m.includes('G0QZ'))!;
      expect(qzMsg).toContain(`${WQ04_ID}`);

      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain(`${p1.uid}`);
      expect(dhMsg).toContain('0,2');
    });

    it('should only send one discard message when WQ04 is in both hand and weapon', async () => {
      const regs = cottage.registerAll();
      const wq04 = regs.find(r => r.code === 'WQ04')!;
      const p1 = board.garden.get(1)!;
      p1.tux.push(WQ04_ID);
      p1.weapon = WQ04_ID;

      await wq04.action!(p1, 0, '', '');

      // Should only discard one WQ04 (from hand takes priority)
      const qzMsgs = messages.filter(m => m.includes('G0QZ'));
      expect(qzMsgs).toHaveLength(1);
      expect(qzMsgs[0]).toContain(`${WQ04_ID}`);
    });
  });
});
