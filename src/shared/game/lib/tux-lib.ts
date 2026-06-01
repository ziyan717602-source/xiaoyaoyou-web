/**
 * TuxLib - Translation of C# PSD.Base.Card.TuxLib
 * Loads tux data from JSON
 */
import { TuxType } from '@shared/types/enums';
import { Tux } from '../card/tux';
import { TuxEquip } from '../card/tux-equip';
import { Luggage } from '../card/luggage';
import { Illusion } from '../card/illusion';
import { Card } from '../card/card';
import type { Tux as TuxData } from '@shared/types/tux';

export class TuxLib {
  readonly firsts: Tux[] = [];
  private dicts = new Map<number, Tux>();

  static readonly DEF_PRIORITY = 110;

  constructor(data: TuxData[]) {
    for (const item of data) {
      const tuxType = item.Type as TuxType;

      let tux: Tux;
      if (tuxType === TuxType.XB && item.Special?.['成长']?.includes('L')) {
        tux = new Luggage(item.Name, item.Code, item.Genre, tuxType, item.Description, item.Special ?? {}, item.Special?.['成长'] ?? '');
      } else if (tuxType === TuxType.XB && item.Special?.['成长']?.includes('I')) {
        tux = new Illusion(item.Name, item.Code, item.Genre, tuxType, item.Description, item.Special ?? {}, item.Special?.['成长'] ?? '');
      } else if (tuxType === TuxType.WQ || tuxType === TuxType.FJ || tuxType === TuxType.XB) {
        tux = new TuxEquip(item.Name, item.Code, item.Genre, tuxType, item.Description, item.Special ?? {}, item.Special?.['成长'] ?? '');
      } else {
        tux = new Tux(item.Name, item.Code, item.Genre, tuxType, item.Description, item.Special ?? {});
      }

      // Build count string from Package and Range
      let countStr = '';
      if (item.Package && item.Range) {
        for (let i = 0; i < item.Package.length; i++) {
          if (countStr) countStr += ',';
          countStr += `${item.Package[i]},${item.Range[i * 2]},${item.Range[i * 2 + 1]}`;
        }
      }

      tux.parse(
        countStr,
        item.Occurs?.join(',') ?? '',
        item.Parasitism?.join('&') ?? '',
        item.Priorities?.join(',') ?? '',
        item.Targets?.join(',') ?? '',
        item.IsTermini?.map(t => t ? '1' : '0').join(',') ?? '',
        0,
      );
      tux.package = item.Package ?? [];
      tux.range = item.Range ?? [];
      this.firsts.push(tux);
    }

    // Build dicts from ranges
    for (const tux of this.firsts) {
      for (let i = 0; i < tux.range.length; i += 2) {
        for (let j = tux.range[i]; j <= tux.range[i + 1]; j++) {
          this.dicts.set(j, tux);
        }
      }
      if (tux.isTuxEquip()) {
        (tux as unknown as TuxEquip).singleEntry = tux.range[0] ?? 0;
      }
    }
  }

  get size(): number { return this.dicts.size; }

  decodeTux(code: number): Tux | null {
    return this.dicts.get(code) ?? null;
  }

  encodeTuxCode(code: string): Tux | null {
    for (const tux of this.firsts) {
      if (tux.code === code) return tux;
    }
    return null;
  }

  encodeTuxDbSerial(dbSerial: number): Tux | null {
    const found = this.firsts.find(p => p.dbSerial === dbSerial);
    return found ?? null;
  }

  listAllTuxs(groups: number): Tux[] {
    const pkgs = Card.level2Pkg(groups);
    if (pkgs == null) return [...this.firsts];
    return this.firsts.filter(p => p.package.some(q => pkgs.includes(q)));
  }

  listAllTuxSeleable(groups: number): Tux[] {
    const first = this.listAllTuxs(groups);
    const duplicated = ['TPT2', 'JPT1', 'JPT4', 'XBT2'];
    const keepPace = ['TPR1', 'JPR1', 'JPR2', 'XBR1'];
    for (let i = 0; i < duplicated.length; i++) {
      if (first.some(p => p.code === duplicated[i]) && first.some(p => p.code === keepPace[i])) {
        for (let j = first.length - 1; j >= 0; j--) {
          if (first[j].code === duplicated[i]) first.splice(j, 1);
        }
      }
    }
    return first;
  }

  listAllTuxCodes(groups: number): number[] {
    const pkgs = Card.level2Pkg(groups);
    const txs = this.listAllTuxSeleable(groups);
    const us: number[] = [];
    for (const tux of txs) {
      for (let i = 0; i < tux.package.length; i++) {
        if (pkgs == null || pkgs.includes(tux.package[i])) {
          for (let j = tux.range[i * 2]; j <= tux.range[i * 2 + 1]; j++) {
            us.push(j);
          }
        }
      }
    }
    return us;
  }

  uniqueEquipSerial(code: string): number {
    let count = 0;
    for (const [, tux] of this.dicts) {
      if (tux.code === code) {
        count++;
      }
    }
    return count;
  }

  isTuxInGroup(tux: Tux, level: number): boolean {
    return this.listAllTuxSeleable(level).includes(tux);
  }
}
