/**
 * Operation - Translation of C# PSD.Base.Operation
 */
import type { Player } from './player';

export type OpsInputDelegate = (player: Player, fuse: string, prev: string) => string;
export type OpsActionDelegate = (player: Player, fuse: string, args: string) => void;
export type OpsValidDelegate = (player: Player, fuse: string) => boolean;

const DefInput: OpsInputDelegate = () => '';
const DefAction: OpsActionDelegate = () => {};
const DefValid: OpsValidDelegate = () => true;

export class Operation {
  readonly name: string;
  readonly code: string;
  readonly occur: string;
  readonly isOnce: boolean;

  private _input: OpsInputDelegate | null = null;
  get input(): OpsInputDelegate { return this._input ?? DefInput; }
  set input(handler: OpsInputDelegate) { this._input = handler; }

  private _action: OpsActionDelegate | null = null;
  get action(): OpsActionDelegate { return this._action ?? DefAction; }
  set action(handler: OpsActionDelegate) { this._action = handler; }

  private _valid: OpsValidDelegate | null = null;
  get valid(): OpsValidDelegate { return this._valid ?? DefValid; }
  set valid(handler: OpsValidDelegate) { this._valid = handler; }

  constructor(name: string, code: string, occur: string, isOnce: boolean) {
    this.name = name;
    this.code = code;
    this.occur = occur;
    this.isOnce = isOnce;
  }
}
