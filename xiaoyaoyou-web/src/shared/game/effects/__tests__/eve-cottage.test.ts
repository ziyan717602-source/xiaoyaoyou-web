/**
 * EveCottage Tests - Verify event card effects
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EveCottage } from '../eve-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { FiveElement } from '@shared/types/enums';
import { FiveElementHelper } from '../../card/five-element';
import { LibGroup } from '../../lib-group';

describe('EveCottage', () => {
  let cottage: EveCottage;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    cottage = new EveCottage(
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

    // Set up 2 players on opposing teams
    const p1 = new Player('Alice', 1, 1);
    p1.isAlive = true;
    p1.isTared = true;
    p1.team = 1;
    p1.gender = 'M';
    p1.strh = 2;
    p1.dexh = 2;
    p1.hp = 5;
    p1.hpBase = 5;
    p1.tux.push(101, 102, 103);

    const p2 = new Player('Bob', 2, 2);
    p2.isAlive = true;
    p2.isTared = true;
    p2.team = 2;
    p2.gender = 'M';
    p2.strh = 2;
    p2.dexh = 2;
    p2.hp = 5;
    p2.hpBase = 5;
    p2.tux.push(201, 202);

    board.garden.set(1, p1);
    board.garden.set(2, p2);
    board.rounder = p1;
  });

  // ─── registerAll ───

  describe('registerAll', () => {
    it('should register all event effects', () => {
      const regs = cottage.registerAll();
      expect(regs.length).toBeGreaterThan(0);
      const codes = regs.map(r => r.code);
      expect(codes).toContain('SJ101');
      expect(codes).toContain('SJ102');
      expect(codes).toContain('SJ103');
      expect(codes).toContain('SJ104');
      expect(codes).toContain('SJ201');
      expect(codes).toContain('SJ202');
      expect(codes).toContain('SJ301');
      expect(codes).toContain('SJ302');
      expect(codes).toContain('SJ303');
      expect(codes).toContain('SJ401');
      expect(codes).toContain('SJ402');
      expect(codes).toContain('SJ501');
      expect(codes).toContain('SJT01');
      expect(codes).toContain('SJT02');
      expect(codes).toContain('SJT03');
      expect(codes).toContain('SJT05');
      expect(codes).toContain('SJT06');
      expect(codes).toContain('SJT08');
      expect(codes).toContain('SJT09');
      expect(codes).toContain('SJT12');
      expect(codes).toContain('SJT19');
      expect(codes).toContain('SJT20');
      expect(codes).toContain('SJH01');
      expect(codes).toContain('SJH02');
      expect(codes).toContain('SJH03');
      expect(codes).toContain('SJH04');
      expect(codes).toContain('SJH05');
      expect(codes).toContain('SJH06');
      expect(codes).toContain('SJH07');
      expect(codes).toContain('SJH10');
      expect(codes).toContain('SJH11');
    });

    it('should return exactly 31 registrations', () => {
      const regs = cottage.registerAll();
      expect(regs).toHaveLength(31);
    });

    it('each registration should have a code and action', () => {
      const regs = cottage.registerAll();
      for (const reg of regs) {
        expect(reg.code).toBeTruthy();
        expect(typeof reg.action).toBe('function');
      }
    });
  });

  // ─── SJ101 - TianLeiPo (Thunder Strike) ───

  describe('SJ101 - TianLeiPo', () => {
    it('should damage male rounder with thunder element', async () => {
      const regs = cottage.registerAll();
      const sj101 = regs.find(r => r.code === 'SJ101')!;
      const p1 = board.garden.get(1)!;
      p1.gender = 'M';

      await sj101.action!(p1);

      // Should raise G0DH (discard) and G0OH (harm) messages
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0]).toContain('G0DH');
      expect(messages[0]).toContain('1'); // p1 uid
      expect(messages[1]).toContain('G0OH');
      expect(messages[1]).toContain('1'); // p1 uid
      expect(messages[1]).toContain(`${FiveElementHelper.elem2Int(FiveElement.THUNDER)}`);
    });

    it('should prompt female rounder to select target if alive males exist', async () => {
      const regs = cottage.registerAll();
      const sj101 = regs.find(r => r.code === 'SJ101')!;
      const p1 = board.garden.get(1)!;
      p1.gender = 'F';
      p1.armor = 301; // has armor

      asyncInputResults = ['2']; // select player 2 as target

      await sj101.action!(p1);

      // Should raise G0QZ (discard armor) and G0CC (card operation)
      expect(messages.some(m => m.includes('G0QZ'))).toBe(true);
      expect(messages.some(m => m.includes('G0CC'))).toBe(true);
    });

    it('should skip targeting if no alive male players exist', async () => {
      const regs = cottage.registerAll();
      const sj101 = regs.find(r => r.code === 'SJ101')!;
      const p1 = board.garden.get(1)!;
      p1.gender = 'F';
      p1.armor = 301;

      // Remove male players
      const p2 = board.garden.get(2)!;
      p2.gender = 'F';

      await sj101.action!(p1);

      // Should discard armor but not ask for target
      expect(messages.some(m => m.includes('G0QZ'))).toBe(true);
      expect(messages.some(m => m.includes('G0CC'))).toBe(false);
    });
  });

  // ─── SJ102 - WuChongZhao (Insect Swarm) ───

  describe('SJ102 - WuChongZhao', () => {
    it('should damage players with no pets', async () => {
      const regs = cottage.registerAll();
      const sj102 = regs.find(r => r.code === 'SJ102')!;
      const p1 = board.garden.get(1)!;

      // Both players have no pets
      await sj102.action!(p1);

      // Should raise G0DH for each player with no pets
      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain('1'); // p1 uid
      expect(dhMsg).toContain('2'); // p2 uid
    });

    it('should not damage players who have pets', async () => {
      const regs = cottage.registerAll();
      const sj102 = regs.find(r => r.code === 'SJ102')!;
      const p1 = board.garden.get(1)!;

      // Give p1 a pet
      p1.pets[0] = 999;

      await sj102.action!(p1);

      // Only p2 should be damaged
      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain('2');
      expect(dhMsg).not.toMatch(/,1,0,1/); // p1 should not be in the message
    });
  });

  // ─── SJ201 - XiaoYaoLing (Carefree Spirit) ───

  describe('SJ201 - XiaoYaoLing', () => {
    it('should heal players with hp <= 3', async () => {
      const regs = cottage.registerAll();
      const sj201 = regs.find(r => r.code === 'SJ201')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.hp = 2;
      p2.hp = 4;

      await sj201.action!(p1);

      // Only p1 (hp=2) should be healed
      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain('1');
      expect(dhMsg).not.toContain(',2,0,1');
    });

    it('should not heal players with hp > 3', async () => {
      const regs = cottage.registerAll();
      const sj201 = regs.find(r => r.code === 'SJ201')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.hp = 5;
      p2.hp = 5;

      await sj201.action!(p1);

      expect(messages.some(m => m.includes('G0DH'))).toBe(false);
    });
  });

  // ─── SJ301 - XiaoYaoFan (Carefree Turnover) ───

  describe('SJ301 - XiaoYaoFan', () => {
    it('should adjust hand cards to 3 for all players', async () => {
      const regs = cottage.registerAll();
      const sj301 = regs.find(r => r.code === 'SJ301')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      // p1 has 3 cards (no change), p2 has 2 cards (needs 1)
      p1.tux.splice(0, p1.tux.length, 101, 102, 103);
      p2.tux.splice(0, p2.tux.length, 201, 202);

      await sj301.action!(p1);

      // p2 should get a draw message
      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain('2');
      expect(dhMsg).toContain('0,1'); // draw 1 card
    });

    it('should discard excess cards from players with more than 3', async () => {
      const regs = cottage.registerAll();
      const sj301 = regs.find(r => r.code === 'SJ301')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103, 104, 105); // 5 cards
      p2.tux.splice(0, p2.tux.length, 201, 202); // 2 cards

      await sj301.action!(p1);

      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      // p1 should discard 2 cards
      expect(dhMsg).toContain('1,1,2');
      // p2 should draw 1 card
      expect(dhMsg).toContain('2,0,1');
    });
  });

  // ─── SJ302 - ChiYanLian (Red Flame Lotus) ───

  describe('SJ302 - ChiYanLian', () => {
    it('should cure the player(s) with lowest hp by 2', async () => {
      const regs = cottage.registerAll();
      const sj302 = regs.find(r => r.code === 'SJ302')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.hp = 3;
      p2.hp = 2;

      await sj302.action!(p1);

      // p2 has lowest hp, should be cured
      expect(messages.some(m => m.includes('G0IH'))).toBe(true);
      const ihMsg = messages.find(m => m.includes('G0IH'))!;
      expect(ihMsg).toContain('2');
    });

    it('should cure multiple players if they share lowest hp', async () => {
      const regs = cottage.registerAll();
      const sj302 = regs.find(r => r.code === 'SJ302')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.hp = 2;
      p2.hp = 2;

      await sj302.action!(p1);

      expect(messages.some(m => m.includes('G0IH'))).toBe(true);
      const ihMsg = messages.find(m => m.includes('G0IH'))!;
      expect(ihMsg).toContain('1');
      expect(ihMsg).toContain('2');
    });
  });

  // ─── SJ401 - QiShuGu (Seven Tree Valley) ───

  describe('SJ401 - QiShuGu', () => {
    it('should discard all hand cards and draw 2', async () => {
      const regs = cottage.registerAll();
      const sj401 = regs.find(r => r.code === 'SJ401')!;
      const p1 = board.garden.get(1)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103);

      await sj401.action!(p1);

      // Should discard all 3 cards and draw 2
      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const discardMsg = messages.find(m => m.includes('G0DH') && m.includes('2,3'))!;
      expect(discardMsg).toBeTruthy();
      const drawMsg = messages.find(m => m.includes('G0DH') && m.includes('0,2'))!;
      expect(drawMsg).toBeTruthy();
    });

    it('should only draw 2 when player has no hand cards', async () => {
      const regs = cottage.registerAll();
      const sj401 = regs.find(r => r.code === 'SJ401')!;
      const p1 = board.garden.get(1)!;

      p1.tux.splice(0, p1.tux.length);

      await sj401.action!(p1);

      // Should only draw 2
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('G0DH');
      expect(messages[0]).toContain('0,2');
    });
  });

  // ─── SJT01 - YingXingShu (Shadow Walk) ───

  describe('SJT01 - YingXingShu', () => {
    it('should swap hand cards with facer player', async () => {
      const regs = cottage.registerAll();
      const sjt01 = regs.find(r => r.code === 'SJT01')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103);
      p2.tux.splice(0, p2.tux.length, 201, 202);

      await sjt01.action!(p1);

      // Should raise G0HQ with hand card swap info
      expect(messages.some(m => m.includes('G0HQ'))).toBe(true);
      const hqMsg = messages.find(m => m.includes('G0HQ'))!;
      expect(hqMsg).toContain('4'); // type 4 = swap
      expect(hqMsg).toContain('1'); // p1 uid
    });
  });

  // ─── SJT05 - TianGuaDui (Melon Exchange) ───

  describe('SJT05 - TianGuaDui', () => {
    it('should discard 1 card from each player with hand cards', async () => {
      const regs = cottage.registerAll();
      const sjt05 = regs.find(r => r.code === 'SJT05')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103);
      p2.tux.splice(0, p2.tux.length, 201, 202);

      await sjt05.action!(p1);

      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
      const dhMsg = messages.find(m => m.includes('G0DH'))!;
      expect(dhMsg).toContain('1,1,1'); // p1 discard 1
      expect(dhMsg).toContain('2,1,1'); // p2 discard 1
    });
  });

  // ─── SJT09 - LiuYueFeng (June Wind) ───

  describe('SJT09 - LiuYueFeng', () => {
    it('should harm players with more than 3 hand cards', async () => {
      const regs = cottage.registerAll();
      const sjt09 = regs.find(r => r.code === 'SJT09')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103, 104); // 4 cards
      p2.tux.splice(0, p2.tux.length, 201, 202, 203, 204, 205); // 5 cards

      await sjt09.action!(p1);

      expect(messages.some(m => m.includes('G0OH'))).toBe(true);
      const ohMsg = messages.find(m => m.includes('G0OH'))!;
      expect(ohMsg).toContain('1'); // p1 harmed
      expect(ohMsg).toContain('2'); // p2 harmed
    });

    it('should cure players with less than 3 hand cards', async () => {
      const regs = cottage.registerAll();
      const sjt09 = regs.find(r => r.code === 'SJT09')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101); // 1 card
      p2.tux.splice(0, p2.tux.length, 201, 202); // 2 cards

      await sjt09.action!(p1);

      expect(messages.some(m => m.includes('G0IH'))).toBe(true);
      const ihMsg = messages.find(m => m.includes('G0IH'))!;
      expect(ihMsg).toContain('1'); // p1 cured
      expect(ihMsg).toContain('2'); // p2 cured
    });

    it('should do nothing to players with exactly 3 hand cards', async () => {
      const regs = cottage.registerAll();
      const sjt09 = regs.find(r => r.code === 'SJT09')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103);
      p2.tux.splice(0, p2.tux.length, 201, 202, 203);

      await sjt09.action!(p1);

      expect(messages).toHaveLength(0);
    });
  });

  // ─── SJT20 - FengYunBian (Storm Change) ───

  describe('SJT20 - FengYunBian', () => {
    it('should discard excess cards and grant flags', async () => {
      const regs = cottage.registerAll();
      const sjt20 = regs.find(r => r.code === 'SJT20')!;
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;

      p1.tux.splice(0, p1.tux.length, 101, 102, 103, 104); // 4 cards (>= 4, gets flag)
      p2.tux.splice(0, p2.tux.length, 201); // 1 card (<= 1, gets flag)

      await sjt20.action!(p1);

      // p1 has 4 cards, should discard down to 1 and get flag 6
      // p2 has 1 card, should get flag 4
      expect(messages.some(m => m.includes('G0IF'))).toBe(true);
      expect(messages.some(m => m.includes('G0DH'))).toBe(true);
    });
  });
});
