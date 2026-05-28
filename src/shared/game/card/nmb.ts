/**
 * NMB interface and NMBLib - Translation of C# PSD.Base.Card.NMB and NMBLib
 */
// Forward-declared types for MonsterLib and NpcLib
// These are defined in lib/ to avoid circular dependencies
interface MonsterLib {
  decode(code: number): NMB | null;
  encode(code: string): number;
}
interface NpcLib {
  decode(code: number): NMB | null;
  encode(code: string): number;
}

/** NMB interface - common base for Monster and NPC */
export interface NMB {
  isMonster(): boolean;
  isNpc(): boolean;
  readonly name: string;
  readonly code: string;
  readonly str: number;
  readonly agl: number;
}

/** NMBLib static utility class */
export abstract class NMBLib {
  /** Check if id represents a monster (1-999) */
  static isMonster(id: number): boolean {
    return id > 0 && id < 1000;
  }

  /** Check if id represents an NPC (1001-1999) */
  static isNPC(id: number): boolean {
    return id > 1000 && id < 2000;
  }

  /** Decode an NMB from id */
  static decode(id: number, ml: MonsterLib, nl: NpcLib): NMB | null {
    if (id < 1000) return ml.decode(id);
    if (id > 1000 && id < 2000) return nl.decode(id - 1000);
    return null;
  }

  /** Encode an NMB code string to id */
  static encode(code: string, ml: MonsterLib, nl: NpcLib): number {
    if (code.startsWith('G')) {
      const monId = ml.encode(code);
      return NMBLib.codeOfMonster(monId);
    }
    if (code.startsWith('N')) {
      const npcId = nl.encode(code);
      return NMBLib.codeOfNPC(npcId);
    }
    return 0;
  }

  /** Convert monster id to NMB code */
  static codeOfMonster(id: number): number { return id; }

  /** Get original monster id from NMB code */
  static originalMonster(id: number): number { return id; }

  /** Convert NPC id to NMB code (+1000 offset) */
  static codeOfNPC(id: number): number { return id + 1000; }

  /** Get original NPC id from NMB code */
  static originalNPC(id: number): number { return id - 1000; }
}
