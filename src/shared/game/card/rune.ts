/**
 * Rune class - Translation of C# PSD.Base.Rune
 */
import type { Player } from '../player';

export type RuneInputDelegate = (player: Player, fuse: string, prev: string) => string;
export type RuneActionDelegate = (player: Player, fuse: string, args: string) => void;
export type RuneValidDelegate = (player: Player, fuse: string) => boolean;

const DefRuneInput: RuneInputDelegate = () => '';
const DefRuneAction: RuneActionDelegate = () => {};
const DefRuneValid: RuneValidDelegate = () => true;

export class Rune {
  readonly name: string;
  readonly code: string;
  readonly occur: string;
  readonly priority: number;
  readonly isLock: boolean | null;
  readonly isOnce: boolean;
  readonly isTermin: boolean;
  readonly isConsume: boolean;
  readonly description: string;

  private _input: RuneInputDelegate | null = null;
  get input(): RuneInputDelegate { return this._input ?? DefRuneInput; }
  set input(handler: RuneInputDelegate) { this._input = handler; }

  private _action: RuneActionDelegate | null = null;
  get action(): RuneActionDelegate { return this._action ?? DefRuneAction; }
  set action(handler: RuneActionDelegate) { this._action = handler; }

  private _valid: RuneValidDelegate | null = null;
  get valid(): RuneValidDelegate { return this._valid ?? DefRuneValid; }
  set valid(handler: RuneValidDelegate) { this._valid = handler; }

  constructor(
    name: string,
    code: string,
    occur: string,
    priority: number,
    isLock: boolean | null,
    isOnce: boolean,
    isTermin: boolean,
    isConsume: boolean,
    desc: string,
  ) {
    this.name = name;
    this.code = code;
    this.occur = occur;
    this.priority = priority;
    this.isLock = isLock;
    this.isOnce = isOnce;
    this.isTermin = isTermin;
    this.isConsume = isConsume;
    this.description = desc;
  }
}
