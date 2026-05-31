/**
 * Pet Effect Tests (G0IE, G0OE)
 *
 * G0IE: Enable pet effects
 *   Format: G0IE,uid
 *   Sets player.petDisabled = false
 *
 * G0OE: Disable pet effects
 *   Format: G0OE,uid
 *   Sets player.petDisabled = true
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
  p.selectHero = uid * 1000;
  return p;
}

describe('G0OE (Disable Pet Effects)', () => {
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

  it('should set petDisabled to true', async () => {
    const player = board.garden.get(1)!;
    player.petDisabled = false;

    await gLoop.raiseGMessage('G0OE,1');

    expect(player.petDisabled).toBe(true);
  });

  it('should broadcast message', async () => {
    await gLoop.raiseGMessage('G0OE,1');

    const e0oeMsgs = messages.filter(m => m.startsWith('G0OE'));
    expect(e0oeMsgs.length).toBeGreaterThan(0);
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0OE,999');
    // No crash
  });
});

describe('G0IE (Enable Pet Effects)', () => {
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

  it('should set petDisabled to false', async () => {
    const player = board.garden.get(1)!;
    player.petDisabled = true;

    await gLoop.raiseGMessage('G0IE,1');

    expect(player.petDisabled).toBe(false);
  });

  it('should broadcast message', async () => {
    await gLoop.raiseGMessage('G0IE,1');

    const e0ieMsgs = messages.filter(m => m.startsWith('G0IE'));
    expect(e0ieMsgs.length).toBeGreaterThan(0);
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0IE,999');
    // No crash
  });

  it('should toggle petDisabled correctly', async () => {
    const player = board.garden.get(1)!;

    // Disable
    await gLoop.raiseGMessage('G0OE,1');
    expect(player.petDisabled).toBe(true);

    // Enable
    await gLoop.raiseGMessage('G0IE,1');
    expect(player.petDisabled).toBe(false);

    // Disable again
    await gLoop.raiseGMessage('G0OE,1');
    expect(player.petDisabled).toBe(true);
  });
});
