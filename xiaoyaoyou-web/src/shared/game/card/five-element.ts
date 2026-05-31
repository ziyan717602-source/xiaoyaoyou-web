/**
 * FiveElement helper - Translation of C# PSD.Base.Card.FiveElementHelper
 * FiveElement and HPEvoMask enums are in @shared/types/enums
 * This module provides helper methods
 */
import { FiveElement } from '@shared/types/enums';

export const HPEvoMask = {
  AVO_MASK: 0xF,
  TUX_INAVO: 0x1,
  IMMUNE_INVAO: 0x2,
  DECR_INVAO: 0x4,
  CHAIN_INVAO: 0x8,

  FINAL_MASK: 0x7 << 4,
  ALIVE: 0x1 << 4,
  ALIVE_HARD: 0x2 << 4,
  TERMIN_AT: 0x4 << 4,

  SRC_MASK: 0x3 << 7,
  FROM_JP: 0x1 << 7,
  FROM_SK: 0x2 << 7,
  FROM_NMB: 0x3 << 7,

  RESERVED_MASK: 0x3 << 9,
  RSV_DUEL: 0x1 << 9,
  RSV_WORM: 0x2 << 9,
} as const;

export class FiveElementHelper {
  static readonly PropCount = 7;
  static readonly StandardPropCount = 5;

  /** Convert FiveElement to its integer value */
  static elem2Int(element: FiveElement): number {
    const map: Record<string, number> = {
      A: 0, AQUA: 1, AGNI: 2, THUNDER: 3, AERO: 4, SATURN: 5, YINN: 6, SOLARIS: 7,
    };
    return map[element] ?? 0;
  }

  /** Convert FiveElement to index (elem2Int - 1) */
  static elem2Index(element: FiveElement): number {
    return FiveElementHelper.elem2Int(element) - 1;
  }

  /** Convert integer code to FiveElement */
  static int2Elem(code: number): FiveElement {
    switch (code) {
      case 1: return FiveElement.AQUA;
      case 2: return FiveElement.AGNI;
      case 3: return FiveElement.THUNDER;
      case 4: return FiveElement.AERO;
      case 5: return FiveElement.SATURN;
      case 6: return FiveElement.YINN;
      case 7: return FiveElement.SOLARIS;
      default: return FiveElement.A;
    }
  }

  /** Check if mask is set in code */
  static isSet(mask: number, code: number): boolean {
    if (mask === HPEvoMask.TUX_INAVO || mask === HPEvoMask.IMMUNE_INVAO ||
        mask === HPEvoMask.DECR_INVAO || mask === HPEvoMask.CHAIN_INVAO) {
      return (code & mask) === mask;
    }
    if (mask === HPEvoMask.ALIVE || mask === HPEvoMask.TERMIN_AT) {
      return (code & HPEvoMask.FINAL_MASK) === mask;
    }
    if (mask === HPEvoMask.FROM_JP || mask === HPEvoMask.FROM_SK || mask === HPEvoMask.FROM_NMB) {
      return (code & HPEvoMask.SRC_MASK) === mask;
    }
    if (mask === HPEvoMask.RSV_DUEL || mask === HPEvoMask.RSV_WORM) {
      return (code & HPEvoMask.RESERVED_MASK) === mask;
    }
    return false;
  }

  /** Set mask in code */
  static setMask(mask: number, code: number): number {
    let preMask = 0;
    if (mask === HPEvoMask.TUX_INAVO || mask === HPEvoMask.IMMUNE_INVAO ||
        mask === HPEvoMask.DECR_INVAO || mask === HPEvoMask.CHAIN_INVAO) {
      preMask = mask;
    } else if (mask === HPEvoMask.ALIVE || mask === HPEvoMask.TERMIN_AT) {
      preMask = HPEvoMask.FINAL_MASK;
    } else if (mask === HPEvoMask.FROM_JP || mask === HPEvoMask.FROM_SK || mask === HPEvoMask.FROM_NMB) {
      preMask = HPEvoMask.SRC_MASK;
    } else if (mask === HPEvoMask.RSV_DUEL || mask === HPEvoMask.RSV_WORM) {
      preMask = HPEvoMask.RESERVED_MASK;
    }
    return (code & ~preMask) | mask;
  }

  /** Reset mask in code */
  static resetMask(mask: number, code: number): number {
    if (mask === HPEvoMask.AVO_MASK || mask === HPEvoMask.FINAL_MASK ||
        mask === HPEvoMask.SRC_MASK || mask === HPEvoMask.RESERVED_MASK) {
      return code & ~mask;
    }
    return code;
  }

  /** Get standard proped elements */
  static getStandardPropedElements(): FiveElement[] {
    return [FiveElement.AQUA, FiveElement.AGNI, FiveElement.THUNDER, FiveElement.AERO, FiveElement.SATURN];
  }

  /** Check if element is standard proped */
  static isStandardPropedElement(element: FiveElement): boolean {
    return [FiveElement.AQUA, FiveElement.AGNI, FiveElement.THUNDER, FiveElement.AERO, FiveElement.SATURN].includes(element);
  }

  /** Get all proped elements */
  static getPropedElements(): FiveElement[] {
    return [FiveElement.AQUA, FiveElement.AGNI, FiveElement.THUNDER, FiveElement.AERO, FiveElement.SATURN, FiveElement.YINN, FiveElement.SOLARIS];
  }

  /** Check if element is proped */
  static isPropedElement(element: FiveElement): boolean {
    return FiveElementHelper.isStandardPropedElement(element) || element === FiveElement.YINN || element === FiveElement.SOLARIS;
  }
}
