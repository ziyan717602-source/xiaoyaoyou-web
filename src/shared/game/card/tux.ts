/**
 * Tux class - Translation of C# PSD.Base.Card.Tux
 * Includes delegate types and the Tux card class
 */
import { TuxType } from '@shared/types/enums';
import type { Player } from '../player';

// Delegate types (C# delegate -> TS function type)
export type TuxActionDelegate = (player: Player, type: number, fuse: string, argst: string) => void;
export type TuxVestigeDelegate = (player: Player, type: number, fuse: string, it: number) => void;
export type TuxValidDelegate = (player: Player, type: number, fuse: string) => boolean;
export type TuxInputDelegate = (player: Player, type: number, fuse: string, prev: string) => Promise<string> | string;
export type TuxInputHolderDelegate = (provider: Player, user: Player, type: number, fuse: string, prev: string) => string;
export type TuxEncryptDelegate = (args: string) => string;
export type TuxLocustActionDelegate = (player: Player, type: number, fuse: string, cdFuse: string, locuster: Player, locust: Tux, it: number) => void;

/** Default no-op delegates */
const DefTuxAction: TuxActionDelegate = () => {};
const DefTuxVestige: TuxVestigeDelegate = () => {};
const DefTuxValid: TuxValidDelegate = () => true;
const DefTuxInput: TuxInputDelegate = () => '';
const DefTuxInputHolder: TuxInputHolderDelegate = () => '';
const DefTuxEncrypt: TuxEncryptDelegate = (a) => a;
const DefTuxLocust: TuxLocustActionDelegate = () => {};

export class Tux {
  readonly name: string;
  readonly code: string;
  readonly type: TuxType;
  readonly genre: number;
  readonly description: string;
  readonly special: Record<string, string>;

  package: number[] = [];
  range: number[] = [];
  dbSerial = 0;

  priorities: number[] = [];
  occurs: string[] = [];
  parasitism: string[] = [];
  targets: string[] = [];
  isTermini: boolean[] = [];

  private _action: TuxActionDelegate | null = null;
  get action(): TuxActionDelegate { return this._action ?? DefTuxAction; }
  set action(handler: TuxActionDelegate) { this._action = handler; }

  private _vestige: TuxVestigeDelegate | null = null;
  get vestige(): TuxVestigeDelegate { return this._vestige ?? DefTuxVestige; }
  set vestige(handler: TuxVestigeDelegate) { this._vestige = handler; }

  private _input: TuxInputDelegate | null = null;
  get input(): TuxInputDelegate { return this._input ?? DefTuxInput; }
  set input(handler: TuxInputDelegate) { this._input = handler; }

  private _inputHolder: TuxInputHolderDelegate | null = null;
  get inputHolder(): TuxInputHolderDelegate { return this._inputHolder ?? DefTuxInputHolder; }
  set inputHolder(handler: TuxInputHolderDelegate) { this._inputHolder = handler; }

  private _valid: TuxValidDelegate | null = null;
  get valid(): TuxValidDelegate { return this._valid ?? DefTuxValid; }
  set valid(handler: TuxValidDelegate) { this._valid = handler; }

  private _bribe: TuxValidDelegate | null = null;
  get bribe(): TuxValidDelegate { return this._bribe ?? DefTuxValid; }
  set bribe(handler: TuxValidDelegate) { this._bribe = handler; }

  private _encrypt: TuxEncryptDelegate | null = null;
  get encrypt(): TuxEncryptDelegate { return this._encrypt ?? DefTuxEncrypt; }
  set encrypt(handler: TuxEncryptDelegate) { this._encrypt = handler; }

  private _locust: TuxLocustActionDelegate | null = null;
  get locust(): TuxLocustActionDelegate { return this._locust ?? DefTuxLocust; }
  set locust(handler: TuxLocustActionDelegate) { this._locust = handler; }

  constructor(
    name: string,
    code: string,
    genre: number,
    type: TuxType,
    description: string,
    special: Record<string, string>,
  ) {
    this.name = name;
    this.code = code;
    this.genre = genre;
    this.type = type;
    this.description = description;
    this.special = special;
  }

  isTuxEquip(): boolean { return false; }

  isLinked(inType: number): boolean {
    return this.occurs != null && this.occurs.length > inType &&
      this.occurs[inType].includes('%');
  }

  isSameType(tux: Tux): boolean {
    return tux != null && ((this.isTuxEquip() && tux.isTuxEquip()) || this.type === tux.type);
  }

  occurString(): string {
    if (this.occurs != null) {
      return this.occurs.join(',');
    }
    return '';
  }

  /** Parse count, occur, parasitism, priority, target, termini strings */
  parse(
    countStr: string,
    occurStr: string,
    parasitismStr: string,
    priorStr: string,
    tarStr: string,
    terminiStr: string,
    dbSerial: number,
  ): void {
    if (countStr) {
      const counts = countStr.split(',');
      this.package = [];
      this.range = [];
      for (let i = 0; i < counts.length; i += 3) {
        this.package.push(parseInt(counts[i], 10));
        this.range.push(parseInt(counts[i + 1], 10));
        this.range.push(parseInt(counts[i + 2], 10));
      }
    }
    if (occurStr && occurStr !== '^') {
      this.occurs = occurStr.split(',');
    } else {
      this.occurs = [];
    }
    if (parasitismStr && parasitismStr !== '^') {
      this.parasitism = parasitismStr.split('&');
    } else {
      this.parasitism = [];
    }
    if (priorStr && priorStr !== '^') {
      const priors = priorStr.split(',');
      this.priorities = priors.map(p => parseInt(p, 10));
    }
    if (tarStr) {
      this.targets = tarStr.split(',').map(t => t[0]);
    }
    if (terminiStr) {
      this.isTermini = terminiStr.split(',').map(t => t[0] === '1');
    } else {
      this.isTermini = new Array(this.occurs.length).fill(false);
    }
    this.dbSerial = dbSerial;
  }
}
