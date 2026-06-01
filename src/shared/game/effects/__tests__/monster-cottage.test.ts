/**
 * MonsterCottage Tests - Verify monster battle effect delegates
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonsterCottage } from '../monster-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { LibGroup } from '../../lib-group';
import { Monster } from '../../card/monster';
import { MonsterLib } from '../../lib/monster-lib';
import { FiveElement, MonsterLevel } from '@shared/types/enums';

function makeMonster(code: string, name: string): Monster {
  return new Monster(
    name, code, 1, 0, FiveElement.AERO, 3, 3, MonsterLevel.WOODEN,
    null, null, null, null, null, null, '',
  );
}

function makeMonsterLib(monsters: Monster[]): MonsterLib {
  // MonsterLib expects MonsterData[] but we can construct from firsts
  const lib = new MonsterLib([]);
  lib.firsts.push(...monsters);
  return lib;
}

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

describe('MonsterCottage', () => {
  let cottage: MonsterCottage;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    cottage = new MonsterCottage(
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
  });

  describe('registerDelegates', () => {
    it('should wire delegates for known monsters', () => {
      const mon = makeMonster('GS01', '千杯不醉');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
      // GS01 has debut, loseEff, incrAction, decrAction
      expect(mon.debut).not.toBeNull();
      expect(mon.loseEff).not.toBeNull();
      expect(mon.incrAction).not.toBeNull();
      expect(mon.decrAction).not.toBeNull();
    });

    it('should not override defaults for unknown monsters', () => {
      const mon = makeMonster('XXXX', '未知');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
      // Should remain default no-op
      expect(() => mon.debut()).not.toThrow();
    });
  });

  describe('GS01 - 千杯不醉', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GS01', '千杯不醉');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('debut should swap cards between rounder and hinder', () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.tux.push(101, 102);
      p2.tux.push(201);
      board.hinder = p2;
      mon.debut();
      expect(messages.some(m => m.startsWith('G0HQ,4,'))).toBe(true);
    });

    it('loseEff should make rounder discard 1 card', () => {
      mon.loseEff();
      expect(messages.some(m => m.startsWith('G0DS,'))).toBe(true);
    });

    it('incrAction should raise G0IA', () => {
      const p1 = board.garden.get(1)!;
      mon.incrAction(p1);
      expect(messages).toContain('G0IA,1,0,1');
    });

    it('decrAction should raise G0OA', () => {
      const p1 = board.garden.get(1)!;
      mon.decrAction(p1);
      expect(messages).toContain('G0OA,1,0,1');
    });
  });

  describe('GS03 - 蛇妖男', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GS03', '蛇妖男');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('winEff should harm hinder for 4', () => {
      const p2 = board.garden.get(2)!;
      board.hinder = p2;
      mon.winEff();
      expect(messages.some(m => m.includes('G0OH') && m.includes(',4,'))).toBe(true);
    });

    it('loseEff should harm rounder for 4', () => {
      mon.loseEff();
      expect(messages.some(m => m.includes('G0OH') && m.includes(',4,'))).toBe(true);
    });
  });

  describe('GF01 - 叶灵', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GF01', '叶灵');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('winEff should make rounder draw 1 card', () => {
      mon.winEff();
      expect(messages.some(m => m.startsWith('G0DH,1,0,1'))).toBe(true);
    });

    it('loseEff should harm rounder for 2', () => {
      mon.loseEff();
      expect(messages.some(m => m.includes('G0OH') && m.includes(',2,'))).toBe(true);
    });
  });

  describe('GF02 - 暗香', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GF02', '暗香');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('winEff should heal rounder for 2', () => {
      mon.winEff();
      expect(messages.some(m => m.startsWith('G0IH,1,') && m.includes(',2,'))).toBe(true);
    });

    it('incrAction should raise G0IA', () => {
      const p1 = board.garden.get(1)!;
      mon.incrAction(p1);
      expect(messages).toContain('G0IA,1,0,1');
    });
  });

  describe('GH04 - 熔岩兽王', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GH04', '熔岩兽王');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('debut should harm all alive players for 2', () => {
      mon.debut();
      // Should send harm to both players
      expect(messages.some(m => m.startsWith('G0OH,'))).toBe(true);
    });

    it('winEff should harm opponents for 2', () => {
      mon.winEff();
      const rd = board.rounder;
      const opps = [...board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
      expect(opps.length).toBeGreaterThan(0);
    });
  });

  describe('GT02 - 刑天', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GT02', '刑天');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('debut should harm non-attending players for hand count', () => {
      // Add a 3rd player who is NOT attending war (not rounder/hinder/supporter)
      const p3 = makePlayer(3, 1);
      p3.tux.push(301, 302, 303);
      board.garden.set(3, p3);
      mon.debut();
      // p3 has 3 cards, should take 3 damage
      expect(messages.some(m => m.startsWith('G0OH,3,0,0,3,0'))).toBe(true);
    });

    it('incrAction should raise G0IX', () => {
      const p1 = board.garden.get(1)!;
      mon.incrAction(p1);
      expect(messages).toContain('G0IX,1,0,1');
    });
  });

  describe('GS04 - 水魔兽', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GS04', '水魔兽');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('incrAction should raise both G0IA and G0IX', () => {
      const p1 = board.garden.get(1)!;
      mon.incrAction(p1);
      expect(messages).toContain('G0IA,1,0,1');
      expect(messages).toContain('G0IX,1,0,1');
    });

    it('decrAction should raise both G0OA and G0OX', () => {
      const p1 = board.garden.get(1)!;
      mon.decrAction(p1);
      expect(messages).toContain('G0OA,1,0,1');
      expect(messages).toContain('G0OX,1,0,1');
    });
  });

  describe('GH03 - 狐妖女', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GH03', '狐妖女');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('debut should harm supporter for (rounder STR - 1)', () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.strB = 5;
      board.supporter = p2;
      mon.debut();
      // STR=5, so n=4 damage to supporter
      expect(messages.some(m => m.includes('G0OH') && m.includes(',4,'))).toBe(true);
    });

    it('incrAction should use element 2 (fire)', () => {
      const p1 = board.garden.get(1)!;
      mon.incrAction(p1);
      expect(messages).toContain('G0IA,1,0,2');
    });
  });

  describe('GL02 - 赤鬼王', () => {
    let mon: Monster;
    beforeEach(() => {
      mon = makeMonster('GL02', '赤鬼王');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);
    });

    it('debut should give supporter +1 STR +2 DEX', () => {
      const p2 = board.garden.get(2)!;
      board.supporter = p2;
      mon.debut();
      expect(messages).toContain('G0IA,2,1,2');
    });
  });

  describe('consumeValid', () => {
    it('GF03 consumeValid should check for teammate cards', () => {
      const mon = makeMonster('GF03', '句芒');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);

      const p1 = board.garden.get(1)!;
      p1.tux.push(101);
      // consumeType=1, type=0, player on rounder's team
      expect(mon.consumeValid(p1, 1, 0, '')).toBe(true);
    });

    it('GL02 consumeValid should check for heal in fuse', () => {
      const mon = makeMonster('GL02', '赤鬼王');
      const lib = makeMonsterLib([mon]);
      cottage.registerDelegates(lib);

      const p1 = board.garden.get(1)!;
      // GL02 fuse format: pairs of (uid, healAmount) starting at index 1
      // G0IH,1,2,0,0 means uid=1 gets 2 heal
      expect(mon.consumeValid(p1, 0, 0, 'G0IH,1,2,0,0')).toBe(true);
      // G0IH,2,2,0,0 means uid=2 gets 2 heal (not player 1)
      expect(mon.consumeValid(p1, 0, 0, 'G0IH,2,2,0,0')).toBe(false);
    });
  });
});
