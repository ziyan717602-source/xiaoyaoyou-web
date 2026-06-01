/**
 * Remaining G-Message Handlers Tests
 *
 * Tests the 8 G-message handlers identified as untested in the audit:
 * G0HZ (handleTangled), G0DS (handleFreeze), G0IY (handleHeroChange),
 * G1DI (handleDisposal), G09P (handlePondRefresh), G1GE (handleWinLoseEffect),
 * G0QR (handleQuarterReset), G1WJ (handleExhaustion)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';
import { LibGroup } from '../../lib-group';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`Player${uid}`, uid * 1000, uid);
  p.isAlive = true;
  p.isTared = true;
  p.team = team;
  p.hp = 10;
  p.hpBase = 10;
  p.mSTRb = 3;
  p.mDEXb = 2;
  p.selectHero = uid * 1000;
  return p;
}

describe('G0HZ - handleTangled', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    messages = [];

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should set monster2 and fightTangled when monster arrives', async () => {
    board.monster1 = 1001;

    await gLoop.raiseGMessage('G0HZ,1,2001');

    expect(board.monster2).toBe(2001);
    expect(board.fightTangled).toBe(true);
  });

  it('should clear fightTangled when monsterId is 0', async () => {
    board.fightTangled = true;
    board.monster2 = 2001;

    await gLoop.raiseGMessage('G0HZ,1,0');

    expect(board.fightTangled).toBe(false);
  });

  it('should add battler STR to opponent pool', async () => {
    board.monster1 = 1001;
    board.rounder = board.garden.get(1)!;

    // Set up a battler with known STR
    const libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));

    // Manually set battler stats
    board.battler = { str: 5, agl: 3 } as any;

    await gLoop.raiseGMessage('G0HZ,1,2001');

    // Player 1 is rounder (team 1), player 2 is opponent (team 2)
    // target (uid=1) oppTeam should be team 2, which is NOT rounder.team (1)
    // So oPool should increase
    expect(board.oPool).toBe(5);
  });

  it('should handle missing target gracefully', async () => {
    await gLoop.raiseGMessage('G0HZ,999,2001');
    // Should not throw
    expect(board.monster2).toBe(0);
  });
});

describe('G0DS - handleFreeze', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
  });

  it('should immobilize the target player', async () => {
    const p1 = board.garden.get(1)!;
    expect(p1.immobilized).toBe(false);

    await gLoop.raiseGMessage('G0DS,1');

    expect(p1.immobilized).toBe(true);
  });

  it('should handle missing target gracefully', async () => {
    await gLoop.raiseGMessage('G0DS,999');
    // Should not throw
  });

  it('should not affect other players', async () => {
    const p2 = board.garden.get(2)!;

    await gLoop.raiseGMessage('G0DS,1');

    expect(p2.immobilized).toBe(false);
  });
});

describe('G0IY - handleHeroChange', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let libGroup: LibGroup;

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    libGroup = new LibGroup();

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
  });

  it('should change hero with full reset (changeType=0)', async () => {
    const p1 = board.garden.get(1)!;
    const originalHero = p1.selectHero;

    // Use a valid hero ID from the library
    const availableHeroes = libGroup.hl.listAllSeleable(0);
    if (availableHeroes.length > 0) {
      const newHeroId = availableHeroes[0].avatar;
      await gLoop.raiseGMessage(`G0IY,0,1,${newHeroId}`);

      expect(p1.selectHero).toBe(newHeroId);
    }
  });

  it('should change hero with partial refresh (changeType=1)', async () => {
    const p1 = board.garden.get(1)!;
    const availableHeroes = libGroup.hl.listAllSeleable(0);
    if (availableHeroes.length > 0) {
      const newHeroId = availableHeroes[0].avatar;
      await gLoop.raiseGMessage(`G0IY,1,1,${newHeroId}`);

      expect(p1.selectHero).toBe(newHeroId);
    }
  });

  it('should apply HP override with changeType=2', async () => {
    const p1 = board.garden.get(1)!;
    const availableHeroes = libGroup.hl.listAllSeleable(0);
    if (availableHeroes.length > 0) {
      const newHeroId = availableHeroes[0].avatar;
      const hero = libGroup.hl.instanceHero(newHeroId);
      if (hero) {
        const targetHp = Math.min(5, hero.hp);
        await gLoop.raiseGMessage(`G0IY,2,1,${newHeroId},${targetHp}`);

        expect(p1.hp).toBe(targetHp);
      }
    }
  });

  it('should cap HP override at hpBase', async () => {
    const p1 = board.garden.get(1)!;
    const availableHeroes = libGroup.hl.listAllSeleable(0);
    if (availableHeroes.length > 0) {
      const newHeroId = availableHeroes[0].avatar;
      // Request HP higher than hpBase
      await gLoop.raiseGMessage(`G0IY,2,1,${newHeroId},999`);

      expect(p1.hp).toBeLessThanOrEqual(p1.hpBase);
    }
  });

  it('should awake ABC values when pool is enabled', async () => {
    board.poolEnabled = true;
    const p1 = board.garden.get(1)!;
    p1.strB = 5;
    p1.dexB = 4;

    const availableHeroes = libGroup.hl.listAllSeleable(0);
    if (availableHeroes.length > 0) {
      const newHeroId = availableHeroes[0].avatar;
      await gLoop.raiseGMessage(`G0IY,0,1,${newHeroId}`);

      expect(p1.strA).toBe(p1.strB);
      expect(p1.dexA).toBe(p1.dexB);
    }
  });

  it('should handle missing player gracefully', async () => {
    await gLoop.raiseGMessage('G0IY,0,999,1001');
    // Should not throw
  });

  it('should handle invalid hero ID gracefully', async () => {
    await gLoop.raiseGMessage('G0IY,0,1,99999');
    // Should not throw
  });
});

describe('G1DI - handleDisposal', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
  });

  it('should dispose cards to tux discard pile (zone=0)', async () => {
    await gLoop.raiseGMessage('G1DI,0,101,102,103');

    expect(board.tuxDises).toContain(101);
    expect(board.tuxDises).toContain(102);
    expect(board.tuxDises).toContain(103);
  });

  it('should dispose cards to mon discard pile (zone=1)', async () => {
    await gLoop.raiseGMessage('G1DI,1,201,202');

    expect(board.monDises).toContain(201);
    expect(board.monDises).toContain(202);
  });

  it('should dispose cards to eve discard pile (zone=2)', async () => {
    await gLoop.raiseGMessage('G1DI,2,301,302,303');

    expect(board.eveDises).toContain(301);
    expect(board.eveDises).toContain(302);
    expect(board.eveDises).toContain(303);
  });

  it('should skip zero or negative card IDs', async () => {
    await gLoop.raiseGMessage('G1DI,0,0,-1,101');

    expect(board.tuxDises).toContain(101);
    expect(board.tuxDises).not.toContain(0);
    expect(board.tuxDises).not.toContain(-1);
  });

  it('should handle empty card list', async () => {
    const before = board.tuxDises.length;
    await gLoop.raiseGMessage('G1DI,0');
    expect(board.tuxDises.length).toBe(before);
  });
});

describe('G09P - handlePondRefresh', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    messages = [];

    for (let i = 1; i <= 4; i++) {
      const p = makePlayer(i, i <= 2 ? 1 : 2);
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should broadcast pool values', async () => {
    board.rPool = 10;
    board.oPool = 8;

    await gLoop.raiseGMessage('G09P,1');

    const e09pMsgs = messages.filter(m => m.startsWith('E09P'));
    expect(e09pMsgs.length).toBeGreaterThan(0);
    // Pool values are recalculated by calculateRPool/calculateOPool
    // Just verify the message format is correct
    expect(e09pMsgs[0]).toMatch(/^E09P,1,\d+,\d+,\d+,\d+$/);
  });

  it('should recalculate hit checks when checkHit=0', async () => {
    // Set up battler with known AGL
    board.battler = { str: 3, agl: 2 } as any;

    // Set up supporter with dex >= agl (should hit)
    const supporter = board.garden.get(2)!;
    board.supporter = supporter;
    supporter.dexI = 0;
    supporter.dexB = 5; // > agl=2, should hit

    // Set up hinder with dex < agl (should miss)
    const hinder = board.garden.get(3)!;
    board.hinder = hinder;
    hinder.dexI = 0;
    hinder.dexB = 1; // < agl=2, should miss

    await gLoop.raiseGMessage('G09P,0');

    expect(board.supportSucc).toBe(true);
    expect(board.hinderSucc).toBe(false);
  });

  it('should skip hit recalc when checkHit=1', async () => {
    board.battler = { str: 3, agl: 2 } as any;
    const supporter = board.garden.get(2)!;
    board.supporter = supporter;
    supporter.dexI = 0;
    supporter.dexB = 5;

    // Pre-set to false
    board.supportSucc = false;

    await gLoop.raiseGMessage('G09P,1');

    // Should not be recalculated
    expect(board.supportSucc).toBe(false);
  });

  it('should use dexI > 0 as automatic hit', async () => {
    board.battler = { str: 3, agl: 10 } as any;
    const supporter = board.garden.get(2)!;
    board.supporter = supporter;
    supporter.dexI = 1; // dexI > 0 = auto hit
    supporter.dexB = 1; // dex < agl, but dexI overrides

    await gLoop.raiseGMessage('G09P,0');

    expect(board.supportSucc).toBe(true);
  });
});

describe('G1GE - handleWinLoseEffect', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let libGroup: LibGroup;

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    libGroup = new LibGroup();

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
  });

  it('should call winEff for W monsters', async () => {
    // Get a real monster from the library
    const monsters = libGroup.ml.listAllMonster(0);
    if (monsters.length > 0) {
      const mon = monsters[0];
      const winEffSpy = vi.spyOn(mon, 'winEff');

      await gLoop.raiseGMessage(`G1GE,W,${mon.avatar}`);

      expect(winEffSpy).toHaveBeenCalled();
    }
  });

  it('should call loseEff for L monsters', async () => {
    const monsters = libGroup.ml.listAllMonster(0);
    if (monsters.length > 0) {
      const mon = monsters[0];
      const loseEffSpy = vi.spyOn(mon, 'loseEff');

      await gLoop.raiseGMessage(`G1GE,L,${mon.avatar}`);

      expect(loseEffSpy).toHaveBeenCalled();
    }
  });

  it('should handle multiple monsters', async () => {
    const monsters = libGroup.ml.listAllMonster(0);
    if (monsters.length >= 2) {
      const mon1 = monsters[0];
      const mon2 = monsters[1];
      const winEffSpy1 = vi.spyOn(mon1, 'winEff');
      const loseEffSpy2 = vi.spyOn(mon2, 'loseEff');

      await gLoop.raiseGMessage(`G1GE,W,${mon1.avatar},L,${mon2.avatar}`);

      expect(winEffSpy1).toHaveBeenCalled();
      expect(loseEffSpy2).toHaveBeenCalled();
    }
  });

  it('should skip invalid monster IDs', async () => {
    // Should not throw
    await gLoop.raiseGMessage('G1GE,W,99999');
  });
});

describe('G0QR - handleQuarterReset', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    messages = [];

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should raise G0DH when hand exceeds limit', async () => {
    const p1 = board.garden.get(1)!;
    // Fill hand beyond limit
    for (let i = 0; i < p1.tuxLimit + 3; i++) {
      p1.tux.push(1000 + i);
    }

    await gLoop.raiseGMessage('G0QR,1');

    const g0dhMsgs = messages.filter(m => m.startsWith('G0DH'));
    expect(g0dhMsgs.length).toBeGreaterThan(0);
    expect(g0dhMsgs[0]).toContain('3'); // excess count
  });

  it('should not raise G0DH when hand is at limit', async () => {
    const p1 = board.garden.get(1)!;
    // Fill hand exactly to limit
    for (let i = 0; i < p1.tuxLimit; i++) {
      p1.tux.push(1000 + i);
    }

    await gLoop.raiseGMessage('G0QR,1');

    const g0dhMsgs = messages.filter(m => m.startsWith('G0DH'));
    expect(g0dhMsgs.length).toBe(0);
  });

  it('should not raise G0DH when hand is below limit', async () => {
    const p1 = board.garden.get(1)!;
    p1.tux.push(1001);

    await gLoop.raiseGMessage('G0QR,1');

    const g0dhMsgs = messages.filter(m => m.startsWith('G0DH'));
    expect(g0dhMsgs.length).toBe(0);
  });

  it('should handle missing player gracefully', async () => {
    await gLoop.raiseGMessage('G0QR,999');
    // Should not throw
  });
});

describe('G1WJ - handleExhaustion', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let libGroup: LibGroup;

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    libGroup = new LibGroup();

    for (let i = 1; i <= 2; i++) {
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
  });

  it('should calculate pet scores for both teams', async () => {
    // Give player 1 (team 1) some pets
    const p1 = board.garden.get(1)!;
    const monsters = libGroup.ml.listAllMonster(0);
    if (monsters.length >= 2) {
      p1.pets[0] = monsters[0].avatar;
      p1.pets[1] = monsters[1].avatar;

      await gLoop.raiseGMessage('G1WJ');

      expect(board.finalAkaScore).toBeGreaterThan(0);
    }
  });

  it('should set exhausted flag', async () => {
    await gLoop.raiseGMessage('G1WJ');

    expect(board.exhausted).toBe(true);
  });

  it('should emit game:exhaustion event', async () => {
    const handler = vi.fn();
    eventBus.on('game:exhaustion', handler);

    await gLoop.raiseGMessage('G1WJ');

    expect(handler).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      akaScore: expect.any(Number),
      aoScore: expect.any(Number),
    }));
  });

  it('should not count dead players pets', async () => {
    const p1 = board.garden.get(1)!;
    p1.isAlive = false;
    const monsters = libGroup.ml.listAllMonster(0);
    if (monsters.length >= 1) {
      p1.pets[0] = monsters[0].avatar;

      await gLoop.raiseGMessage('G1WJ');

      expect(board.finalAkaScore).toBe(0);
    }
  });

  it('should not count empty pet slots', async () => {
    const p1 = board.garden.get(1)!;
    p1.pets = [0, 0, 0, 0, 0, 0, 0];

    await gLoop.raiseGMessage('G1WJ');

    expect(board.finalAkaScore).toBe(0);
  });
});
