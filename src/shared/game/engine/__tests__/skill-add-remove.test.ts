/**
 * Skill Add/Remove Tests (G0IS, G0OS)
 *
 * G0IS: Add skill to player
 *   Format: G0IS,who,op,skillCode1[,skillCode2,...]
 *   op: bit0=hind(no broadcast), bit1=rollback(set isZhu)
 *   Broadcast: E0IS,who,skillCode1,...
 *
 * G0OS: Remove skill from player
 *   Format: G0OS,who,hind,skillCode1[,skillCode2,...]
 *   hind: "0"=broadcast, "1"=hide
 *   Broadcast: E0OS,who,skillCode1,...
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

describe('G0IS (Add Skill)', () => {
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

  it('should add skill to player', async () => {
    const player = board.garden.get(1)!;

    // G0IS,who,op,skillCode (op=0: broadcast, rollback)
    await gLoop.raiseGMessage('G0IS,1,0,SK01');

    expect(player.skills.has('SK01')).toBe(true);
  });

  it('should broadcast E0IS when not hidden', async () => {
    await gLoop.raiseGMessage('G0IS,1,0,SK01');

    const e0isMsgs = messages.filter(m => m.startsWith('E0IS'));
    expect(e0isMsgs.length).toBeGreaterThan(0);
    expect(e0isMsgs[0]).toContain('SK01');
  });

  it('should not broadcast when hind bit is set', async () => {
    // op & 1 == 1 means hind (hide broadcast)
    await gLoop.raiseGMessage('G0IS,1,1,SK01');

    const e0isMsgs = messages.filter(m => m.startsWith('E0IS'));
    expect(e0isMsgs).toHaveLength(0);
  });

  it('should set isZhu when rollback bit is clear (op & 2 == 0)', async () => {
    const player = board.garden.get(1)!;
    player.isZhu = false;

    await gLoop.raiseGMessage('G0IS,1,0,SK01');

    expect(player.isZhu).toBe(true);
  });

  it('should add multiple skills at once', async () => {
    const player = board.garden.get(1)!;

    await gLoop.raiseGMessage('G0IS,1,0,SK01,SK02,SK03');

    expect(player.skills.has('SK01')).toBe(true);
    expect(player.skills.has('SK02')).toBe(true);
    expect(player.skills.has('SK03')).toBe(true);
  });

  it('should handle duplicate skill gracefully', async () => {
    const player = board.garden.get(1)!;
    player.skills.add('SK01');

    await gLoop.raiseGMessage('G0IS,1,0,SK01');

    // Should still have the skill (no duplicate)
    expect(player.skills.has('SK01')).toBe(true);
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0IS,999,0,SK01');
    // No crash
  });
});

describe('G0OS (Remove Skill)', () => {
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

  it('should remove skill from player', async () => {
    const player = board.garden.get(1)!;
    player.skills.add('SK01');

    // G0OS,who,hind,skillCode (hind="0" means broadcast)
    await gLoop.raiseGMessage('G0OS,1,0,SK01');

    expect(player.skills.has('SK01')).toBe(false);
  });

  it('should broadcast E0OS when not hidden', async () => {
    const player = board.garden.get(1)!;
    player.skills.add('SK01');

    await gLoop.raiseGMessage('G0OS,1,0,SK01');

    const e0osMsgs = messages.filter(m => m.startsWith('E0OS'));
    expect(e0osMsgs.length).toBeGreaterThan(0);
    expect(e0osMsgs[0]).toContain('SK01');
  });

  it('should not broadcast when hind is "1"', async () => {
    const player = board.garden.get(1)!;
    player.skills.add('SK01');

    await gLoop.raiseGMessage('G0OS,1,1,SK01');

    const e0osMsgs = messages.filter(m => m.startsWith('E0OS'));
    expect(e0osMsgs).toHaveLength(0);
  });

  it('should remove multiple skills at once', async () => {
    const player = board.garden.get(1)!;
    player.skills.add('SK01');
    player.skills.add('SK02');
    player.skills.add('SK03');

    await gLoop.raiseGMessage('G0OS,1,0,SK01,SK03');

    expect(player.skills.has('SK01')).toBe(false);
    expect(player.skills.has('SK02')).toBe(true);
    expect(player.skills.has('SK03')).toBe(false);
  });

  it('should handle removing non-existent skill gracefully', async () => {
    const player = board.garden.get(1)!;

    await gLoop.raiseGMessage('G0OS,1,0,SK99');

    // No crash, no broadcast
    const e0osMsgs = messages.filter(m => m.startsWith('E0OS'));
    expect(e0osMsgs).toHaveLength(0);
  });

  it('should handle invalid player gracefully', async () => {
    await gLoop.raiseGMessage('G0OS,999,0,SK01');
    // No crash
  });
});
