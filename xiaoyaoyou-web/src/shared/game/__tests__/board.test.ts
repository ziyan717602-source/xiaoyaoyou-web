import { describe, it, expect } from 'vitest';
import { Board } from '../board';
import { Player } from '../player';
import { Monster } from '../card/monster';
import { LibGroup } from '../lib-group';
import { FiveElement, MonsterLevel } from '@shared/types/enums';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

describe('Board', () => {
  it('should construct with defaults', () => {
    const b = new Board();
    expect(b.clockWised).toBe(true);
    expect(b.poolEnabled).toBe(false);
    expect(b.rounder.uid).toBe(0); // ghost
  });

  it('should manage garden', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    expect(b.garden.size).toBe(2);
  });

  it('should find opponent', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.rounder = p1;
    const opp = b.getOpponent(p1);
    expect(opp.uid).toBe(2);
  });

  it('should check attend war', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.rounder = p1;
    expect(b.isAttendWar(p1)).toBe(true);
    expect(b.isAttendWar(p2)).toBe(false);
  });

  it('should order players', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    const p3 = makePlayer(3, 1);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.garden.set(3, p3);
    b.rounder = p1;
    const order = b.orderedPlayer();
    expect(order).toEqual([1, 2, 3]);
  });

  it('should get next/prev player', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    const p3 = makePlayer(3, 1);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.garden.set(3, p3);
    b.rounder = p1;
    expect(b.getNextPlayer(1)).toBe(2);
    expect(b.getPrevPlayer(1)).toBe(3);
  });

  it('should calculate pools', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    p1.strB = 5;
    const p2 = makePlayer(2, 2);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.rounder = p1;
    b.battler = new Monster('mon', 'GS01', 1, 1, FiveElement.AQUA, 3, 3, MonsterLevel.WEAK, null, null, null, null, null, null, '');
    b.rPool = 2;
    expect(b.calculateRPool()).toBe(7);
  });

  it('should clean battler', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.rounder = p1;
    b.supporter = p2;
    b.hinder = p1;
    b.cleanBattler();
    expect(b.supporter.uid).toBe(0);
    expect(b.hinder.uid).toBe(0);
  });

  it('should serialize with toSerialMessage', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    b.garden.set(1, p1);
    b.rounder = p1;
    // Need a minimal LibGroup - just use default empty one
    const tuple = new LibGroup();
    const msg = b.toSerialMessage(tuple);
    expect(msg).toContain('H09G,');
  });

  it('should handle reOrderedPlayers', () => {
    const b = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    const p3 = makePlayer(3, 1);
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.garden.set(3, p3);
    b.rounder = p1;
    const result = b.reOrderedPlayers([3, 1]);
    expect(result).toEqual([1, 3]);
  });
});
