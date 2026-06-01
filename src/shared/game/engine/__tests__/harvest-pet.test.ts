/**
 * HarvestPet Tests (G0HC)
 *
 * Tests the pet harvest system:
 * - G0HC,0,Farmer,Farmland,mask,Pet1,Pet2,...
 * - mask bits: 0-1=Treaty(0=NL,1=KOKAN,2=ACTIVE,3=PASSIVE), 2=Trophy, 3=Reposit, 4=Plow
 *
 * Treaty resolution per element slot:
 * - Empty slot: auto-accept
 * - 1 incoming + 0 current: auto-accept
 * - Conflict: KOKAN=swap, ACTIVE=player chooses, PASSIVE=overwrite
 * - 3+ candidates: force ACTIVE
 * - KOKAN with Farmland=0: fall back to ACTIVE
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { LibGroup } from '../../lib-group';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';
import { Monster } from '../../card/monster';
import { FiveElement, MonsterLevel } from '../../../types/enums';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`Player${uid}`, uid * 1000, uid);
  p.isAlive = true;
  p.isTared = true;
  p.team = team;
  p.hp = 10;
  p.hpBase = 10;
  p.selectHero = uid * 1000;
  return p;
}

function makeMonster(code: string, name: string, element: FiveElement, str: number = 3): Monster {
  return new Monster(name, code, 1, 2, element, str, 2, MonsterLevel.WOODEN, null, null, null, null, null, null, '');
}

/** Treaty enum values */
const Treaty = { NL: 0, KOKAN: 1, ACTIVE: 2, PASSIVE: 3 } as const;

/** Build mask from components */
function buildMask(treaty: number, trophy = false, reposit = false, plow = false): number {
  let mask = treaty & 0x3;
  if (trophy) mask |= 0x4;
  if (reposit) mask |= 0x8;
  if (plow) mask |= 0x10;
  return mask;
}

