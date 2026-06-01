/**
 * Cos Stack + Rune Tests (G0IV, G0OV, G0OF)
 *
 * G0IV: Push hero onto cos stack
 *   Format: G0IV,uid,heroId
 *   Broadcast: E0IV,uid,heroId
 *
 * G0OV: Pop hero from cos stack
 *   Format: G0OV,uid
 *   Broadcast: E0OV,uid,heroId,nextTop
 *
 * G0OF: Remove rune cards from player
 *   Format: G0OF,who,runeId1,runeId2,...
 *   Broadcast: E0OF,who,runeId1,runeId2,...
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

describe('G0IV (Push Cos Stack)', () => {
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

  it('should push hero onto cos stack', async () => {
    const player = board.garden.get(1)!;
    player.selectHero = 5001;

    await gLoop.raiseGMessage('G0IV,1,5001');

    expect(player.coss).toEqual([5001]);
  });

  it('should broadcast E0IV,uid,heroId', async () => {
    const player = board.garden.get(1)!;
    player.selectHero = 5001;

    await gLoop.raiseGMessage('G0IV,1,5001');

    expect(messages).toContain('E0IV,1,5001');
  });

  it('should support multiple pushes', async () => {
    const player = board.garden.get(1)!;

    await gLoop.raiseGMessage('G0IV,1,5001');
    await gLoop.raiseGMessage('G0IV,1,5002');

    expect(player.coss).toEqual([5001, 5002]);
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0IV,999,5001');
    // No crash
  });
});

describe('G0OV (Pop Cos Stack)', () => {
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

  it('should pop hero from cos stack', async () => {
    const player = board.garden.get(1)!;
    player.cossPush(5001);
    player.cossPush(5002);

    await gLoop.raiseGMessage('G0OV,1');

    expect(player.coss).toEqual([5001]);
  });

  it('should broadcast E0OV,uid,heroId,nextTop', async () => {
    const player = board.garden.get(1)!;
    player.cossPush(5001);
    player.cossPush(5002);

    await gLoop.raiseGMessage('G0OV,1');

    expect(messages).toContain('E0OV,1,5002,5001');
  });

  it('should broadcast 0 as nextTop when stack is empty after pop', async () => {
    const player = board.garden.get(1)!;
    player.cossPush(5001);

    await gLoop.raiseGMessage('G0OV,1');

    expect(messages).toContain('E0OV,1,5001,0');
  });

  it('should handle empty cos stack gracefully', async () => {
    await gLoop.raiseGMessage('G0OV,1');
    // No crash - C# uses Pop() which throws on empty, but TS handles gracefully
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0OV,999');
    // No crash
  });
});

describe('G0OF (Remove Runes)', () => {
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

  it('should remove rune cards from player', async () => {
    const player = board.garden.get(1)!;
    player.runes.push(101, 102, 103);

    await gLoop.raiseGMessage('G0OF,1,101,103');

    expect(player.runes).toEqual([102]);
  });

  it('should broadcast E0OF,who,removedRunes', async () => {
    const player = board.garden.get(1)!;
    player.runes.push(101, 102, 103);

    await gLoop.raiseGMessage('G0OF,1,101,103');

    expect(messages).toContain('E0OF,1,101,103');
  });

  it('should only remove runes that exist', async () => {
    const player = board.garden.get(1)!;
    player.runes.push(101, 102);

    await gLoop.raiseGMessage('G0OF,1,101,999');

    expect(player.runes).toEqual([102]);
    expect(messages).toContain('E0OF,1,101');
  });

  it('should handle removing all runes', async () => {
    const player = board.garden.get(1)!;
    player.runes.push(101, 102);

    await gLoop.raiseGMessage('G0OF,1,101,102');

    expect(player.runes).toEqual([]);
  });

  it('should handle no matching runes (no broadcast)', async () => {
    const player = board.garden.get(1)!;
    player.runes.push(101);

    await gLoop.raiseGMessage('G0OF,1,999');

    expect(player.runes).toEqual([101]);
    // No E0OF broadcast when nothing was removed
    const e0ofMsgs = messages.filter(m => m.startsWith('E0OF'));
    expect(e0ofMsgs).toHaveLength(0);
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0OF,999,101');
    // No crash
  });
});
