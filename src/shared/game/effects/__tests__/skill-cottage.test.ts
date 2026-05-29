/**
 * SkillCottage Tests - Verify hero skill effect delegates
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SkillCottage } from '../skill-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { Monster } from '../../card/monster';
import { FiveElement } from '@shared/types/enums';
import { HPEvoMask } from '../../card/five-element';
import { LibGroup } from '../../lib-group';
import { Rueue } from '../../utils/rueue';

describe('SkillCottage', () => {
  let cottage: SkillCottage;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    cottage = new SkillCottage(
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
    p1.hp = 5;
    p1.hpBase = 5;
    p1.tux.push(101, 102, 103);
    const p2 = new Player('Bob', 2, 2);
    p2.isAlive = true;
    p2.isTared = true;
    p2.team = 2;
    p2.hp = 5;
    p2.hpBase = 5;
    p2.tux.push(201, 202);
    board.garden.set(1, p1);
    board.garden.set(2, p2);
  });

  describe('registerAll', () => {
    it('should register all hero skill effects and return an array', () => {
      const regs = cottage.registerAll();
      expect(Array.isArray(regs)).toBe(true);
      expect(regs.length).toBeGreaterThan(0);
    });

    it('should contain standard hero skill codes', () => {
      const regs = cottage.registerAll();
      const codes = regs.map(r => r.code);
      // HL001 - YanFeng
      expect(codes).toContain('JNH0101');
      expect(codes).toContain('JNH0102');
      expect(codes).toContain('JNH0103');
      expect(codes).toContain('JNH0104');
      // HL002 - YangYue
      expect(codes).toContain('JNH0201');
      expect(codes).toContain('JNH0203');
      // XJ101 - LiXiaoyao
      expect(codes).toContain('JN10101');
      expect(codes).toContain('JN10102');
      // XJ104 - LinYueru
      expect(codes).toContain('JN10401');
      expect(codes).toContain('JN10402');
    });

    it('should contain expansion hero skill codes', () => {
      const regs = cottage.registerAll();
      const codes = regs.map(r => r.code);
      // XJ302 - TangXuejian
      expect(codes).toContain('JN30201');
      expect(codes).toContain('JN30202');
      expect(codes).toContain('JN30203');
      // XJ306 - ChongLou
      expect(codes).toContain('JN30601');
      expect(codes).toContain('JN30603');
    });

    it('should contain Fengming Yushi expansion codes', () => {
      const regs = cottage.registerAll();
      const codes = regs.map(r => r.code);
      // TR001 - Suyu
      expect(codes).toContain('JNT0101');
      // TR014 - Jieluo
      expect(codes).toContain('JNT1401');
      expect(codes).toContain('JNT1402');
    });

    it('should have action and valid delegates on all registrations', () => {
      const regs = cottage.registerAll();
      for (const reg of regs) {
        expect(reg.code).toBeTruthy();
        // At least one of action or valid should be defined
        expect(reg.action !== undefined || reg.valid !== undefined).toBe(true);
      }
    });

    it('should have no duplicate codes', () => {
      const regs = cottage.registerAll();
      const codes = regs.map(r => r.code);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  // ═══════════════════════════════════════════════
  // HL001 - YanFeng
  // ═══════════════════════════════════════════════

  describe('HL001 - YanFeng', () => {
    describe('JNH0101 - Token gain based on hand diversity', () => {
      it('should be valid when attending war and has tux', () => {
        const regs = cottage.registerAll();
        const jnh0101 = regs.find(r => r.code === 'JNH0101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        expect(jnh0101.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jnh0101 = regs.find(r => r.code === 'JNH0101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        expect(jnh0101.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when has no tux', () => {
        const regs = cottage.registerAll();
        const jnh0101 = regs.find(r => r.code === 'JNH0101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.tux.splice(0);
        expect(jnh0101.valid!(p1, 0, '')).toBe(false);
      });

      it('should raise G0DH and possibly G1MI messages on action', () => {
        const regs = cottage.registerAll();
        const jnh0101 = regs.find(r => r.code === 'JNH0101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        messages = [];
        jnh0101.action!(p1, 0, '', '');
        // Should raise G0DH (draw hand) message
        expect(messages.some(m => m.startsWith('G0DH,'))).toBe(true);
      });
    });

    describe('JNH0102 - Consume tokens for battle bonus', () => {
      it('should be valid when attending war and has >= 2 tokens', () => {
        const regs = cottage.registerAll();
        const jnh0102 = regs.find(r => r.code === 'JNH0102')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.tokenCount = 3;
        expect(jnh0102.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when token count < 2', () => {
        const regs = cottage.registerAll();
        const jnh0102 = regs.find(r => r.code === 'JNH0102')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.tokenCount = 1;
        expect(jnh0102.valid!(p1, 0, '')).toBe(false);
      });
    });

    describe('JNH0103 - Self damage when immobilized', () => {
      it('should be valid when immobilized and type 0', () => {
        const regs = cottage.registerAll();
        const jnh0103 = regs.find(r => r.code === 'JNH0103')!;
        const p1 = board.garden.get(1)!;
        p1.immobilized = true;
        // fuse format: G0DS,who,type,...
        expect(jnh0103.valid!(p1, 0, `G0DS,${p1.uid},0`)).toBe(true);
      });

      it('should be invalid when not immobilized', () => {
        const regs = cottage.registerAll();
        const jnh0103 = regs.find(r => r.code === 'JNH0103')!;
        const p1 = board.garden.get(1)!;
        p1.immobilized = false;
        expect(jnh0103.valid!(p1, 0, `G0DS,${p1.uid},0`)).toBe(false);
      });

      it('should be invalid when type is not 0', () => {
        const regs = cottage.registerAll();
        const jnh0103 = regs.find(r => r.code === 'JNH0103')!;
        const p1 = board.garden.get(1)!;
        p1.immobilized = true;
        expect(jnh0103.valid!(p1, 1, `G0DS,${p1.uid},0`)).toBe(false);
      });
    });

    describe('JNH0104 - Swap monsters', () => {
      it('should be valid when monster2 is set and fuse matches', () => {
        const regs = cottage.registerAll();
        const jnh0104 = regs.find(r => r.code === 'JNH0104')!;
        const p1 = board.garden.get(1)!;
        board.monster2 = 100;
        expect(jnh0104.valid!(p1, 0, `G0HZS,${p1.uid}`)).toBe(true);
      });

      it('should be invalid when monster2 is 0', () => {
        const regs = cottage.registerAll();
        const jnh0104 = regs.find(r => r.code === 'JNH0104')!;
        const p1 = board.garden.get(1)!;
        board.monster2 = 0;
        expect(jnh0104.valid!(p1, 0, `G0HZS,${p1.uid}`)).toBe(false);
      });

      it('should be invalid when fuse refers to another player', () => {
        const regs = cottage.registerAll();
        const jnh0104 = regs.find(r => r.code === 'JNH0104')!;
        const p1 = board.garden.get(1)!;
        board.monster2 = 100;
        expect(jnh0104.valid!(p1, 0, 'G0HZS,2')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // HL002 - YangYue
  // ═══════════════════════════════════════════════

  describe('HL002 - YangYue', () => {
    describe('JNH0203 - Redirect and amplify damage', () => {
      it('should be valid when hp < hpBase and has tux and harm targets self', () => {
        const regs = cottage.registerAll();
        const jnh0203 = regs.find(r => r.code === 'JNH0203')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 3;
        p1.hpBase = 5;
        p1.tux.push(101);
        // Harm fuse: who,source,element,n,mask
        expect(jnh0203.valid!(p1, 0, '1,2,0,2,0')).toBe(true);
      });

      it('should be invalid when hp >= hpBase', () => {
        const regs = cottage.registerAll();
        const jnh0203 = regs.find(r => r.code === 'JNH0203')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 5;
        p1.hpBase = 5;
        expect(jnh0203.valid!(p1, 0, '1,2,0,2,0')).toBe(false);
      });

      it('should be invalid when no tux', () => {
        const regs = cottage.registerAll();
        const jnh0203 = regs.find(r => r.code === 'JNH0203')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 3;
        p1.hpBase = 5;
        p1.tux.splice(0);
        expect(jnh0203.valid!(p1, 0, '1,2,0,2,0')).toBe(false);
      });

      it('should be invalid when harm has TERMIN_AT mask', () => {
        const regs = cottage.registerAll();
        const jnh0203 = regs.find(r => r.code === 'JNH0203')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 3;
        p1.hpBase = 5;
        p1.tux.push(101);
        expect(jnh0203.valid!(p1, 0, `1,2,0,2,${HPEvoMask.TERMIN_AT}`)).toBe(false);
      });

      it('should provide input format on first call', () => {
        const regs = cottage.registerAll();
        const jnh0203 = regs.find(r => r.code === 'JNH0203')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101, 102);
        const input = jnh0203.input!(p1, 0, '', '');
        expect(input).toContain('/Q1');
        expect(input).toContain('p101');
      });

      it('should return empty input on subsequent call', () => {
        const regs = cottage.registerAll();
        const jnh0203 = regs.find(r => r.code === 'JNH0203')!;
        const p1 = board.garden.get(1)!;
        const input = jnh0203.input!(p1, 0, '', 'prev');
        expect(input).toBe('');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ101 - LiXiaoyao
  // ═══════════════════════════════════════════════

  describe('XJ101 - LiXiaoyao', () => {
    describe('JN10101 - Bonus when rounder is female teammate', () => {
      it('should be valid when rounder is female teammate', () => {
        const regs = cottage.registerAll();
        const jn10101 = regs.find(r => r.code === 'JN10101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.gender = 'F';
        p1.team = 1;
        expect(jn10101.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when rounder is male', () => {
        const regs = cottage.registerAll();
        const jn10101 = regs.find(r => r.code === 'JN10101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.gender = 'M';
        expect(jn10101.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when rounder is enemy', () => {
        const regs = cottage.registerAll();
        const jn10101 = regs.find(r => r.code === 'JN10101')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        board.rounder = p2;
        p2.gender = 'F';
        // p1.team=1, p2.team=2, so they're enemies
        expect(jn10101.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ104 - LinYueru
  // ═══════════════════════════════════════════════

  describe('XJ104 - LinYueru', () => {
    describe('JN10401 - Weapon equip bonus', () => {
      it('should be valid for type 0 (equip)', () => {
        const regs = cottage.registerAll();
        const jn10401 = regs.find(r => r.code === 'JN10401')!;
        const p1 = board.garden.get(1)!;
        expect(jn10401.valid!(p1, 0, '')).toBe(true);
      });

      it('should be valid for type 1 (unequip)', () => {
        const regs = cottage.registerAll();
        const jn10401 = regs.find(r => r.code === 'JN10401')!;
        const p1 = board.garden.get(1)!;
        expect(jn10401.valid!(p1, 1, '')).toBe(true);
      });

      it('should be invalid for type 2', () => {
        const regs = cottage.registerAll();
        const jn10401 = regs.find(r => r.code === 'JN10401')!;
        const p1 = board.garden.get(1)!;
        expect(jn10401.valid!(p1, 2, '')).toBe(false);
      });

      it('should raise G0IA on type 0 action', () => {
        const regs = cottage.registerAll();
        const jn10401 = regs.find(r => r.code === 'JN10401')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn10401.action!(p1, 0, '', '');
        expect(messages).toContain('G0IA,1,0,1');
      });

      it('should raise G0OA on type 1 action', () => {
        const regs = cottage.registerAll();
        const jn10401 = regs.find(r => r.code === 'JN10401')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn10401.action!(p1, 1, '', '');
        expect(messages).toContain('G0OA,1,0,1');
      });
    });

    describe('JN10402 - Harm opponents on loss', () => {
      it('should be valid when attending war and enemy also attending war', () => {
        const regs = cottage.registerAll();
        const jn10402 = regs.find(r => r.code === 'JN10402')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        board.rounder = p1;
        // Enemy must also be attending war
        board.hinder = p2;
        expect(jn10402.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jn10402 = regs.find(r => r.code === 'JN10402')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        expect(jn10402.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ105 - A'Nu
  // ═══════════════════════════════════════════════

  describe('XJ105 - Anu', () => {
    describe('JN10501 - Give cards to teammate', () => {
      it('should be valid when has tux and teammate is tared', () => {
        const regs = cottage.registerAll();
        const jn10501 = regs.find(r => r.code === 'JN10501')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        p2.team = 1; // same team as p1
        p1.tux.push(101);
        expect(jn10501.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has no tux', () => {
        const regs = cottage.registerAll();
        const jn10501 = regs.find(r => r.code === 'JN10501')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        p2.team = 1;
        p1.tux.splice(0);
        expect(jn10501.valid!(p1, 0, '')).toBe(false);
      });

      it('should provide input with card and target selection', () => {
        const regs = cottage.registerAll();
        const jn10501 = regs.find(r => r.code === 'JN10501')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        p2.team = 1;
        p1.tux.push(101);
        const input = jn10501.input!(p1, 0, '', '');
        expect(input).toContain('/+Q1');
        expect(input).toContain('/T1');
        expect(input).toContain('p101');
      });
    });

    describe('JN10502 - No hand bonus', () => {
      it('should be valid when has no tux', () => {
        const regs = cottage.registerAll();
        const jn10502 = regs.find(r => r.code === 'JN10502')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        expect(jn10502.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has tux', () => {
        const regs = cottage.registerAll();
        const jn10502 = regs.find(r => r.code === 'JN10502')!;
        const p1 = board.garden.get(1)!;
        expect(jn10502.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ201 - WangXiaohu
  // ═══════════════════════════════════════════════

  describe('XJ201 - WangXiaohu', () => {
    describe('JN20101 - Dice roll for STR', () => {
      it('should be valid when attending war', () => {
        const regs = cottage.registerAll();
        const jn20101 = regs.find(r => r.code === 'JN20101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        expect(jn20101.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jn20101 = regs.find(r => r.code === 'JN20101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        expect(jn20101.valid!(p1, 0, '')).toBe(false);
      });

      it('should raise G0TT on action', () => {
        const regs = cottage.registerAll();
        const jn20101 = regs.find(r => r.code === 'JN20101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        messages = [];
        jn20101.action!(p1, 0, '', '');
        expect(messages).toContain('G0TT,1');
      });
    });

    describe('JN20102 - Discard for dice roll', () => {
      it('should be valid when has tux and fuse references self', () => {
        const regs = cottage.registerAll();
        const jn20102 = regs.find(r => r.code === 'JN20102')!;
        const p1 = board.garden.get(1)!;
        expect(jn20102.valid!(p1, 0, 'G0TT,1')).toBe(true);
      });

      it('should be invalid when has no tux', () => {
        const regs = cottage.registerAll();
        const jn20102 = regs.find(r => r.code === 'JN20102')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        expect(jn20102.valid!(p1, 0, 'G0TT,1')).toBe(false);
      });

      it('should be invalid when fuse references another player', () => {
        const regs = cottage.registerAll();
        const jn20102 = regs.find(r => r.code === 'JN20102')!;
        const p1 = board.garden.get(1)!;
        expect(jn20102.valid!(p1, 0, 'G0TT,2')).toBe(false);
      });

      it('should provide input for card selection', () => {
        const regs = cottage.registerAll();
        const jn20102 = regs.find(r => r.code === 'JN20102')!;
        const p1 = board.garden.get(1)!;
        const input = jn20102.input!(p1, 0, '', '');
        expect(input).toContain('/Q1');
        expect(input).toContain('p101');
        expect(input).toContain('p102');
      });

      it('should return empty input on subsequent call', () => {
        const regs = cottage.registerAll();
        const jn20102 = regs.find(r => r.code === 'JN20102')!;
        const p1 = board.garden.get(1)!;
        expect(jn20102.input!(p1, 0, '', 'prev')).toBe('');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ302 - TangXuejian
  // ═══════════════════════════════════════════════

  describe('XJ302 - TangXuejian', () => {
    describe('JN30201 - Discard card to negate harm', () => {
      it('should be valid when has tux and harm fuse has valid target', () => {
        const regs = cottage.registerAll();
        const jn30201 = regs.find(r => r.code === 'JN30201')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        // isSKOpt defaults to true and blocks self-targeting harm
        // Set isSKOpt to false so self-targeted harm is valid
        p1.isSKOpt = false;
        // Harm fuse: who,source,element,n,mask
        expect(jn30201.valid!(p1, 0, '1,2,0,2,0')).toBe(true);
      });

      it('should be invalid when no tux', () => {
        const regs = cottage.registerAll();
        const jn30201 = regs.find(r => r.code === 'JN30201')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        expect(jn30201.valid!(p1, 0, '1,2,0,2,0')).toBe(false);
      });

      it('should be invalid when harm amount is 0', () => {
        const regs = cottage.registerAll();
        const jn30201 = regs.find(r => r.code === 'JN30201')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        expect(jn30201.valid!(p1, 0, '1,2,0,0,0')).toBe(false);
      });

      it('should provide input for card selection', () => {
        const regs = cottage.registerAll();
        const jn30201 = regs.find(r => r.code === 'JN30201')!;
        const p1 = board.garden.get(1)!;
        const input = jn30201.input!(p1, 0, '', '');
        expect(input).toContain('/Q1');
        expect(input).toContain('p101');
      });
    });

    describe('JN30203 - Self damage 2 to draw 2 cards', () => {
      it('should be valid when hp >= 2 and attending war', () => {
        const regs = cottage.registerAll();
        const jn30203 = regs.find(r => r.code === 'JN30203')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.hp = 4;
        expect(jn30203.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when hp < 2', () => {
        const regs = cottage.registerAll();
        const jn30203 = regs.find(r => r.code === 'JN30203')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.hp = 1;
        expect(jn30203.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jn30203 = regs.find(r => r.code === 'JN30203')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        p1.hp = 4;
        expect(jn30203.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ303 - Longkui Blue
  // ═══════════════════════════════════════════════

  describe('XJ303 - Longkui Blue', () => {
    describe('JN30301 - Transform to Red', () => {
      it('should be valid for type 0', () => {
        const regs = cottage.registerAll();
        const jn30301 = regs.find(r => r.code === 'JN30301')!;
        const p1 = board.garden.get(1)!;
        expect(jn30301.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid for type 1', () => {
        const regs = cottage.registerAll();
        const jn30301 = regs.find(r => r.code === 'JN30301')!;
        const p1 = board.garden.get(1)!;
        expect(jn30301.valid!(p1, 1, '')).toBe(false);
      });

      it('should raise transformation messages on action', () => {
        const regs = cottage.registerAll();
        const jn30301 = regs.find(r => r.code === 'JN30301')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn30301.action!(p1, 0, '', '');
        // Should raise G0OY (remove hero), G0OS (remove skills), G0IY (add hero), G0IS (add skills)
        expect(messages.some(m => m.startsWith('G0OY,'))).toBe(true);
        expect(messages.some(m => m.startsWith('G0OS,'))).toBe(true);
        expect(messages.some(m => m.startsWith('G0IY,'))).toBe(true);
        expect(messages.some(m => m.startsWith('G0IS,'))).toBe(true);
        // Should transform to XJ304 (10304)
        expect(messages.some(m => m.includes('10304'))).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ304 - Longkui Red
  // ═══════════════════════════════════════════════

  describe('XJ304 - Longkui Red', () => {
    describe('JN30401 - Transform to Blue', () => {
      it('should be valid for type 0', () => {
        const regs = cottage.registerAll();
        const jn30401 = regs.find(r => r.code === 'JN30401')!;
        const p1 = board.garden.get(1)!;
        expect(jn30401.valid!(p1, 0, '')).toBe(true);
      });

      it('should transform to XJ303 (10303)', () => {
        const regs = cottage.registerAll();
        const jn30401 = regs.find(r => r.code === 'JN30401')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn30401.action!(p1, 0, '', '');
        expect(messages.some(m => m.includes('10303'))).toBe(true);
      });
    });

    describe('JN30403 - Discard equip to deal 3 damage', () => {
      it('should be valid when has equips', () => {
        const regs = cottage.registerAll();
        const jn30403 = regs.find(r => r.code === 'JN30403')!;
        const p1 = board.garden.get(1)!;
        p1.weapon = 101;
        expect(jn30403.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has no equips', () => {
        const regs = cottage.registerAll();
        const jn30403 = regs.find(r => r.code === 'JN30403')!;
        const p1 = board.garden.get(1)!;
        expect(jn30403.valid!(p1, 0, '')).toBe(false);
      });

      it('should provide input for card then target selection', () => {
        const regs = cottage.registerAll();
        const jn30403 = regs.find(r => r.code === 'JN30403')!;
        const p1 = board.garden.get(1)!;
        p1.weapon = 101;
        const input = jn30403.input!(p1, 0, '', '');
        expect(input).toContain('/Q1');
        expect(input).toContain('p101');
      });

      it('should provide target selection on second call', () => {
        const regs = cottage.registerAll();
        const jn30403 = regs.find(r => r.code === 'JN30403')!;
        const p1 = board.garden.get(1)!;
        p1.weapon = 101;
        const input = jn30403.input!(p1, 0, '', '101');
        expect(input).toContain('/T1');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ306 - ChongLou
  // ═══════════════════════════════════════════════

  describe('XJ306 - ChongLou', () => {
    describe('JN30603 - When enemy is rounder, +2 STR', () => {
      it('should be valid when enemy is rounder and attending war', () => {
        const regs = cottage.registerAll();
        const jn30603 = regs.find(r => r.code === 'JN30603')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        board.rounder = p2; // enemy is rounder
        board.hinder = p1;  // p1 is hinder (attending war)
        expect(jn30603.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when teammate is rounder', () => {
        const regs = cottage.registerAll();
        const jn30603 = regs.find(r => r.code === 'JN30603')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1; // teammate (self) is rounder
        expect(jn30603.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jn30603 = regs.find(r => r.code === 'JN30603')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        board.rounder = p2;
        // p1 is not hinder, not supporter, not in drums
        expect(jn30603.valid!(p1, 0, '')).toBe(false);
      });

      it('should raise G0IX with +2 STR on action', () => {
        const regs = cottage.registerAll();
        const jn30603 = regs.find(r => r.code === 'JN30603')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn30603.action!(p1, 0, '', '');
        expect(messages).toContain('G0IX,1,1,2');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ401 - YunTianhe
  // ═══════════════════════════════════════════════

  describe('XJ401 - YunTianhe', () => {
    describe('JN50101 - STR+2 when DEX difference >= 4', () => {
      it('should be valid when attending war and dex difference >= 4 and type 0', () => {
        const regs = cottage.registerAll();
        const jn50101 = regs.find(r => r.code === 'JN50101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        // dex getter reads dexB by default (sdASet=false, sdCSet=false)
        p1.dexB = 10;
        const battler = new Monster('Battler', 'GF01', 1, 1, FiveElement.AQUA, 5, 5, 'N' as any, null, null, null, null, null, null, '');
        board.battler = battler;
        expect(jn50101.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when dex difference < 4', () => {
        const regs = cottage.registerAll();
        const jn50101 = regs.find(r => r.code === 'JN50101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.dexB = 6;
        const battler = new Monster('Battler', 'GF01', 1, 1, FiveElement.AQUA, 5, 5, 'N' as any, null, null, null, null, null, null, '');
        board.battler = battler;
        expect(jn50101.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jn50101 = regs.find(r => r.code === 'JN50101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        const battler = new Monster('Battler', 'GF01', 1, 1, FiveElement.AQUA, 5, 5, 'N' as any, null, null, null, null, null, null, '');
        board.battler = battler;
        expect(jn50101.valid!(p1, 0, '')).toBe(false);
      });

      it('should not grant STR+2 if already granted', () => {
        const regs = cottage.registerAll();
        const jn50101 = regs.find(r => r.code === 'JN50101')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.dexB = 10;
        p1.ram.set('STR+2', true);
        const battler = new Monster('Battler', 'GF01', 1, 1, FiveElement.AQUA, 5, 5, 'N' as any, null, null, null, null, null, null, '');
        board.battler = battler;
        expect(jn50101.valid!(p1, 0, '')).toBe(false);
      });

      it('should raise G0IA with +2 on action', () => {
        const regs = cottage.registerAll();
        const jn50101 = regs.find(r => r.code === 'JN50101')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn50101.action!(p1, 0, '', '');
        expect(messages).toContain('G0IA,1,1,2');
        expect(p1.ram.getBool('STR+2')).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ107 - Baiyue Lord
  // ═══════════════════════════════════════════════

  describe('XJ107 - Baiyue Lord', () => {
    describe('JN10701 - STR+2 when fighting AQUA/AGNI monster', () => {
      it('should be valid when fighting AQUA monster', () => {
        const regs = cottage.registerAll();
        const jn10701 = regs.find(r => r.code === 'JN10701')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        const monster = { isMonster: () => true, element: FiveElement.AQUA } as any;
        board.battler = monster;
        expect(jn10701.valid!(p1, 0, '')).toBe(true);
      });

      it('should be valid when fighting AGNI monster', () => {
        const regs = cottage.registerAll();
        const jn10701 = regs.find(r => r.code === 'JN10701')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        const monster = { isMonster: () => true, element: FiveElement.AGNI } as any;
        board.battler = monster;
        expect(jn10701.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when fighting non-AQUA/AGNI monster', () => {
        const regs = cottage.registerAll();
        const jn10701 = regs.find(r => r.code === 'JN10701')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        const monster = { isMonster: () => true, element: FiveElement.THUNDER } as any;
        board.battler = monster;
        expect(jn10701.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when battler is null', () => {
        const regs = cottage.registerAll();
        const jn10701 = regs.find(r => r.code === 'JN10701')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        board.battler = null;
        expect(jn10701.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jn10701 = regs.find(r => r.code === 'JN10701')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        const monster = { isMonster: () => true, element: FiveElement.AQUA } as any;
        board.battler = monster;
        expect(jn10701.valid!(p1, 0, '')).toBe(false);
      });
    });

    describe('JN10702 - Discard 2 tux for pool', () => {
      it('should be valid when attending war, has >= 2 tux, and restZP > 0', () => {
        const regs = cottage.registerAll();
        const jn10702 = regs.find(r => r.code === 'JN10702')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.tux.push(101, 102);
        p1.restZP = 1;
        expect(jn10702.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has < 2 tux', () => {
        const regs = cottage.registerAll();
        const jn10702 = regs.find(r => r.code === 'JN10702')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.tux.splice(0);
        p1.tux.push(101);
        p1.restZP = 1;
        expect(jn10702.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when restZP is 0', () => {
        const regs = cottage.registerAll();
        const jn10702 = regs.find(r => r.code === 'JN10702')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.tux.push(101, 102);
        p1.restZP = 0;
        expect(jn10702.valid!(p1, 0, '')).toBe(false);
      });

      it('should provide input for card selection', () => {
        const regs = cottage.registerAll();
        const jn10702 = regs.find(r => r.code === 'JN10702')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101, 102);
        const input = jn10702.input!(p1, 0, '', '');
        expect(input).toContain('/Q2');
        expect(input).toContain('p101');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ207 - Mozun
  // ═══════════════════════════════════════════════

  describe('XJ207 - Mozun', () => {
    describe('JN20701 - Draw 1 card', () => {
      it('should raise G0DH on action', () => {
        const regs = cottage.registerAll();
        const jn20701 = regs.find(r => r.code === 'JN20701')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn20701.action!(p1, 0, '', '');
        expect(messages).toContain('G0DH,1,0,1');
      });
    });

    describe('JN20702 - Harm self for 1', () => {
      it('should raise G0OH on action', () => {
        const regs = cottage.registerAll();
        const jn20702 = regs.find(r => r.code === 'JN20702')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn20702.action!(p1, 0, '', '');
        // harm calls targetPlayer then raiseGMessage
        expect(messages.some(m => m.startsWith('G2YS,'))).toBe(true);
        expect(messages.some(m => m.startsWith('G0OH,'))).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // X3W04 - WangPengXu
  // ═══════════════════════════════════════════════

  describe('X3W04 - WangPengXu', () => {
    describe('JN40401 - Discard card to heal 2', () => {
      it('should be valid when has any cards', () => {
        const regs = cottage.registerAll();
        const jn40401 = regs.find(r => r.code === 'JN40401')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        expect(jn40401.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has no cards', () => {
        const regs = cottage.registerAll();
        const jn40401 = regs.find(r => r.code === 'JN40401')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        expect(jn40401.valid!(p1, 0, '')).toBe(false);
      });

      it('should provide input for card selection', () => {
        const regs = cottage.registerAll();
        const jn40401 = regs.find(r => r.code === 'JN40401')!;
        const p1 = board.garden.get(1)!;
        const input = jn40401.input!(p1, 0, '', '');
        expect(input).toContain('/Q1');
        expect(input).toContain('p101');
      });

      it('should discard card and cure on action', () => {
        const regs = cottage.registerAll();
        const jn40401 = regs.find(r => r.code === 'JN40401')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        p1.hp = 3;
        messages = [];
        jn40401.action!(p1, 0, '', '101');
        // Should raise G0QZ (discard) and G0IH (cure)
        expect(messages.some(m => m.startsWith('G0QZ,'))).toBe(true);
        expect(messages.some(m => m.startsWith('G0IH,'))).toBe(true);
        expect(messages.some(m => m.includes('101'))).toBe(true);
      });

      it('should not act when argst is 0', () => {
        const regs = cottage.registerAll();
        const jn40401 = regs.find(r => r.code === 'JN40401')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn40401.action!(p1, 0, '', '0');
        expect(messages.length).toBe(0);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ505 - JiangShili
  // ═══════════════════════════════════════════════

  describe('XJ505 - JiangShili', () => {
    describe('JN60502 - Sacrifice: Skip turn to boost team', () => {
      it('should be valid for type 0 when attending war', () => {
        const regs = cottage.registerAll();
        const jn60502 = regs.find(r => r.code === 'JN60502')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        expect(jn60502.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid for type 0 when not attending war', () => {
        const regs = cottage.registerAll();
        const jn60502 = regs.find(r => r.code === 'JN60502')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        expect(jn60502.valid!(p1, 0, '')).toBe(false);
      });

      it('should be valid for type 1 when Sacrified is set', () => {
        const regs = cottage.registerAll();
        const jn60502 = regs.find(r => r.code === 'JN60502')!;
        const p1 = board.garden.get(1)!;
        p1.rom.set('Sacrified', true);
        expect(jn60502.valid!(p1, 1, '')).toBe(true);
      });

      it('should be invalid for type 1 when Sacrified is not set', () => {
        const regs = cottage.registerAll();
        const jn60502 = regs.find(r => r.code === 'JN60502')!;
        const p1 = board.garden.get(1)!;
        expect(jn60502.valid!(p1, 1, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ501 - JiangYunfan
  // ═══════════════════════════════════════════════

  describe('XJ501 - JiangYunfan', () => {
    describe('JN60101 - Use ZP card even when ZP is disabled', () => {
      it('should be valid when has tux and ZP is disabled', () => {
        const regs = cottage.registerAll();
        const jn60101 = regs.find(r => r.code === 'JN60101')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        p1.setZPDisabled('test', true);
        expect(jn60101.valid!(p1, 0, '')).toBe(true);
      });

      it('should be valid when has tux and restZP is 0', () => {
        const regs = cottage.registerAll();
        const jn60101 = regs.find(r => r.code === 'JN60101')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        p1.restZP = 0;
        expect(jn60101.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has no tux', () => {
        const regs = cottage.registerAll();
        const jn60101 = regs.find(r => r.code === 'JN60101')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        p1.setZPDisabled('test', true);
        expect(jn60101.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // XJ402 - HanLingsha
  // ═══════════════════════════════════════════════

  describe('XJ402 - HanLingsha', () => {
    describe('JN50202 - Draw 1, if >=2 hand draw 1 more', () => {
      it('should raise G0DH with 1 draw when tux.length < 2', () => {
        const regs = cottage.registerAll();
        const jn50202 = regs.find(r => r.code === 'JN50202')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        p1.tux.push(101);
        messages = [];
        jn50202.action!(p1, 0, '', '');
        expect(messages).toContain('G0DH,1,0,1');
        // Should only draw 1 since tux.length < 2
        expect(messages.filter(m => m.startsWith('G0DH,')).length).toBe(1);
      });

      it('should raise 2 G0DH when tux.length >= 2', () => {
        const regs = cottage.registerAll();
        const jn50202 = regs.find(r => r.code === 'JN50202')!;
        const p1 = board.garden.get(1)!;
        messages = [];
        jn50202.action!(p1, 0, '', '');
        const dhMessages = messages.filter(m => m.startsWith('G0DH,'));
        expect(dhMessages.length).toBe(2);
        // First draw from pile, second draw from hand
        expect(dhMessages[0]).toBe('G0DH,1,0,1');
        expect(dhMessages[1]).toBe('G0DH,1,1,1');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // HL003 - YangTai
  // ═══════════════════════════════════════════════

  describe('HL003 - YangTai', () => {
    describe('JNH0301 - Redirect damage to enemy', () => {
      it('should be valid when harmed and has enough cards and tared enemies exist', () => {
        const regs = cottage.registerAll();
        const jnh0301 = regs.find(r => r.code === 'JNH0301')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        // Harm fuse: who,source,element,n,mask;...
        // p1 takes 2 damage, has 3 cards
        expect(jnh0301.valid!(p1, 0, '1,2,0,2,0')).toBe(true);
      });

      it('should be invalid when damage exceeds card count', () => {
        const regs = cottage.registerAll();
        const jnh0301 = regs.find(r => r.code === 'JNH0301')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        // p1 has no cards, but takes 2 damage
        expect(jnh0301.valid!(p1, 0, '1,2,0,2,0')).toBe(false);
      });

      it('should be invalid when harm does not target self', () => {
        const regs = cottage.registerAll();
        const jnh0301 = regs.find(r => r.code === 'JNH0301')!;
        const p1 = board.garden.get(1)!;
        // Harm targets player 2, not player 1
        expect(jnh0301.valid!(p1, 0, '2,1,0,2,0')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // TR011 - JiangCheng
  // ═══════════════════════════════════════════════

  describe('TR011 - JiangCheng', () => {
    describe('JNT1102 - +2 STR as supporter', () => {
      it('should be valid when is the supporter', () => {
        const regs = cottage.registerAll();
        const jnt1102 = regs.find(r => r.code === 'JNT1102')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        board.supporter = p1;
        expect(jnt1102.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when is not the supporter', () => {
        const regs = cottage.registerAll();
        const jnt1102 = regs.find(r => r.code === 'JNT1102')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        expect(jnt1102.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // TR013 - XieCangxing
  // ═══════════════════════════════════════════════

  describe('TR013 - XieCangxing', () => {
    describe('JNT1301 - Self-damage to gain STR while unarmed', () => {
      it('should be valid when attending war and unarmed', () => {
        const regs = cottage.registerAll();
        const jnt1301 = regs.find(r => r.code === 'JNT1301')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.weapon = 0;
        expect(jnt1301.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when has weapon', () => {
        const regs = cottage.registerAll();
        const jnt1301 = regs.find(r => r.code === 'JNT1301')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.weapon = 101;
        expect(jnt1301.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when not attending war', () => {
        const regs = cottage.registerAll();
        const jnt1301 = regs.find(r => r.code === 'JNT1301')!;
        const p1 = board.garden.get(1)!;
        board.rounder = board.garden.get(2)!;
        p1.weapon = 0;
        expect(jnt1301.valid!(p1, 0, '')).toBe(false);
      });
    });

    describe('JNT1302 - Force opponent discard pets when HP < 5', () => {
      it('should be valid when hp < 5 and attending war', () => {
        const regs = cottage.registerAll();
        const jnt1302 = regs.find(r => r.code === 'JNT1302')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.hp = 3;
        expect(jnt1302.valid!(p1, 0, '')).toBe(true);
      });

      it('should be invalid when hp >= 5', () => {
        const regs = cottage.registerAll();
        const jnt1302 = regs.find(r => r.code === 'JNT1302')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.hp = 5;
        expect(jnt1302.valid!(p1, 0, '')).toBe(false);
      });

      it('should be invalid when hp is 0', () => {
        const regs = cottage.registerAll();
        const jnt1302 = regs.find(r => r.code === 'JNT1302')!;
        const p1 = board.garden.get(1)!;
        board.rounder = p1;
        p1.hp = 0;
        expect(jnt1302.valid!(p1, 0, '')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // TR014 - Jieluo
  // ═══════════════════════════════════════════════

  describe('TR014 - Jieluo', () => {
    describe('JNT1401 - Negate WORM-type lethal damage', () => {
      it('should be valid when hp >= 2 and has lethal WORM damage', () => {
        const regs = cottage.registerAll();
        const jnt1401 = regs.find(r => r.code === 'JNT1401')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 3;
        // Harm fuse with WORM mask and n >= hp
        const wormMask = HPEvoMask.RSV_WORM;
        expect(jnt1401.valid!(p1, 0, `1,2,0,3,${wormMask}`)).toBe(true);
      });

      it('should be invalid when hp < 2', () => {
        const regs = cottage.registerAll();
        const jnt1401 = regs.find(r => r.code === 'JNT1401')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 1;
        const wormMask = HPEvoMask.RSV_WORM;
        expect(jnt1401.valid!(p1, 0, `1,2,0,3,${wormMask}`)).toBe(false);
      });

      it('should be invalid when damage is not WORM type', () => {
        const regs = cottage.registerAll();
        const jnt1401 = regs.find(r => r.code === 'JNT1401')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 3;
        expect(jnt1401.valid!(p1, 0, '1,2,0,3,0')).toBe(false);
      });

      it('should be invalid when damage is not lethal', () => {
        const regs = cottage.registerAll();
        const jnt1401 = regs.find(r => r.code === 'JNT1401')!;
        const p1 = board.garden.get(1)!;
        p1.hp = 3;
        const wormMask = HPEvoMask.RSV_WORM;
        // n=1 < hp=3, not lethal
        expect(jnt1401.valid!(p1, 0, `1,2,0,1,${wormMask}`)).toBe(false);
      });
    });

    describe('JNT1402 - Split damage to male player', () => {
      it('should be valid when has tux and takes damage', () => {
        const regs = cottage.registerAll();
        const jnt1402 = regs.find(r => r.code === 'JNT1402')!;
        const p1 = board.garden.get(1)!;
        p1.tux.push(101);
        expect(jnt1402.valid!(p1, 0, '1,2,0,2,0')).toBe(true);
      });

      it('should be invalid when no tux', () => {
        const regs = cottage.registerAll();
        const jnt1402 = regs.find(r => r.code === 'JNT1402')!;
        const p1 = board.garden.get(1)!;
        p1.tux.splice(0);
        expect(jnt1402.valid!(p1, 0, '1,2,0,2,0')).toBe(false);
      });

      it('should provide card selection input', () => {
        const regs = cottage.registerAll();
        const jnt1402 = regs.find(r => r.code === 'JNT1402')!;
        const p1 = board.garden.get(1)!;
        const input = jnt1402.input!(p1, 0, '', '');
        expect(input).toContain('/Q1');
        expect(input).toContain('p101');
      });

      it('should provide target selection on second call', () => {
        const regs = cottage.registerAll();
        const jnt1402 = regs.find(r => r.code === 'JNT1402')!;
        const p1 = board.garden.get(1)!;
        const p2 = board.garden.get(2)!;
        p2.gender = 'M';
        const input = jnt1402.input!(p1, 0, '', '101');
        expect(input).toContain('/T1');
        expect(input).toContain('p2');
      });
    });
  });
});
