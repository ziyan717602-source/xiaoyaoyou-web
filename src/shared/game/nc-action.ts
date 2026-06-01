/**
 * NCAction - Translation of C# PSD.Base.NCAction
 */
import { SKBranch } from './skill';
import type { Player } from './player';

export type NCActionDelegate = (player: Player, fuse: string, argst: string) => void;
export type NCValidDelegate = (player: Player, fuse: string) => boolean;
export type NCInputDelegate = (player: Player, fuse: string, prev: string) => string;
export type NCEscueActionDelegate = (player: Player, npcUt: number, type: number, fuse: string, argst: string) => void;
export type NCEscueValidDelegate = (player: Player, npcUt: number, type: number, fuse: string) => boolean;
export type NCEscueInputDelegate = (player: Player, npcUt: number, type: number, fuse: string, prev: string) => string;

const DefAction: NCActionDelegate = () => {};
const DefValid: NCValidDelegate = () => true;
const DefInput: NCInputDelegate = () => '';
const DefEscueAction: NCEscueActionDelegate = () => {};
const DefEscueValid: NCEscueValidDelegate = () => true;
const DefEscueInput: NCEscueInputDelegate = () => '';

export class NCAction {
  name = '';
  code = '';
  intro = '';
  readonly branches: (SKBranch | null)[];

  private _action: NCActionDelegate | null = null;
  get action(): NCActionDelegate { return this._action ?? DefAction; }
  set action(handler: NCActionDelegate) { this._action = handler; }

  private _valid: NCValidDelegate | null = null;
  get valid(): NCValidDelegate { return this._valid ?? DefValid; }
  set valid(handler: NCValidDelegate) { this._valid = handler; }

  private _input: NCInputDelegate | null = null;
  get input(): NCInputDelegate { return this._input ?? DefInput; }
  set input(handler: NCInputDelegate) { this._input = handler; }

  private _escueAction: NCEscueActionDelegate | null = null;
  get escueAction(): NCEscueActionDelegate { return this._escueAction ?? DefEscueAction; }
  set escueAction(handler: NCEscueActionDelegate) { this._escueAction = handler; }

  private _escueValid: NCEscueValidDelegate | null = null;
  get escueValid(): NCEscueValidDelegate { return this._escueValid ?? DefEscueValid; }
  set escueValid(handler: NCEscueValidDelegate) { this._escueValid = handler; }

  private _escueInput: NCEscueInputDelegate | null = null;
  get escueInput(): NCEscueInputDelegate { return this._escueInput ?? DefEscueInput; }
  set escueInput(handler: NCEscueInputDelegate) { this._escueInput = handler; }

  constructor(name: string, code: string, intro: string, escue: string) {
    this.name = name;
    this.code = code;
    this.intro = intro;
    this.branches = SKBranch.parseFromString(escue);
  }
}
