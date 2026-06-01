/**
 * Card Transfer Tests (G0HQ)
 *
 * G0HQ - Card transfer with 5 modes:
 * Type 0: Player-to-player card transfer
 *   Format: G0HQ,0,me,from,utype,n,card1,...[,from2,utype2,n2,...]
 *   utype 0=public, 1=hidden, 2=random take
 *
 * Type 1: Take all cards from player(s)
 *   Format: G0HQ,1,me,from1[,from2,...]
 *
 * Type 2: Get cards from piles / direct add
 *   Format: G0HQ,2,me,utype,... (utype 0=peek, 1=draw N, 2=direct add)
 *
 * Type 3: Direct add cards to player
 *   Format: G0HQ,3,me,n1,card1,...,n2,card2,...
 *
 * Type 4: Exchange cards between two players
 *   Format: G0HQ,4,me,u1,u2,n1,card1...n2,card2...
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

describe('G0HQ Type 0 (Player-to-Player Transfer)', () => {
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

  it('should transfer specific cards from one player to another (public)', async () => {
    const from = board.garden.get(2)!;
    const to = board.garden.get(1)!;
    from.tux.push(101, 102, 103);

    // G0HQ,0,me(from perspective),from,utype,n,cards...
    // In C#: type=0, me=receiver, then from,utype,n,cards
    await gLoop.raiseGMessage('G0HQ,0,1,2,0,2,101,102');

    expect(from.tux).toEqual([103]);
    expect(to.tux).toContain(101);
    expect(to.tux).toContain(102);
  });

  it('should broadcast E0HQ for public transfer', async () => {
    const from = board.garden.get(2)!;
    from.tux.push(101, 102);

    await gLoop.raiseGMessage('G0HQ,0,1,2,0,2,101,102');

    const e0hqMsgs = messages.filter(m => m.startsWith('E0HQ'));
    expect(e0hqMsgs.length).toBeGreaterThan(0);
  });

  it('should handle transfer from self', async () => {
    const player = board.garden.get(1)!;
    player.tux.push(101, 102, 103);

    // Transfer from self to self - should be a no-op effectively
    await gLoop.raiseGMessage('G0HQ,0,1,1,0,2,101,102');

    // Cards should still be in hand (removal + re-add)
    expect(player.tux).toContain(101);
    expect(player.tux).toContain(102);
  });
});

describe('G0HQ Type 1 (Take All Cards)', () => {
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

  it('should take all hand cards from target player', async () => {
    const from = board.garden.get(2)!;
    const to = board.garden.get(1)!;
    from.tux.push(101, 102, 103);

    await gLoop.raiseGMessage('G0HQ,1,1,2');

    expect(from.tux).toEqual([]);
    expect(to.tux).toEqual(expect.arrayContaining([101, 102, 103]));
  });

  it('should take all equips from target player', async () => {
    const from = board.garden.get(2)!;
    const to = board.garden.get(1)!;
    from.weapon = 201;
    from.armor = 202;

    await gLoop.raiseGMessage('G0HQ,1,1,2');

    expect(from.weapon).toBe(0);
    expect(from.armor).toBe(0);
    expect(to.tux).toContain(201);
    expect(to.tux).toContain(202);
  });

  it('should handle multiple source players', async () => {
    const from1 = board.garden.get(2)!;
    const from2 = board.garden.get(3)!;
    const to = board.garden.get(1)!;
    from1.tux.push(101, 102);
    from2.tux.push(103, 104);

    await gLoop.raiseGMessage('G0HQ,1,1,2,3');

    expect(from1.tux).toEqual([]);
    expect(from2.tux).toEqual([]);
    expect(to.tux.length).toBe(4);
  });

  it('should handle source with no cards', async () => {
    const to = board.garden.get(1)!;
    const handBefore = to.tux.length;

    await gLoop.raiseGMessage('G0HQ,1,1,2');

    expect(to.tux.length).toBe(handBefore);
  });
});

describe('G0HQ Type 2 (Get from Piles)', () => {
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

    // Fill tuxPiles
    for (let i = 1001; i <= 1020; i++) {
      board.tuxPiles.enqueue(i);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should draw N random cards from tuxPiles (utype=1)', async () => {
    const player = board.garden.get(1)!;
    const pileBefore = board.tuxPiles.count;

    await gLoop.raiseGMessage('G0HQ,2,1,1,3');

    expect(player.tux.length).toBe(3);
    expect(board.tuxPiles.count).toBe(pileBefore - 3);
  });

  it('should add specific cards directly (utype=2)', async () => {
    const player = board.garden.get(1)!;

    await gLoop.raiseGMessage('G0HQ,2,1,2,501,502');

    expect(player.tux).toContain(501);
    expect(player.tux).toContain(502);
  });

  it('should draw from empty pile gracefully', async () => {
    board.tuxPiles = new (await import('../../utils/rueue')).Rueue<number>();
    const player = board.garden.get(1)!;

    await gLoop.raiseGMessage('G0HQ,2,1,1,3');

    expect(player.tux.length).toBe(0);
  });
});

describe('G0HQ Type 3 (Direct Add)', () => {
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

  it('should add multiple card groups to player', async () => {
    const player = board.garden.get(1)!;

    // G0HQ,3,me,n1,card1,...,n2,card2,...
    await gLoop.raiseGMessage('G0HQ,3,1,2,501,502,1,503');

    expect(player.tux).toContain(501);
    expect(player.tux).toContain(502);
    expect(player.tux).toContain(503);
  });

  it('should broadcast E0HQ type 4 for direct add', async () => {
    await gLoop.raiseGMessage('G0HQ,3,1,2,501,502');

    const e0hqMsgs = messages.filter(m => m.startsWith('E0HQ,4'));
    expect(e0hqMsgs.length).toBeGreaterThan(0);
  });
});

describe('G0HQ Type 4 (Exchange)', () => {
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

  it('should exchange cards between two players', async () => {
    const p1 = board.garden.get(1)!;
    const p2 = board.garden.get(2)!;
    p1.tux.push(101, 102);
    p2.tux.push(201, 202);

    // G0HQ,4,u1,u2,n1,cards1,n2,cards2
    await gLoop.raiseGMessage('G0HQ,4,1,2,2,101,102,2,201,202');

    // P1 gives 101,102 and receives 201,202
    expect(p1.tux).toContain(201);
    expect(p1.tux).toContain(202);
    expect(p1.tux).not.toContain(101);
    expect(p1.tux).not.toContain(102);

    // P2 gives 201,202 and receives 101,102
    expect(p2.tux).toContain(101);
    expect(p2.tux).toContain(102);
    expect(p2.tux).not.toContain(201);
    expect(p2.tux).not.toContain(202);
  });

  it('should handle one-sided exchange (n2=0)', async () => {
    const p1 = board.garden.get(1)!;
    const p2 = board.garden.get(2)!;
    p1.tux.push(101, 102);

    // G0HQ,4,u1,u2,n1,cards1,n2,cards2
    // P1 gives 101,102 to P2, P2 gives nothing
    await gLoop.raiseGMessage('G0HQ,4,1,2,2,101,102,0');

    expect(p1.tux).toEqual([]);
    expect(p2.tux).toContain(101);
    expect(p2.tux).toContain(102);
  });
});
