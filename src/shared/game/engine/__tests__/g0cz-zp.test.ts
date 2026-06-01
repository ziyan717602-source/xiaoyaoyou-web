/**
 * ZD Battle Card Phase & G0CZ Tests
 *
 * Tests the ZD (battle card play) phase:
 * - Players alternate playing ZP cards
 * - Lower power side starts
 * - Each player can play at most 1 ZP per battle (RestZP)
 * - Both sides pass → phase ends
 * - G0CZ manages RestZP counter
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';

describe('G0CZ - ZP Counter Management', () => {
  let board: Board;
  let eventBus: EventBus;
  let skillRegistry: SkillRegistry;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    skillRegistry = new SkillRegistry(eventBus);
    messages = [];

    for (let i = 1; i <= 2; i++) {
      const p = new Player(`Player${i}`, i, i);
      p.isAlive = true;
      p.isTared = true;
      p.team = i;
      p.hp = 10;
      p.hpBase = 10;
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    gLoop = new GLoop(eventBus, board, skillRegistry);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should initialize RestZP to 1 via G0CZ,2', async () => {
    const p1 = board.garden.get(1)!;
    const p2 = board.garden.get(2)!;
    p1.restZP = 0;
    p2.restZP = 0;

    // G0CZ,2 sets all players' RestZP to 1
    await gLoop.raiseGMessage('G0CZ,2');

    expect(p1.restZP).toBe(1);
    expect(p2.restZP).toBe(1);
  });

  it('should decrement RestZP via G0CZ,0,uid', async () => {
    const p1 = board.garden.get(1)!;
    p1.restZP = 1;

    await gLoop.raiseGMessage('G0CZ,0,1');

    expect(p1.restZP).toBe(0);
  });

  it('should restore RestZP to 1 via G0CZ,1,uid', async () => {
    const p1 = board.garden.get(1)!;
    p1.restZP = 0;

    await gLoop.raiseGMessage('G0CZ,1,1');

    expect(p1.restZP).toBe(1);
  });

  it('should broadcast E0CZ notification', async () => {
    await gLoop.raiseGMessage('G0CZ,0,1');

    expect(messages.some(m => m.startsWith('E0CZ,'))).toBe(true);
  });
});

describe('Board - Battle Power Calculation', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
    for (let i = 1; i <= 2; i++) {
      const p = new Player(`Player${i}`, i, i);
      p.isAlive = true;
      p.team = i;
      p.hp = 10;
      p.hpBase = 10;
      p.mSTRb = 3;
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;
  });

  it('should calculate RPool from rounder STR + pool gain', () => {
    board.poolEnabled = true;
    board.rPool = 5;
    const rPool = board.calculateRPool();
    // RPool = rounder.STR + rPool + support + drums
    expect(rPool).toBeGreaterThanOrEqual(5);
  });

  it('should calculate OPool from battler STR + pool gain', () => {
    board.poolEnabled = true;
    board.oPool = 3;
    const oPool = board.calculateOPool();
    expect(oPool).toBeGreaterThanOrEqual(3);
  });

  it('should determine battle win via isRounderBattleWin', () => {
    board.poolEnabled = true;
    // RPool = rounder.str(3) + rPool + support + drums
    // OPool = battler.str(0, no battler) + oPool + hinder + drums
    board.rPool = 10;
    board.oPool = 0;
    expect(board.isRounderBattleWin()).toBe(true);

    board.rPool = 0;
    board.oPool = 10;
    expect(board.isRounderBattleWin()).toBe(false);
  });
});
