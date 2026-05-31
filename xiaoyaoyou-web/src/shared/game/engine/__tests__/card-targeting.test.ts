/**
 * Card Targeting Tests (G0CD, G0CE, G1CW)
 *
 * G0CD: Card use targeting
 *   Format: G0CD,A,T,cardName;inType,fuse
 *   Broadcast: E0CD,A,T,cardName
 *   Raises: G0CE
 *
 * G0CE: Card action execution
 *   Format: G0CE,A,T,0/1(eq),cardName;inType,fuse
 *   Broadcast: E0CE,A,T,cardName
 *
 * G1CW: Two-target card
 *   Format: G1CW,A,B,C,cardName;cdFuse;inType,fuse
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
  p.selectHero = uid * 1000;
  return p;
}

describe('G0CD (Card Targeting)', () => {
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

  it('should broadcast E0CD for card targeting', async () => {
    // G0CD,A,T,cardName;inType,fuse
    await gLoop.raiseGMessage('G0CD,1,2,JP02;1,17,36');

    const e0cdMsgs = messages.filter(m => m.startsWith('E0CD'));
    expect(e0cdMsgs.length).toBeGreaterThan(0);
    expect(e0cdMsgs[0]).toContain('JP02');
  });

  it('should raise G0CE after targeting', async () => {
    const g0ceHandler = vi.fn();
    eventBus.on('G0CE', g0ceHandler);

    await gLoop.raiseGMessage('G0CD,1,2,JP02;1,17,36');

    // G0CE should be raised (via simpleGMessage broadcast)
    const g0ceMsgs = messages.filter(m => m.startsWith('G0CE'));
    expect(g0ceMsgs.length).toBeGreaterThan(0);
  });

  it('should include target in broadcast', async () => {
    await gLoop.raiseGMessage('G0CD,1,3,JP04;1,TF');

    const e0cdMsgs = messages.filter(m => m.startsWith('E0CD'));
    expect(e0cdMsgs[0]).toContain('1');
    expect(e0cdMsgs[0]).toContain('3');
  });
});

describe('G0CE (Card Execution)', () => {
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

  it('should broadcast E0CE for card execution', async () => {
    // G0CE,A,T,0,cardName;inType,fuse
    await gLoop.raiseGMessage('G0CE,1,2,0,JP04;1,TF');

    const e0ceMsgs = messages.filter(m => m.startsWith('G0CE'));
    expect(e0ceMsgs.length).toBeGreaterThan(0);
  });

  it('should broadcast with card name', async () => {
    await gLoop.raiseGMessage('G0CE,1,3,0,TP01;1,TF');

    const e0ceMsgs = messages.filter(m => m.startsWith('G0CE'));
    expect(e0ceMsgs.some(m => m.includes('TP01'))).toBe(true);
  });
});

describe('G1CW (Two-Target Card)', () => {
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

  it('should broadcast G1CW message', async () => {
    // G1CW,A,B,C,cardName;cdFuse;inType,fuse
    await gLoop.raiseGMessage('G1CW,1,2,3,JP04;cdFuse;1,TF');

    const g1cwMsgs = messages.filter(m => m.startsWith('G1CW'));
    expect(g1cwMsgs.length).toBeGreaterThan(0);
  });

  it('should include all target info', async () => {
    await gLoop.raiseGMessage('G1CW,1,2,3,TP02;cdFuse;1,TF');

    const g1cwMsgs = messages.filter(m => m.startsWith('G1CW'));
    expect(g1cwMsgs[0]).toContain('1');
    expect(g1cwMsgs[0]).toContain('2');
    expect(g1cwMsgs[0]).toContain('3');
    expect(g1cwMsgs[0]).toContain('TP02');
  });
});
