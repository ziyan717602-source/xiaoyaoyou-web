/**
 * MonsterLib - Translation of C# PSD.Base.Card.MonsterLib
 */
import { FiveElement, MonsterLevel } from '@shared/types/enums';
import { Monster } from '../card/monster';
import { Card } from '../card/card';
import type { Monster as MonsterData } from '@shared/types/monster';

export class MonsterLib {
  readonly firsts: Monster[] = [];
  private dicts = new Map<number, Monster>();

  constructor(data: MonsterData[]) {
    for (const item of data) {
      // Determine element from code prefix
      let element: FiveElement;
      const prefix = item.Code.substring(0, 2);
      switch (prefix) {
        case 'GS': element = FiveElement.AQUA; break;
        case 'GH': element = FiveElement.AGNI; break;
        case 'GL': element = FiveElement.THUNDER; break;
        case 'GF': element = FiveElement.AERO; break;
        case 'GT': element = FiveElement.SATURN; break;
        case 'GI': element = FiveElement.YINN; break;
        case 'GY': element = FiveElement.SOLARIS; break;
        default: element = FiveElement.A; break;
      }

      // Parse EA arrays from data (null in JSON means null arrays)
      const monster = new Monster(
        item.Name,
        item.Code,
        item.Group,
        item.Genre,
        element,
        item.STRb,
        item.AGLb,
        item.Level as MonsterLevel,
        item.EAOccurs as string[][] | null,
        item.EAProperties as number[][] | null,
        item.EALocks as boolean[][] | null,
        item.EAOnces as boolean[][] | null,
        item.EAIsTermini as boolean[][] | null,
        item.EAHinds as boolean[][] | null,
        '',
      );
      monster.debutText = item.DebutText ?? '';
      monster.petText = item.PetText ?? '';
      monster.winText = item.WinText ?? '';
      monster.loseText = item.LoseText ?? '';
      monster.dbSerial = item.DBSerial;
      this.firsts.push(monster);
      this.dicts.set(item.DBSerial, monster);
    }
  }

  get size(): number { return this.dicts.size; }

  decode(code: number): Monster | null {
    return this.dicts.get(code) ?? null;
  }

  encode(code: string): number {
    for (const [key, monster] of this.dicts) {
      if (monster.code === code) return key;
    }
    return 0;
  }

  listAllSeleable(groups: number): number[] {
    const pkgs = Card.level2Pkg(groups);
    if (pkgs == null) {
      return this.firsts.filter(p => !p.isEx).map(p => p.dbSerial);
    }
    return this.firsts.filter(p => pkgs.includes(p.group) && !p.isEx).map(p => p.dbSerial);
  }

  listAllMonster(groups: number): Monster[] {
    const pkgs = Card.level2Pkg(groups);
    if (pkgs == null) return [...this.firsts];
    return this.firsts.filter(p => pkgs.includes(p.group));
  }
}