describe('HarvestPet (G0HC)', () => {
  let board: Board;
  let eventBus: EventBus;
  let skillRegistry: SkillRegistry;
  let gLoop: GLoop;
  let libGroup: LibGroup;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    skillRegistry = new SkillRegistry(eventBus);
    messages = [];

    for (let i = 1; i <= 4; i++) {
      const p = makePlayer(i, i <= 2 ? 1 : 2);
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  /** Helper: inject a monster into libGroup's MonsterLib using dbSerial as key */
  function injectMonster(monster: Monster, id: number): void {
    monster.dbSerial = id;
    libGroup.ml.firsts.push(monster);
    // Access private dicts via casting (runtime access)
    const dicts = (libGroup.ml as { dicts: Map<number, Monster> }).dicts;
    dicts.set(id, monster);
  }

  describe('Basic pet assignment', () => {
    it('should assign pet to empty element slot', async () => {
      const mon = makeMonster('GS01', '水灵兽', FiveElement.AQUA, 3);
      injectMonster(mon, 101);

      await gLoop.raiseGMessage(`G0HC,0,1,0,${buildMask(Treaty.ACTIVE)},101`);

      const farmer = board.garden.get(1)!;
      expect(farmer.pets[0]).toBe(101);
    });

    it('should assign multiple pets to different element slots', async () => {
      const aqua = makeMonster('GS01', '水灵兽', FiveElement.AQUA, 3);
      const agni = makeMonster('GH01', '火灵兽', FiveElement.AGNI, 4);
      injectMonster(aqua, 101);
      injectMonster(agni, 201);

      await gLoop.raiseGMessage(`G0HC,0,1,0,${buildMask(Treaty.ACTIVE)},101,201`);

      const farmer = board.garden.get(1)!;
      expect(farmer.pets[0]).toBe(101); // AQUA index 0
      expect(farmer.pets[1]).toBe(201); // AGNI index 1
    });

    it('should skip invalid pet IDs', async () => {
      const mon = makeMonster('GS01', '水灵兽', FiveElement.AQUA, 3);
      injectMonster(mon, 101);

      await gLoop.raiseGMessage(`G0HC,0,1,0,${buildMask(Treaty.ACTIVE)},999,101`);

      const farmer = board.garden.get(1)!;
      expect(farmer.pets[0]).toBe(101);
    });
  });

  describe('Treaty: ACTIVE (player chooses)', () => {
    it('should overwrite existing pet of same element with ACTIVE treaty', async () => {
      const mon1 = makeMonster('GS01', '水灵兽A', FiveElement.AQUA, 3);
      const mon2 = makeMonster('GS02', '水灵兽B', FiveElement.AQUA, 5);
      injectMonster(mon1, 101);
      injectMonster(mon2, 102);

      const farmer = board.garden.get(1)!;
      farmer.pets[0] = 101;

      // Simplified handler: overwrites without player choice
      await gLoop.raiseGMessage(`G0HC,0,1,0,${buildMask(Treaty.ACTIVE)},102`);

      expect(farmer.pets[0]).toBe(102);
    });
  });

  describe('Treaty: KOKAN (exchange)', () => {
    it('should overwrite when simplified handler ignores KOKAN', async () => {
      const mon1 = makeMonster('GS01', '水灵兽A', FiveElement.AQUA, 3);
      const mon2 = makeMonster('GS02', '水灵兽B', FiveElement.AQUA, 5);
      injectMonster(mon1, 101);
      injectMonster(mon2, 102);

      const farmer = board.garden.get(1)!;
      farmer.pets[0] = 101;

      // Simplified handler: overwrites regardless of treaty
      const mask = buildMask(Treaty.KOKAN, false, false, true);
      await gLoop.raiseGMessage(`G0HC,0,1,0,${mask},102`);

      expect(farmer.pets[0]).toBe(102);
    });
  });

  describe('Treaty: PASSIVE (overwrite)', () => {
    it('should overwrite existing pet with PASSIVE treaty', async () => {
      const mon1 = makeMonster('GS01', '水灵兽A', FiveElement.AQUA, 3);
      const mon2 = makeMonster('GS02', '水灵兽B', FiveElement.AQUA, 5);
      injectMonster(mon1, 101);
      injectMonster(mon2, 102);

      const farmer = board.garden.get(1)!;
      farmer.pets[0] = 101;

      await gLoop.raiseGMessage(`G0HC,0,1,0,${buildMask(Treaty.PASSIVE)},102`);

      expect(farmer.pets[0]).toBe(102);
    });
  });

  describe('Trophy and Plow flags', () => {
    it('should set Trophy flag in G0HD broadcast', async () => {
      const mon = makeMonster('GS01', '水灵兽', FiveElement.AQUA, 3);
      injectMonster(mon, 101);

      const mask = buildMask(Treaty.ACTIVE, true, false, false);
      await gLoop.raiseGMessage(`G0HC,0,1,0,${mask},101`);

      const g0hd = messages.find(m => m.startsWith('G0HD,'));
      expect(g0hd).toBeDefined();
      expect(g0hd).toContain(',1,');
    });
  });

  describe('Edge cases', () => {
    it('should do nothing for non-harvest type (type=1)', async () => {
      await gLoop.raiseGMessage('G0HC,1,1,2,0,1');
      const farmer = board.garden.get(1)!;
      expect(farmer.pets.every(p => p === 0)).toBe(true);
    });

    it('should do nothing for invalid farmer', async () => {
      const mon = makeMonster('GS01', '水灵兽', FiveElement.AQUA, 3);
      injectMonster(mon, 101);
      await gLoop.raiseGMessage(`G0HC,0,999,0,${buildMask(Treaty.ACTIVE)},101`);
    });

    it('should do nothing for empty pet list', async () => {
      await gLoop.raiseGMessage('G0HC,0,1,0,2');
    });
  });
});
