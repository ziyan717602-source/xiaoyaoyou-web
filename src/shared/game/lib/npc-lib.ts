/**
 * NpcLib - Translation of C# PSD.Base.Card.NPCLib
 */
import { Npc } from '../card/npc';
import { Card } from '../card/card';
import type { NPC as NpcData } from '@shared/types/npc';

export class NpcLib {
  private dicts = new Map<number, Npc>();

  constructor(data: NpcData[]) {
    for (const item of data) {
      const npc = new Npc(
        item.Code,
        item.Group,
        item.Genre,
        item.Name,
        item.STRb,
        item.Skills,
        item.Hero,
        item.Gender,
      );
      npc.debutText = item.DebutText ?? '';
      this.dicts.set(this.dicts.size + 1, npc);
    }
    // Re-index from 1 based on order in data
    this.dicts.clear();
    let idx = 1;
    for (const item of data) {
      const npc = new Npc(
        item.Code,
        item.Group,
        item.Genre,
        item.Name,
        item.STRb,
        item.Skills,
        item.Hero,
        item.Gender,
      );
      npc.debutText = item.DebutText ?? '';
      this.dicts.set(idx, npc);
      idx++;
    }
  }

  get size(): number { return this.dicts.size; }

  get first(): Npc[] { return [...this.dicts.values()]; }

  decode(code: number): Npc | null {
    return this.dicts.get(code) ?? null;
  }

  encode(code: string): number {
    for (const [key, npc] of this.dicts) {
      if (npc.code === code) return key;
    }
    return 0;
  }

  listAllSeleable(groups: number): number[] {
    const all = this.listAllNPC(groups);
    const pair = [
      'NCR01', 'NCT12', 'NCR02', 'NC302', 'NCR03', 'NC202', 'NCR04', 'N3W01',
      'NCR05', 'NCT04', 'NCR06', 'NC405',
    ];
    for (let i = 0; i < pair.length; i += 2) {
      if (all.some(id => this.dicts.get(id)?.code === pair[i])) {
        for (let j = all.length - 1; j >= 0; j--) {
          if (this.dicts.get(all[j])?.code === pair[i + 1]) all.splice(j, 1);
        }
      }
    }
    return all;
  }

  listAllNPC(groups: number): number[] {
    const pkgs = Card.level2Pkg(groups);
    if (pkgs == null) return [...this.dicts.keys()];
    return [...this.dicts.entries()]
      .filter(([_, npc]) => pkgs.includes(npc.group))
      .map(([key]) => key);
  }
}
