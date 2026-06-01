import { describe, it, expect } from 'vitest';
import { LibGroup } from '../lib-group';
import { Player } from '../player';
import { Board } from '../board';
import { Hero } from '../card/hero';
import { Monster } from '../card/monster';
import { Tux } from '../card/tux';
import { TuxType, FiveElement, MonsterLevel } from '@shared/types/enums';

describe('Integration', () => {
  it('should create LibGroup with default empty libs', () => {
    const lg = new LibGroup();
    expect(lg.isInitialized).toBe(false);
    expect(lg.hl.size).toBe(0);
    expect(lg.tl.size).toBe(0);
  });

  it('should init LibGroup with data', () => {
    const lg = new LibGroup();
    lg.init({
      heroData: [
        { Name: 'test', Avatar: 101, Group: 1, Genre: 1, Gender: 'M', HP: 8, STR: 4, DEX: 3,
          Skills: ['JN01'], RelatedSkills: [], Spouses: [], Isomorphic: [],
          Archetype: 0, Antecessor: 0, Pioneer: 0, Ofcode: 'T01' },
      ],
      tuxData: [
        { Name: 'tux1', Code: 'JP01', Type: 'JP', Genre: 1, Package: [1], Range: [1, 2],
          Description: 'test', Special: {}, Priorities: [0], Occurs: ['R#GR'],
          Parasitism: [], Targets: ['*'], IsTermini: [false] },
      ],
      monsterData: [],
      npcData: [],
      eveData: [],
      skillData: [],
      opsData: [],
      njData: [],
      runeData: [],
      exspData: [],
    });
    expect(lg.isInitialized).toBe(true);
    expect(lg.hl.size).toBe(1);
    expect(lg.tl.size).toBeGreaterThanOrEqual(1);
  });

  it('should create player and init from hero', () => {
    const p = new Player('test', 10101, 1);
    const hero = new Hero('test', 10101, 1, 1, 'M', 8, 4, 3, [], [], 0, 0, ['JN01']);
    p.initFromHero(hero, true, false, false);
    expect(p.isAlive).toBe(true);
    expect(p.hp).toBe(8);
    expect(p.strB).toBe(4);
  });

  it('should create board and manage players', () => {
    const b = new Board();
    const p1 = new Player('Alice', 10101, 1);
    p1.team = 1;
    p1.isAlive = true;
    const p2 = new Player('Bob', 10201, 2);
    p2.team = 2;
    p2.isAlive = true;
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.rounder = p1;
    expect(b.rounder.uid).toBe(1);
    expect(b.opponent.uid).toBe(2);
  });

  it('should handle tux card flow', () => {
    const tux = new Tux('test', 'JP01', 1, TuxType.JP, 'description', {});
    tux.parse('1,1,2', 'R#GR', '', '0', '*', '0', 1);
    expect(tux.occurs).toEqual(['R#GR']);
    expect(tux.package).toEqual([1]);
    expect(tux.range).toEqual([1, 2]);
  });

  it('should manage player card lifecycle', () => {
    const p = new Player('test', 10101, 1);
    p.isAlive = true;
    p.tux.push(1, 2, 3);
    p.weapon = 10;
    expect(p.listOutAllCards()).toEqual([1, 2, 3, 10]);
    const discards: number[] = [];
    p.removeCard(2, discards);
    expect(p.tux).toEqual([1, 3]);
    expect(discards).toEqual([2]);
  });

  it('should handle board battle flow', () => {
    const b = new Board();
    const p1 = new Player('Alice', 10101, 1);
    p1.team = 1;
    p1.isAlive = true;
    p1.strB = 5;
    const p2 = new Player('Bob', 10201, 2);
    p2.team = 2;
    p2.isAlive = true;
    b.garden.set(1, p1);
    b.garden.set(2, p2);
    b.rounder = p1;
    b.battler = new Monster('mon', 'GS01', 1, 1, FiveElement.AQUA, 3, 3, MonsterLevel.WEAK, null, null, null, null, null, null, '');
    b.poolEnabled = true;
    expect(b.calculateRPool()).toBe(5);
    expect(b.calculateOPool()).toBe(3); // battler STR=3
  });
});
