import { describe, it, expect } from 'vitest';
import { Tux } from '../card/tux';
import { TuxEquip } from '../card/tux-equip';
import { Luggage } from '../card/luggage';
import { Illusion } from '../card/illusion';
import { Monster } from '../card/monster';
import { Hero } from '../card/hero';
import { Npc } from '../card/npc';
import { Evenement } from '../card/evenement';
import { Rune } from '../card/rune';
import { Exsp } from '../card/exsp';
import { Card, Genre, PileGenre } from '../card/card';
import { FiveElementHelper, HPEvoMask } from '../card/five-element';
import { FiveElement, MonsterLevel, TuxType } from '@shared/types/enums';

describe('Card', () => {
  it('should pick some in random order', () => {
    const result = Card.pickSomeInRandomOrder([1, 2, 3, 4, 5], 3);
    expect(result.length).toBe(3);
  });

  it('should level2Pkg map correctly', () => {
    expect(Card.level2Pkg(2)).toEqual([1]);
    expect(Card.level2Pkg(4)).toEqual([1, 2]);
    expect(Card.level2Pkg(6)).toEqual([1, 2, 4]);
    expect(Card.level2Pkg(8)).toEqual([1, 2, 4, 5, 7]);
    expect(Card.level2Pkg(10)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Card.level2Pkg(0)).toBeNull();
  });

  it('should convert genre to char and back', () => {
    expect(Card.genre2Char(Genre.Tux)).toBe('C');
    expect(Card.genre2Char(Genre.NMB)).toBe('M');
    expect(Card.char2Genre('C')).toBe(Genre.Tux);
    expect(Card.char2Genre('M')).toBe(Genre.NMB);
    expect(Card.char2Genre('X')).toBe(Genre.NIL);
  });
});

describe('FiveElementHelper', () => {
  it('should convert element to int', () => {
    expect(FiveElementHelper.elem2Int(FiveElement.AQUA)).toBe(1);
    expect(FiveElementHelper.elem2Int(FiveElement.A)).toBe(0);
  });

  it('should convert int to element', () => {
    expect(FiveElementHelper.int2Elem(1)).toBe(FiveElement.AQUA);
    expect(FiveElementHelper.int2Elem(0)).toBe(FiveElement.A);
  });

  it('should check standard proped element', () => {
    expect(FiveElementHelper.isStandardPropedElement(FiveElement.AQUA)).toBe(true);
    expect(FiveElementHelper.isStandardPropedElement(FiveElement.YINN)).toBe(false);
  });

  it('should check proped element', () => {
    expect(FiveElementHelper.isPropedElement(FiveElement.YINN)).toBe(true);
    expect(FiveElementHelper.isPropedElement(FiveElement.A)).toBe(false);
  });

  it('should handle HPEvoMask operations', () => {
    let code = 0;
    code = FiveElementHelper.setMask(HPEvoMask.TUX_INAVO, code);
    expect(FiveElementHelper.isSet(HPEvoMask.TUX_INAVO, code)).toBe(true);
    code = FiveElementHelper.resetMask(HPEvoMask.AVO_MASK, code);
    expect(FiveElementHelper.isSet(HPEvoMask.TUX_INAVO, code)).toBe(false);
  });
});

describe('Tux', () => {
  it('should construct and check properties', () => {
    const tux = new Tux('test', 'JP01', 1, TuxType.JP, 'desc', {});
    expect(tux.name).toBe('test');
    expect(tux.code).toBe('JP01');
    expect(tux.isTuxEquip()).toBe(false);
  });

  it('should check isLinked', () => {
    const tux = new Tux('test', 'JP01', 1, TuxType.JP, 'desc', {});
    (tux as { occurs: string[] }).occurs = ['R%GR'];
    expect(tux.isLinked(0)).toBe(true);
  });

  it('should check isSameType', () => {
    const tux1 = new Tux('a', 'JP01', 1, TuxType.JP, 'desc', {});
    const tux2 = new Tux('b', 'JP02', 1, TuxType.JP, 'desc', {});
    expect(tux1.isSameType(tux2)).toBe(true);
  });
});

describe('TuxEquip', () => {
  it('should construct with growup', () => {
    const equip = new TuxEquip('sword', 'WQ01', 1, TuxType.WQ, 'desc', {}, 'A2X1');
    expect(equip.isTuxEquip()).toBe(true);
    expect(equip.incrOfSTR).toBe(2);
    expect(equip.incrOfDEX).toBe(1);
  });
});

