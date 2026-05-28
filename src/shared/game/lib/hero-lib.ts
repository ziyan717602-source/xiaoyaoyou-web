/**
 * HeroLib - Translation of C# PSD.Base.Card.HeroLib
 * Loads hero data from JSON
 */
import { Hero } from '../card/hero';
import { Card } from '../card/card';
import type { Hero as HeroData } from '@shared/types/hero';

export class HeroLib {
  private dicts = new Map<number, Hero>();

  constructor(data: HeroData[]) {
    for (const item of data) {
      const hero = new Hero(
        item.Name,
        item.Avatar,
        item.Group,
        item.Genre,
        item.Gender,
        item.HP,
        item.STR,
        item.DEX,
        item.Spouses,
        item.Isomorphic,
        item.Archetype,
        item.Antecessor,
        item.Skills,
      );
      hero.ofcode = item.Ofcode ?? '';
      hero.tokenAlias = item.TokenAlias ?? '';
      hero.peopleAlias = item.PeopleAlias ?? '';
      hero.playerTarAlias = item.PlayerTarAlias ?? '';
      hero.exCardsAlias = item.ExCardsAlias ?? '';
      hero.awakeAlias = item.AwakeAlias ?? '';
      hero.folderAlias = item.FolderAlias ?? '';
      hero.guestAlias = item.GuestAlias ?? '';
      hero.relatedSkills = item.RelatedSkills ?? [];
      this.dicts.set(hero.avatar, hero);
    }

    // Set pioneers
    for (const hero of this.dicts.values()) {
      if (hero.antecessor !== 0 && this.dicts.has(hero.antecessor)) {
        this.dicts.get(hero.antecessor)!.pioneer = hero.avatar;
      }
    }
  }

  get size(): number { return this.dicts.size; }

  instanceHero(code: number): Hero | null {
    return this.dicts.get(code) ?? null;
  }

  listAllJoinableHeroes(groups: number): Hero[] {
    return this.listAllHeros(groups).filter(p =>
      p.ofcode !== 'XJ103' && p.ofcode !== 'XJ207' && p.ofcode !== 'XJ304' &&
      p.ofcode !== 'XJ507' && p.ofcode !== 'TR031' && p.ofcode !== 'TR033' &&
      p.ofcode !== 'HL005' && p.ofcode !== 'HL015'
    );
  }

  listAllSeleable(groups: number): Hero[] {
    const first = this.listAllJoinableHeroes(groups);
    const pair = [
      'XJ505', 'TR011', 'TR012', 'R5Q05', 'XJ302', 'RM302', 'XJ202', 'RM202',
      'X3W01', 'R3W01', 'TR004', 'RM509', 'XJ405', 'RM405',
    ];
    for (let i = 0; i < pair.length; i += 2) {
      if (first.some(p => p.ofcode === pair[i + 1])) {
        const code = pair[i];
        for (let j = first.length - 1; j >= 0; j--) {
          if (first[j].ofcode === code) first.splice(j, 1);
        }
      }
    }
    return first;
  }

  listAllHeros(groups: number): Hero[] {
    const pkgs = Card.level2Pkg(groups);
    if (pkgs != null) {
      return [...this.dicts.values()].filter(p => p.group !== 0 && pkgs.includes(p.group));
    }
    return [...this.dicts.values()].filter(p => p.group !== 0);
  }

  listHeroesInTest(level: number): Hero[] {
    const lv = Card.level2Pkg(level) ?? [];
    const now = new Date().getDay();
    return [...this.dicts.values()].filter(p =>
      p.group !== 0 && lv.includes(p.availableTestPkg) && p.availableDay.includes(now)
    );
  }

  forceChange(hero: Hero, newAvatar: number, newCode: string): void {
    if (hero) {
      this.dicts.delete(hero.avatar);
      this.dicts.set(newAvatar, hero);
      hero.forceChange('Avatar', newAvatar);
      hero.forceChange('OfCode', newCode);
    }
  }
}
