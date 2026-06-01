/**
 * Illusion class - Translation of C# PSD.Base.Card.Illusion
 * Inherits from TuxEquip, represents illusion equipment
 */
import { TuxType } from '@shared/types/enums';
import { TuxEquip } from './tux-equip';

export class Illusion extends TuxEquip {
  ilas: string | null = null;

  override isLuggage(): boolean { return false; }
  override isIllusion(): boolean { return true; }

  constructor(
    name: string,
    code: string,
    genre: number,
    type: TuxType,
    description: string,
    special: Record<string, string>,
    growup: string,
  ) {
    super(name, code, genre, type, description, special, growup);
  }
}