describe('Luggage', () => {
  it('should be luggage', () => {
    const lug = new Luggage('bag', 'XB01', 1, TuxType.XB, 'desc', {}, 'A+0L');
    expect(lug.isLuggage()).toBe(true);
    expect(lug.isIllusion()).toBe(false);
    expect(lug.isTuxEquip()).toBe(true);
  });
});

describe('Illusion', () => {
  it('should be illusion', () => {
    const ill = new Illusion('mirror', 'XB02', 1, TuxType.XB, 'desc', {}, 'A+0I');
    expect(ill.isIllusion()).toBe(true);
    expect(ill.isLuggage()).toBe(false);
    expect(ill.ilas).toBeNull();
  });
});

describe('Monster', () => {
  it('should implement NMB', () => {
    const m = new Monster('test', 'GS01', 1, 1, FiveElement.AQUA, 4, 5,
      MonsterLevel.WEAK, null, null, null, null, null, null, '');
    expect(m.isMonster()).toBe(true);
    expect(m.isNpc()).toBe(false);
    expect(m.str).toBe(4);
    expect(m.agl).toBe(5);
  });

  it('should parse SPI', () => {
    const m = new Monster('test', 'GS01', 1, 1, FiveElement.AQUA, 4, 5,
      MonsterLevel.WEAK, null, null, null, null, null, null, 'HWTL+S');
    expect(m.isSilence()).toBe(true);
  });

  it('should check harm involved', () => {
    const m = new Monster('test', 'GS01', 1, 1, FiveElement.AQUA, 4, 5,
      MonsterLevel.WEAK, null, null, null, null, null, null, 'HW');
    expect(m.isHarmInvolved(false, false, false, true, true)).toBe(true);
    expect(m.isHarmInvolved(false, false, false, false, true)).toBe(false);
  });

  it('should reset memory', () => {
    const m = new Monster('test', 'GS01', 1, 1, FiveElement.AQUA, 4, 5,
      MonsterLevel.WEAK, null, null, null, null, null, null, '');
    m.ram.set('key', 1);
    m.resetRam();
    expect(m.ram.getInt('key')).toBe(0);
  });
});

describe('Hero', () => {
  it('should construct with all properties', () => {
    const hero = new Hero('test', 10101, 1, 1, 'M', 8, 4, 3,
      ['10102'], [], 0, 0, ['JN101']);
    expect(hero.name).toBe('test');
    expect(hero.avatar).toBe(10101);
    expect(hero.hp).toBe(8);
  });

  it('should forceChange', () => {
    const hero = new Hero('test', 10101, 1, 1, 'M', 8, 4, 3, [], [], 0, 0, []);
    hero.forceChange('HP', 10);
    expect(hero.hp).toBe(10);
  });
});

describe('Npc', () => {
  it('should implement NMB', () => {
    const npc = new Npc('NC101', 1, 1, 'test', 4, ['NJ01'], 10101, 'M');
    expect(npc.isNpc()).toBe(true);
    expect(npc.isMonster()).toBe(false);
    expect(npc.str).toBe(4);
    expect(npc.agl).toBe(0);
  });
});

describe('Evenement', () => {
  it('should construct', () => {
    const eve = new Evenement('event', 'SJ001', '1,10', 1, 1, 'bg', 'desc', 'H');
    expect(eve.name).toBe('event');
    expect(eve.isHarmInvolved()).toBe(true);
  });
});

describe('Rune', () => {
  it('should construct', () => {
    const rune = new Rune('test', 'SF01', 'R*ZD', 100, false, true, false, false, 'desc');
    expect(rune.name).toBe('test');
    expect(rune.isLock).toBe(false);
  });
});

describe('Exsp', () => {
  it('should construct', () => {
    const exsp = new Exsp('test', 'STU1', 0, 0, [], {});
    expect(exsp.name).toBe('test');
    expect(exsp.type).toBe(0);
  });
});

describe('Genre', () => {
  it('should have correct values', () => {
    expect(Genre.NIL).toBe(0);
    expect(Genre.Tux).toBe(1);
    expect(Genre.NMB).toBe(2);
  });
});
