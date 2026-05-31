/**
 * ExspLib - Translation of C# PSD.Base.Card.ExspLib
 */
import { Exsp } from '../card/exsp';
import type { Exsp as ExspData } from '@shared/types/exsp';

export class ExspLib {
  readonly firsts: Exsp[] = [];
  private dicts = new Map<string, Exsp>();

  constructor(data: ExspData[]) {
    for (const item of data) {
      const heroStr = typeof item.Hero === 'string' ? item.Hero : String(item.Hero);
      const hero = heroStr ? parseInt(heroStr, 10) || 0 : 0;
      const codes = item.Code.split(',');
      for (const code of codes) {
        const exsp = new Exsp(
          item.Name,
          code,
          item.Type,
          hero,
          item.Skills ?? [],
          item.Description ?? {},
        );
        this.firsts.push(exsp);
        this.dicts.set(exsp.code, exsp);
      }
    }
  }

  get size(): number { return this.dicts.size; }

  encode(code: string): Exsp | null {
    return this.dicts.get(code) ?? null;
  }

  get allFirsts(): Exsp[] {
    return [...this.dicts.values()];
  }
}
