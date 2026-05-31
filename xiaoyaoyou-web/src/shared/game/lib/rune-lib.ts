/**
 * RuneLib - Translation of C# PSD.Base.RuneLib
 */
import { Rune } from '../card/rune';
import type { Rune as RuneData } from '@shared/types/rune';

export class RuneLib {
  readonly firsts: Rune[] = [];

  constructor(data: RuneData[]) {
    for (const item of data) {
      let occur = (item.Occurs ?? [])[0] ?? '';
      let isLock: boolean | null = false;
      if (occur.startsWith('!') || occur.startsWith('?')) {
        if (occur.startsWith('!')) isLock = true;
        else isLock = null;
        occur = occur.substring(1);
      }
      const prior = (item.Priorities ?? [0])[0] ?? 0;
      const once = (item.IsOnce ?? [false])[0] ?? false;
      const termin = (item.IsTermini ?? [false])[0] ?? false;
      const consume = item.Special?.['IsConsume'] === 'true';
      const desc = item.Descripe ?? '';

      this.firsts.push(new Rune(
        item.Name, item.Code, occur, prior, isLock, once, termin, consume, desc,
      ));
    }
  }

  get size(): number { return this.firsts.length; }

  encode(code: string): Rune | null {
    return this.firsts.find(p => p.code === code) ?? null;
  }

  decode(ut: number): Rune | null {
    if (ut === 0 || ut > this.firsts.length) return null;
    return this.firsts[ut - 1];
  }

  getSingleIndex(rune: Rune): number {
    return this.firsts.indexOf(rune) + 1;
  }

  getFullAppendableList(): number[] { return [1, 2, 3, 4, 5, 6]; }
  getFullPositive(): number[] { return [1, 2, 3, 4]; }
  getFullNegative(): number[] { return [5, 6]; }
  getFullAdvanced(): number[] { return [7, 8]; }
}
