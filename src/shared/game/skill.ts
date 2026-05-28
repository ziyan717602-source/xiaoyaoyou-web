/**
 * Skill, Bless, SKBranch - Translation of C# PSD.Base.Skill and PSD.Base.SKBranch
 */
import type { Player } from './player';

// Delegate types
export type ActionDelegate = (player: Player, type: number, fuse: string, argst: string) => void;
export type ValidDelegate = (player: Player, type: number, fuse: string) => boolean;
export type InputDelegate = (player: Player, type: number, fuse: string, prev: string) => string;
export type EncryptDelegate = (args: string) => string;

const DefAction: ActionDelegate = () => {};
const DefValid: ValidDelegate = () => true;
const DefInput: InputDelegate = () => '';
const DefEncrypt: EncryptDelegate = (a) => a;

export class Skill {
  readonly name: string;
  readonly code: string;
  readonly occurs: string[];
  readonly priorities: number[];
  readonly isOnce: boolean[];
  readonly isTermini: boolean[];
  readonly lock: (boolean | null)[];
  readonly isHind: boolean[];
  isChange = false;
  isRestrict = false;
  readonly parasitism: string[];
  descripe = '';

  private _action: ActionDelegate | null = null;
  get action(): ActionDelegate { return this._action ?? DefAction; }
  set action(handler: ActionDelegate) { this._action = handler; }

  private _valid: ValidDelegate | null = null;
  get valid(): ValidDelegate { return this._valid ?? DefValid; }
  set valid(handler: ValidDelegate) { this._valid = handler; }

  private _input: InputDelegate | null = null;
  get input(): InputDelegate { return this._input ?? DefInput; }
  set input(handler: InputDelegate) { this._input = handler; }

  private _encrypt: EncryptDelegate | null = null;
  get encrypt(): EncryptDelegate { return this._encrypt ?? DefEncrypt; }
  set encrypt(handler: EncryptDelegate) { this._encrypt = handler; }

  get isBK(): boolean { return false; }

  constructor(
    name: string,
    code: string,
    occurStr: string,
    priortyStr: string,
    isOnceStr: string,
    isHindStr: string,
    parasitismStr: string,
    terminiStr: string,
  ) {
    this.name = name;
    this.code = code;

    const occurs = occurStr.split(',');
    const priorties = priortyStr.split(',');
    const onces = isOnceStr.split(',');
    const sz = occurs.length;

    this.occurs = new Array(sz);
    this.priorities = new Array(sz);
    this.isOnce = new Array(sz);
    this.lock = new Array(sz);

    for (let i = 0; i < sz; i++) {
      if (occurs[i].startsWith('!')) {
        this.occurs[i] = occurs[i].substring(1);
        this.lock[i] = true;
      } else if (occurs[i].startsWith('?')) {
        this.occurs[i] = occurs[i].substring(1);
        this.lock[i] = null;
      } else {
        this.occurs[i] = occurs[i];
        this.lock[i] = false;
      }
      this.priorities[i] = parseInt(priorties[i], 10);
      this.isOnce[i] = onces[i] === '1';
    }

    this.parasitism = parasitismStr ? parasitismStr.split('&') : [];

    if (isHindStr) {
      this.isHind = isHindStr.split(',').map(p => p === '1');
    } else {
      this.isHind = new Array(sz).fill(false);
    }

    if (terminiStr) {
      this.isTermini = terminiStr.split(',').map(p => p === '1');
    } else {
      this.isTermini = new Array(sz).fill(false);
    }
  }

  isLinked(inType: number): boolean {
    return this.occurs != null && this.occurs.length > inType &&
      this.occurs[inType].includes('%');
  }

