/**
 * Effect Types - Translation of C# JNS delegate types
 *
 * Defines all delegate types and interfaces for card effects.
 * Maps directly to the Action/Valid/Input delegate triplets used in C#.
 */
import type { Player } from '../player';

// ─── Hand Card / Skill Effect Delegates (Action, Valid, Input) ───

/** Action delegate for hand card and skill effects (supports async for network input) */
export type ActionDelegate = (
  player: Player, type: number, fuse: string, argst: string,
) => Promise<void> | void;

/** Valid delegate for hand card and skill effects */
export type ValidDelegate = (
  player: Player, type: number, fuse: string,
) => boolean;

/** Input delegate for hand card and skill effects (supports async for network input) */
export type InputDelegate = (
  player: Player, type: number, fuse: string, prev: string,
) => Promise<string> | string;

/** Bribe delegate (card activation condition) */
export type BribeDelegate = (
  player: Player, type: number, fuse: string,
) => boolean;

/** Vestige delegate (lingering effect after card leaves play) */
export type VestigeDelegate = (
  player: Player, type: number, fuse: string, it: number,
) => void;

/** Locust delegate (parasitic effect transfer) */
export type LocustDelegate = (
  player: Player, type: number, fuse: string, cdFuse: string,
  locuster: Player, locust: unknown, locustee: number,
) => void;

// ─── Equipment Consume Delegates ───

/** Equipment consume action */
export type CsActionDelegate = (
  player: Player, consumeType: number, type: number, fuse: string, argst: string,
) => void;

/** Equipment consume valid */
export type CsValidDelegate = (
  player: Player, consumeType: number, type: number, fuse: string,
) => boolean;

/** Equipment consume input */
export type CsInputDelegate = (
  player: Player, consumeType: number, type: number, fuse: string, prev: string,
) => string;

// ─── Equipment Holder Delegates ───

/** Equipment consume action holder (provider vs user) */
export type CsActionHolderDelegate = (
  provider: Player, user: Player, consumeType: number,
  type: number, fuse: string, argst: string,
) => void;

/** Equipment consume valid holder */
export type CsValidHolderDelegate = (
  provider: Player, user: Player, consumeType: number,
  type: number, fuse: string,
) => boolean;

/** Equipment consume input holder */
export type CsInputHolderDelegate = (
  provider: Player, user: Player, consumeType: number,
  type: number, fuse: string, prev: string,
) => string;

// ─── Equipment Property Delegates ───

/** Equipment incr/decr action */
export type CrActionDelegate = (player: Player) => void;

/** Equipment use action */
export type UseActionDelegate = (cardUt: number, player: Player, source: number) => void;

/** Equipment input holder (for equip cards) */
export type InputHolderDelegate = (
  provider: Player, user: Player, type: number, fuse: string, prev: string,
) => string;

// ─── Operation Effect Delegates ───

/** Operation action (no type parameter, supports async for network input) */
export type OpActionDelegate = (
  player: Player, fuse: string, args: string,
) => Promise<void> | void;

/** Operation valid */
export type OpValidDelegate = (
  player: Player, fuse: string,
) => boolean;

/** Operation input (supports async for network input) */
export type OpInputDelegate = (
  player: Player, fuse: string, prev: string,
) => Promise<string> | string;

// ─── NPC Effect Delegates ───

/** NPC action delegate (supports async for network input) */
export type NpcActionDelegate = (
  player: Player, fuse: string, args: string,
) => Promise<void> | void;

/** NPC valid delegate */
export type NpcValidDelegate = (
  player: Player, fuse: string,
) => boolean;

/** NPC input delegate (supports async for network input) */
export type NpcInputDelegate = (
  player: Player, fuse: string, prev: string,
) => Promise<string> | string;

/** NPC escue action (supports async for network input) */
export type NpcEscueActionDelegate = (
  player: Player, npcUt: number, type: number, fuse: string, args: string,
) => Promise<void> | void;

/** NPC escue valid */
export type NpcEscueValidDelegate = (
  player: Player, npcUt: number, type: number, fuse: string,
) => boolean;

/** NPC escue input (supports async for network input) */
export type NpcEscueInputDelegate = (
  player: Player, npcUt: number, type: number, fuse: string, prev: string,
) => Promise<string> | string;

// ─── Rune Effect Delegates ───

/** Rune action delegate (supports async for network input) */
export type RuneActionDelegate = (
  player: Player, fuse: string, args: string,
) => Promise<void> | void;

/** Rune valid delegate */
export type RuneValidDelegate = (
  player: Player, fuse: string,
) => boolean;

/** Rune input delegate (supports async for network input) */
export type RuneInputDelegate = (
  player: Player, fuse: string, prev: string,
) => Promise<string> | string;

// ─── Event Effect Delegates ───

/** Event action delegate (only receives rounder player) */
export type EveActionDelegate = (player: Player) => void;

// ─── Effect Registration ───

/**
 * Registration entry for a single card/skill effect.
 * Contains all possible delegate handlers for one code.
 * At runtime, only the relevant delegates are populated.
 */
export interface EffectRegistration {
  code: string;

  // Hand card / skill delegates
  action?: ActionDelegate;
  valid?: ValidDelegate;
  input?: InputDelegate;
  bribe?: BribeDelegate;
  vestige?: VestigeDelegate;
  locust?: LocustDelegate;
  inputHolder?: InputHolderDelegate;

  // Equipment consume
  consumeAction?: CsActionDelegate;
  consumeValid?: CsValidDelegate;
  consumeInput?: CsInputDelegate;
  consumeActionHolder?: CsActionHolderDelegate;
  consumeValidHolder?: CsValidHolderDelegate;
  consumeInputHolder?: CsInputHolderDelegate;

  // Equipment property
  incrAction?: CrActionDelegate;
  decrAction?: CrActionDelegate;
  insAction?: CrActionDelegate;
  delAction?: CrActionDelegate;
  useAction?: UseActionDelegate;
}

/**
 * Registration entry for operation effects (CZ series).
 * Operation delegates have a different signature (no type parameter).
 */
export interface OpEffectRegistration {
  code: string;
  action?: OpActionDelegate;
  valid?: OpValidDelegate;
  input?: OpInputDelegate;
}

/**
 * Registration entry for NPC action effects.
 */
export interface NpcEffectRegistration {
  code: string;
  debut?: (trigger: Player) => void;
  action?: NpcActionDelegate;
  valid?: NpcValidDelegate;
  input?: NpcInputDelegate;
  escueAction?: NpcEscueActionDelegate;
  escueValid?: NpcEscueValidDelegate;
  escueInput?: NpcEscueInputDelegate;
}

/**
 * Registration entry for rune effects.
 */
export interface RuneEffectRegistration {
  code: string;
  action?: RuneActionDelegate;
  valid?: RuneValidDelegate;
  input?: RuneInputDelegate;
}

/**
 * Registration entry for event effects.
 */
export interface EveEffectRegistration {
  code: string;
  action?: EveActionDelegate;
}
