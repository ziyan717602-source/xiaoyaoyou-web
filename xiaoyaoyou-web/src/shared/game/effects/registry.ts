/**
 * Card Effect Registry - Translation of C# reflection-based effect registration
 *
 * Replaces C# GetType().GetMethod(code+"Action") pattern with explicit Map-based lookup.
 * Each card/skill code maps to an EffectRegistration with its delegate handlers.
 */
import type {
  EffectRegistration,
  OpEffectRegistration,
  NpcEffectRegistration,
  RuneEffectRegistration,
  EveEffectRegistration,
} from './types';

/**
 * CardEffectRegistry - Central registry for all card/skill effects.
 *
 * C# used reflection: tc.GetType().GetMethod(cardCode + "Action")
 * TS uses explicit registration with string-keyed Map.
 */
export class CardEffectRegistry {
  private effects = new Map<string, EffectRegistration>();

  /** Register a single hand-card/skill effect */
  register(reg: EffectRegistration): void {
    this.effects.set(reg.code, reg);
  }

  /** Batch register hand-card/skill effects */
  registerAll(regs: EffectRegistration[]): void {
    for (const reg of regs) {
      this.register(reg);
    }
  }

  /** Get effect by card code */
  get(code: string): EffectRegistration | undefined {
    return this.effects.get(code);
  }

  /** Check if effect exists */
  has(code: string): boolean {
    return this.effects.has(code);
  }

  /** Get all registered codes */
  getCodes(): string[] {
    return Array.from(this.effects.keys());
  }

  /** Get count */
  get size(): number {
    return this.effects.size;
  }

  /** Clear all */
  clear(): void {
    this.effects.clear();
  }
}

/**
 * OperationCottage effect registry for CZ operations.
 */
export class OperationEffectRegistry {
  private effects = new Map<string, OpEffectRegistration>();

  register(reg: OpEffectRegistration): void {
    this.effects.set(reg.code, reg);
  }

  registerAll(regs: OpEffectRegistration[]): void {
    for (const reg of regs) {
      this.register(reg);
    }
  }

  get(code: string): OpEffectRegistration | undefined {
    return this.effects.get(code);
  }

  has(code: string): boolean {
    return this.effects.has(code);
  }

  getCodes(): string[] {
    return Array.from(this.effects.keys());
  }

  get size(): number {
    return this.effects.size;
  }

  clear(): void {
    this.effects.clear();
  }
}

/**
 * NPC effect registry.
 */
export class NpcEffectRegistry {
  private effects = new Map<string, NpcEffectRegistration>();

  register(reg: NpcEffectRegistration): void {
    this.effects.set(reg.code, reg);
  }

  registerAll(regs: NpcEffectRegistration[]): void {
    for (const reg of regs) {
      this.register(reg);
    }
  }

  get(code: string): NpcEffectRegistration | undefined {
    return this.effects.get(code);
  }

  has(code: string): boolean {
    return this.effects.has(code);
  }

  get size(): number {
    return this.effects.size;
  }

  clear(): void {
    this.effects.clear();
  }
}

/**
 * Rune effect registry.
 */
export class RuneEffectRegistry {
  private effects = new Map<string, RuneEffectRegistration>();

  register(reg: RuneEffectRegistration): void {
    this.effects.set(reg.code, reg);
  }

  registerAll(regs: RuneEffectRegistration[]): void {
    for (const reg of regs) {
      this.register(reg);
    }
  }

  get(code: string): RuneEffectRegistration | undefined {
    return this.effects.get(code);
  }

  has(code: string): boolean {
    return this.effects.has(code);
  }

  get size(): number {
    return this.effects.size;
  }

  clear(): void {
    this.effects.clear();
  }
}

/**
 * Event effect registry.
 */
export class EveEffectRegistry {
  private effects = new Map<string, EveEffectRegistration>();

  register(reg: EveEffectRegistration): void {
    this.effects.set(reg.code, reg);
  }

  registerAll(regs: EveEffectRegistration[]): void {
    for (const reg of regs) {
      this.register(reg);
    }
  }

  get(code: string): EveEffectRegistration | undefined {
    return this.effects.get(code);
  }

  has(code: string): boolean {
    return this.effects.has(code);
  }

  get size(): number {
    return this.effects.size;
  }

  clear(): void {
    this.effects.clear();
  }
}