  forceChange(field: string, value: unknown): void {
    const self = this as Record<string, unknown>;
    if (field === 'Occurs' && Array.isArray(value)) self['occurs'] = value;
    else if (field === 'Priorities' && Array.isArray(value)) self['priorities'] = value;
    else if (field === 'IsOnce' && Array.isArray(value)) self['isOnce'] = value;
    else if (field === 'IsTermini' && Array.isArray(value)) self['isTermini'] = value;
    else if (field === 'Lock' && Array.isArray(value)) self['lock'] = value;
    else if (field === 'IsHind' && Array.isArray(value)) self['isHind'] = value;
    else if (field === 'Name' && typeof value === 'string') self['name'] = value;
    else if (field === 'Code' && typeof value === 'string') self['code'] = value;
  }
}

// Bless types
export type BKValidDelegate = (player: Player, type: number, fuse: string, owner: number) => boolean;
const DefBKValid: BKValidDelegate = () => true;

export class Bless extends Skill {
  override get isBK(): boolean { return true; }

  private _bkValid: BKValidDelegate | null = null;
  get bkValid(): BKValidDelegate { return this._bkValid ?? DefBKValid; }
  set bkValid(handler: BKValidDelegate) { this._bkValid = handler; }

  constructor(
    name: string,
    code: string,
    occurStr: string,
    priortyStr: string,
    isOnceStr: string,
    isHindStr: string,
    parasitismStr: string,
    terminiStr: string,
  ) {
    super(name, code, occurStr, priortyStr, isOnceStr, isHindStr, parasitismStr, terminiStr);
  }
}

// SKBranch class
export class SKBranch {
  occur = '';
  priority = 0;
  once = false;
  serial = false;
  hind = false;
  demiurgic = false;
  lock: boolean | null = false;

  get linked(): boolean {
    return this.occur.includes('&');
  }

  get mixCode(): number {
    return (this.once ? 0x1 : 0) | (this.demiurgic ? 0x2 : 0) |
      (this.serial ? 0x4 : 0) | (this.hind ? 0x8 : 0);
  }

  set mixCode(value: number) {
    this.once = (value & 0x1) !== 0;
    this.demiurgic = (value & 0x2) !== 0;
    this.serial = (value & 0x4) !== 0;
    this.hind = (value & 0x8) !== 0;
  }

  static parseFromStrings(occurStr: string, priortyStr: string, mixCodeStr: string): (SKBranch | null)[] {
    const occurs = occurStr.split(',');
    const priorties = priortyStr.split(',');
    const mixCodes = mixCodeStr.split(',');
    const sz = occurs.length;
    const skbs: (SKBranch | null)[] = new Array(sz);

    for (let i = 0; i < sz; i++) {
      if (occurs[i] === '' || occurs[i] === '^') { skbs[i] = null; continue; }
      const skb = new SKBranch();
      skb.priority = parseInt(priorties[i], 10);
      skb.mixCode = parseInt(mixCodes[i], 10);
      if (occurs[i].startsWith('!')) {
        skb.occur = occurs[i].substring(1);
        skb.lock = true;
      } else if (occurs[i].startsWith('?')) {
        skb.occur = occurs[i].substring(1);
        skb.lock = null;
      } else {
        skb.occur = occurs[i];
        skb.lock = false;
      }
      skbs[i] = skb;
    }
    return skbs;
  }

  static parseFromString(str: string): (SKBranch | null)[] {
    if (!str) return [];

    const strs = str.split(';');
    const sz = strs.length;
    const skbs: (SKBranch | null)[] = new Array(sz);

    for (let i = 0; i < sz; i++) {
      if (strs[i] === '' || strs[i] === '^') { skbs[i] = null; continue; }
      const parts = strs[i].split(',');
      const skb = new SKBranch();
      skb.priority = parseInt(parts[1], 10);
      skb.mixCode = parseInt(parts[2], 10);
      const occur = parts[0];
      if (occur.startsWith('!')) {
        skb.occur = occur.substring(1);
        skb.lock = true;
      } else if (occur.startsWith('?')) {
        skb.occur = occur.substring(1);
        skb.lock = null;
      } else {
        skb.occur = occur;
        skb.lock = false;
      }
      skbs[i] = skb;
    }
    return skbs;
  }
}
