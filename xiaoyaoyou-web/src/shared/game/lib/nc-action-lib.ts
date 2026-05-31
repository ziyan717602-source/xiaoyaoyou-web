/**
 * NCActionLib - Translation of C# PSD.Base.NCActionLib
 */
import { NCAction } from '../nc-action';
import type { NCAction as NCActionData } from '@shared/types/nc-action';

export class NCActionLib {
  readonly firsts: NCAction[] = [];

  constructor(data: NCActionData[]) {
    for (const item of data) {
      const occurs = (item.Occurs ?? []).join(',');
      const priors = (item.Priorities ?? []).join(',');
      const onces = (item.IsOnce ?? []).map(p => p ? '1' : '0').join(',');
      const hinds = (item.IsHind ?? []).map(p => p ? '1' : '0').join(',');
      const terminiStr = (item.IsTermini ?? []).map(p => p ? '1' : '0').join(',');

      const ncAction = new NCAction(
        item.Name,
        item.Code,
        item.Descripe ?? '',
        occurs,
      );
      this.firsts.push(ncAction);
    }
  }

  get size(): number { return this.firsts.length; }

  encodeNCAction(code: string): NCAction | null {
    return this.firsts.find(p => p.code === code) ?? null;
  }
}
