/**
 * Luggage class - Translation of C# PSD.Base.Card.Luggage
 * Inherits from TuxEquip, represents luggage equipment
 */
import { TuxType } from '@shared/types/enums';
import { TuxEquip } from './tux-equip';

export class Luggage extends TuxEquip {
  capacities: string[] = [];
  pull = false;

  override isLuggage(): boolean { return true; }
  override isIllusion(): boolean { return false; }

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
