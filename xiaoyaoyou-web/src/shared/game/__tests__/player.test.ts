import { describe, it, expect } from 'vitest';
import { Player } from '../player';
import { Hero } from '../card/hero';
import { TuxType } from '@shared/types/enums';

function makePlayer(uid = 1, team = 1): Player {
  const p = new Player('test', 10101, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

describe('Player', () => {
  it('should construct with defaults', () => {
    const p = new Player('Alice', 10101, 1);
    expect(p.name).toBe('Alice');
    expect(p.avatar).toBe(10101);
    expect(p.uid).toBe(1);
    expect(p.isReal).toBe(true);
  });

  it('should calculate oppTeam', () => {
    const p = makePlayer(1, 1);
    expect(p.oppTeam).toBe(2);
    const p2 = makePlayer(2, 2);
    expect(p2.oppTeam).toBe(1);
  });

  it('should calculate str based on priority', () => {
    const p = makePlayer();
    p.strB = 5;
    expect(p.str).toBe(5);
    p.strA = 8;
    p.sdASet = true;
    expect(p.str).toBe(8);
    p.strC = 10;
    p.sdCSet = true;
    expect(p.str).toBe(10);
  });

  it('should manage card operations', () => {
    const p = makePlayer();
    p.tux.push(1, 2, 3);
    expect(p.hasAnyCards()).toBe(true);
    expect(p.hasCard(2)).toBe(true);
    const discards: number[] = [];
    expect(p.removeCard(2, discards)).toBe(true);
    expect(discards).toEqual([2]);
    expect(p.tux).toEqual([1, 3]);
  });

  it('should manage equipment', () => {
    const p = makePlayer();
    p.weapon = 10;
    p.armor = 20;
    expect(p.hasAnyEquips()).toBe(true);
    expect(p.getBaseEquipCount()).toBe(2);
    expect(p.getEquipCount()).toBe(2);
  });

  it('should manage disabled system', () => {
    const p = makePlayer();
    p.setWeaponDisabled('reason1', true);
    expect(p.weaponDisabled).toBe(true);
    expect(p.equipDisabled).toBe(true);
    p.setWeaponDisabled('reason1', false);
    expect(p.weaponDisabled).toBe(false);
  });

  it('should manage ZP disabled', () => {
    const p = makePlayer();
    p.setZPDisabled('reason', true);
    expect(p.zpDisabled).toBe(true);
    p.setZPDisabled('reason', false);
    expect(p.zpDisabled).toBe(false);
  });

  it('should manage silence', () => {
    const p = makePlayer();
    expect(p.isSilenced).toBe(false);
    p.setSilence('tag1');
    expect(p.isSilenced).toBe(true);
    p.resetSilence('tag1');
    expect(p.isSilenced).toBe(false);
  });

  it('should reset status', () => {
    const p = makePlayer();
    p.immobilized = true;
    p.loved = true;
    p.setWeaponDisabled('r', true);
    p.resetStatus();
    expect(p.immobilized).toBe(false);
    expect(p.loved).toBe(false);
    expect(p.weaponDisabled).toBe(false);
  });

  it('should manage price system', () => {
    const p = makePlayer();
    p.addToPrice('JP01', false, 'reason1', '+', 5);
    p.addToPrice('JP01', false, 'reason2', '+', 3);
    expect(p.getPrice('JP01', false)).toBe(8);
    p.removeFromPrice('JP01', false, 'reason1');
    expect(p.getPrice('JP01', false)).toBe(3);
  });

  it('should get slot capacity', () => {
    const p = makePlayer();
    expect(p.getSlotCapacity(TuxType.WQ)).toBe(1);
    p.exMask = 1; // weapon extra slot
    expect(p.getSlotCapacity(TuxType.WQ)).toBe(2);
  });

  it('should init from hero', () => {
    const p = makePlayer();
    const hero = new Hero('test', 10101, 1, 1, 'F', 7, 3, 4, [], [], 0, 0, ['JN01']);
    p.initFromHero(hero, true, false, false);
    expect(p.gender).toBe('F');
    expect(p.hp).toBe(7);
    expect(p.isAlive).toBe(true);
    expect(p.strB).toBe(3);
  });

  it('should list out all cards', () => {
    const p = makePlayer();
    p.tux.push(1, 2);
    p.weapon = 10;
    const all = p.listOutAllCards();
    expect(all).toEqual([1, 2, 10]);
  });

  it('should create warriors', () => {
    const w = Player.warriors('warrior', 7, 1, 5, 3);
    expect(w.name).toBe('warrior');
    expect(w.isReal).toBe(false);
    expect(w.strB).toBe(5);
    expect(w.team).toBe(1);
  });

  it('should manage tokens', () => {
    const p = makePlayer();
    p.tokenAwake = true;
    p.tokenCount = 3;
    p.tokenTars.push(1, 2);
    p.resetTokens();
    expect(p.tokenAwake).toBe(false);
    expect(p.tokenCount).toBe(0);
    expect(p.tokenTars).toEqual([]);
  });

  it('should manage ROM/RFM/RAM', () => {
    const p = makePlayer();
    p.ram.set('key1', 10);
    p.rfm.set('key2', 20);
    p.rom.set('key3', 30);
    p.resetRam();
    expect(p.ram.getInt('key1')).toBe(0);
    expect(p.rfm.getInt('key2')).toBe(20);
    p.resetRfm();
    expect(p.rfm.getInt('key2')).toBe(0);
    expect(p.rom.getInt('key3')).toBe(30);
  });

  it('should validate player', () => {
    const p = makePlayer(1);
    expect(p.isValidPlayer()).toBe(true);
    const ghost = new Player('ghost', 0, 0);
    expect(ghost.isValidPlayer()).toBe(false);
  });

  it('should manage coss stack', () => {
    const p = makePlayer();
    p.cossPush(10);
    p.cossPush(20);
    expect(p.cossPeek()).toBe(20);
    expect(p.cossPop()).toBe(20);
    expect(p.cossPop()).toBe(10);
  });
});
