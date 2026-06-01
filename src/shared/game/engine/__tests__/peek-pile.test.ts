/**
 * Peek Pile Tests (G0XZ)
 *
 * G0XZ: Peek at pile contents
 *   Format: G0XZ,me,dicesType,control,count[,pick]
 *   dicesType: 0=player hand, 1=tuxPiles, 2=monPiles, 3=evePiles
 *   control: 0=peek only, 1=reorder
 *   Broadcast: E0XZ with pile contents
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

describe('G0XZ (Peek Pile)', () => {
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

    // Fill tuxPiles
    for (let i = 1001; i <= 1020; i++) {
      board.tuxPiles.enqueue(i);
    }

    gLoop = new GLoop(eventBus, board, new SkillRegistry(eventBus), new LibGroup());
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  it('should peek at player hand (dicesType=0)', async () => {
    const target = board.garden.get(2)!;
    target.tux.push(201, 202, 203);

    // G0XZ,me,0,who (dicesType=0: peek at player hand)
    await gLoop.raiseGMessage('G0XZ,1,0,2');

    const e0xzMsgs = messages.filter(m => m.startsWith('E0XZ'));
    expect(e0xzMsgs.length).toBeGreaterThan(0);
    // Should contain the target's hand cards
    expect(e0xzMsgs.some(m => m.includes('201'))).toBe(true);
  });

  it('should peek at tuxPiles (dicesType=1)', async () => {
    // G0XZ,me,1,control,count
    await gLoop.raiseGMessage('G0XZ,1,1,0,3');

    const e0xzMsgs = messages.filter(m => m.startsWith('E0XZ'));
    expect(e0xzMsgs.length).toBeGreaterThan(0);
    // Should contain pile cards (1001, 1002, 1003)
    expect(e0xzMsgs.some(m => m.includes('1001'))).toBe(true);
  });

  it('should peek at monPiles (dicesType=2)', async () => {
    // Fill monPiles
    for (let i = 2001; i <= 2010; i++) {
      board.monPiles.enqueue(i);
    }

    await gLoop.raiseGMessage('G0XZ,1,2,0,2');

    const e0xzMsgs = messages.filter(m => m.startsWith('E0XZ'));
    expect(e0xzMsgs.length).toBeGreaterThan(0);
    expect(e0xzMsgs.some(m => m.includes('2001'))).toBe(true);
  });

  it('should peek at evePiles (dicesType=3)', async () => {
    // Fill evePiles
    for (let i = 3001; i <= 3010; i++) {
      board.evePiles.enqueue(i);
    }

    await gLoop.raiseGMessage('G0XZ,1,3,0,2');

    const e0xzMsgs = messages.filter(m => m.startsWith('E0XZ'));
    expect(e0xzMsgs.length).toBeGreaterThan(0);
    expect(e0xzMsgs.some(m => m.includes('3001'))).toBe(true);
  });

  it('should handle peek with count exceeding pile size', async () => {
    // Only 5 cards in tuxPiles, request 10
    board.tuxPiles = new (await import('../../utils/rueue')).Rueue<number>();
    for (let i = 1; i <= 5; i++) {
      board.tuxPiles.enqueue(i);
    }

    await gLoop.raiseGMessage('G0XZ,1,1,0,10');

    const e0xzMsgs = messages.filter(m => m.startsWith('E0XZ'));
    expect(e0xzMsgs.length).toBeGreaterThan(0);
  });

  it('should handle empty pile gracefully', async () => {
    board.tuxPiles = new (await import('../../utils/rueue')).Rueue<number>();

    await gLoop.raiseGMessage('G0XZ,1,1,0,3');

    // Should still broadcast (empty result)
    const e0xzMsgs = messages.filter(m => m.startsWith('E0XZ'));
    expect(e0xzMsgs.length).toBeGreaterThan(0);
  });

  it('should broadcast control=4 when done peeking', async () => {
    await gLoop.raiseGMessage('G0XZ,1,1,0,3');

    // After peek, should broadcast E0XZ,me,4,0 (done)
    const doneMsgs = messages.filter(m => m.includes('E0XZ') && m.includes(',4,'));
    expect(doneMsgs.length).toBeGreaterThan(0);
  });
});
