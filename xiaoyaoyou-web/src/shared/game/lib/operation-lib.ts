/**
 * OperationLib - Translation of C# PSD.Base.OperationLib
 */
import { Operation } from '../operation';
import type { Operation as OpsData } from '@shared/types/operation';

export class OperationLib {
  readonly firsts: Operation[] = [];

  constructor(data: OpsData[]) {
    for (const item of data) {
      const occurs = (item.Occurs ?? []).join(',');
      const op = new Operation(
        item.Name,
        item.Code,
        occurs,
        (item.IsOnce ?? []).some(p => p),
      );
      this.firsts.push(op);
    }
  }

  get size(): number { return this.firsts.length; }

  encodeOps(code: string): Operation | null {
    for (const op of this.firsts) {
      if (op.code === code) return op;
    }
    return null;
  }
}
