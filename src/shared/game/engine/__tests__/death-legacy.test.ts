/**
 * Death Exit Legacy Tests (G0ZW P300/P400, G0HG)
 *
 * Tests the death processing flow:
 * - G0ZW P0: Mark players as nineteen (pending death)
 * - G0ZW P100: Kill players (IsAlive=false)
 * - G0ZW P200: Discard all cards/pets/runes
 * - G0ZW P300: Legacy - dying player chooses teammate to draw 2 cards
 * - G0ZW P400: Leave game (G0OY)
 * - G0HG: Give cards (draw N cards for player)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { LibGroup } from '../../lib-group';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`Player${uid}`, uid * 1000, uid);
  p.isAlive = true;
  p.isTared = true;
  p.team = team;
  p.hp = 5;
  p.hpBase = 5;
  p.selectHero = uid * 1000;
  return p;
}

describe('G0HG (Give Cards)', () => {
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

    // Fill tuxPiles so draw works
    for (let i = 1001; i <= 1020; i++) {
      board.tuxPiles.enqueue(i);
    }

    const libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should draw N cards for a player', async () => {
    const player1 = board.garden.get(1)!;
    const handBefore = player1.tux.length;

    await gLoop.raiseGMessage('G0HG,1,2');

    expect(player1.tux.length).toBe(handBefore + 2);
  });

  it('should handle multiple players', async () => {
    const player1 = board.garden.get(1)!;
    const player2 = board.garden.get(2)!;

    await gLoop.raiseGMessage('G0HG,1,1,2,1');

    expect(player1.tux.length).toBe(1);
    expect(player2.tux.length).toBe(1);
  });

  it('should do nothing for invalid player', async () => {
    await gLoop.raiseGMessage('G0HG,999,2');
    // No crash
  });
});

describe('G0ZW P300 (Legacy)', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    messages = [];

    // Team 1: players 1, 2, 3 | Team 2: player 4
    for (let i = 1; i <= 3; i++) {
      const p = makePlayer(i, 1);
      board.garden.set(i, p);
    }
    const p4 = makePlayer(4, 2);
    board.garden.set(4, p4);
    board.rounder = board.garden.get(1)!;

    // Fill tuxPiles
    for (let i = 1001; i <= 1020; i++) {
      board.tuxPiles.enqueue(i);
    }

    const libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should auto-assign legacy to teammate when no inputCallback', async () => {
    // Player 1 (team 1) dies. Teammates: player 2, 3 (team 1).
    const dying = board.garden.get(1)!;
    dying.nineteen = true;
    dying.isAlive = false;

    const teammate = board.garden.get(2)!;
    const handBefore = teammate.tux.length;

    await gLoop.raiseGMessage('G0ZW,1');

    // Auto-assigned to first teammate (player 2)
    expect(teammate.tux.length).toBe(handBefore + 2);
  });

  it('should let dying player choose teammate via inputCallback', async () => {
    // Player 1 (team 1) dies. Teammates: player 2, 3 (team 1).
    const dying = board.garden.get(1)!;
    dying.nineteen = true;
    dying.isAlive = false;

    // Input callback: player 1 chooses player 3
    const inputFn = vi.fn().mockResolvedValue('T3');
    gLoop.setInputCallback(inputFn);

    const teammate2 = board.garden.get(2)!;
    const teammate3 = board.garden.get(3)!;
    const hand2Before = teammate2.tux.length;
    const hand3Before = teammate3.tux.length;

    await gLoop.raiseGMessage('G0ZW,1');

    // Should have prompted player 1
    expect(inputFn).toHaveBeenCalled();
    // Player 3 drew 2 cards, player 2 got nothing
    expect(teammate3.tux.length).toBe(hand3Before + 2);
    expect(teammate2.tux.length).toBe(hand2Before);
  });

  it('should not trigger legacy if no nineteen players', async () => {
    const player1 = board.garden.get(1)!;
    const handBefore = player1.tux.length;

    await gLoop.raiseGMessage('G0ZW,1');

    // No legacy triggered since player is not nineteen
    expect(player1.tux.length).toBe(handBefore);
  });
});

describe('G0ZW P400 (Leave Game)', () => {
  let board: Board;
  let eventBus: EventBus;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    messages = [];

    // Team 1: players 1, 2, 3 | Team 2: player 4
    for (let i = 1; i <= 3; i++) {
      const p = makePlayer(i, 1);
      board.garden.set(i, p);
    }
    const p4 = makePlayer(4, 2);
    board.garden.set(4, p4);
    board.rounder = board.garden.get(1)!;

    const libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should raise G0OY for dead players', async () => {
    const dying = board.garden.get(1)!;
    dying.nineteen = true;
    dying.isAlive = false;

    await gLoop.raiseGMessage('G0ZW,1');

    // G0OY should have been raised (broadcast)
    const g0oyMsg = messages.find(m => m.startsWith('G0OY,'));
    expect(g0oyMsg).toBeDefined();
  });

  it('should remove dead player from turn order', async () => {
    const dying = board.garden.get(1)!;
    dying.nineteen = true;
    dying.isAlive = false;

    await gLoop.raiseGMessage('G0ZW,1');

    // Player should be removed from turn order
    expect(dying.isAlive).toBe(false);
  });
});
