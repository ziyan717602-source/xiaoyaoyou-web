/**
 * EvenementLib - Translation of C# PSD.Base.Card.EvenementLib
 */
import { Evenement } from '../card/evenement';
import { Card } from '../card/card';
import type { Evenement as EveData } from '@shared/types/evenement';

export class EvenementLib {
  readonly firsts: Evenement[] = [];
  private dicts = new Map<number, Evenement>();

  constructor(data: EveData[]) {
    for (const item of data) {
      const bg = item.Special?.['Background'] ?? '';
      const spis = [
        item.Special?.['IsHarm'] === 'true' ? 'H' : '',
        item.Special?.['IsTux'] === 'true' ? 'T' : '',
        item.Special?.['IsTuxOnly'] === 'true' ? 'T#' : '',
        item.Special?.['IsSilence'] === 'true' ? 'S' : '',
      ].filter(Boolean).join('');

      const eve = new Evenement(
        item.Name,
        item.Code,
        '', // range not in data layer, will be empty
        1,
        item.Genre ?? 1,
        bg,
        item.Descripe ?? '',
        spis,
      );
      this.firsts.push(eve);
    }
    this.refresh();
  }

  get size(): number { return this.dicts.size; }

  decodeEvenement(code: number): Evenement | null {
    // Try dicts first (range-based lookup)
    const fromDicts = this.dicts.get(code);
    if (fromDicts) return fromDicts;
    // Fallback: code is 1-based index into firsts
    if (code >= 1 && code <= this.firsts.length) {
      return this.firsts[code - 1];
    }
    return null;
  }

  getEveFromName(code: string): Evenement | null {
    for (const eve of this.firsts) {
      if (eve.code === code) return eve;
    }
    return null;
  }

  listAllSeleable(groups: number): number[] {
    const pkgs = Card.level2Pkg(groups);
    // If dicts is empty (no range data), fall back to firsts with index-as-key
    if (this.dicts.size === 0) {
      const fallback = this.firsts
        .filter(eve => pkgs == null || pkgs.includes(eve.group))
        .map((eve, idx) => idx + 1);
      return fallback;
    }
    if (pkgs == null) return [...this.dicts.keys()];
    return [...this.dicts.entries()]
      .filter(([_, eve]) => pkgs.includes(eve.group))
      .map(([key]) => key);
  }

  listAllEves(groups: number): Evenement[] {
    const pkgs = Card.level2Pkg(groups);
    if (pkgs == null) return [...this.firsts];
    return this.firsts.filter(p => pkgs.includes(p.group));
  }

  refresh(): void {
    this.dicts.clear();
    for (const eve of this.firsts) {
      if (eve.range.length >= 2) {
        for (let i = eve.range[0]; i <= eve.range[1]; i++) {
          this.dicts.set(i, eve);
        }
      }
    }
  }
}
