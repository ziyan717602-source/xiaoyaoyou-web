/**
 * Monster class - Translation of C# PSD.Base.Card.Monster
 */
import { FiveElement, MonsterLevel } from '@shared/types/enums';
import type { NMB } from './nmb';
import { Diva } from '../utils/diva';
import type { Player } from '../player';

// Monster delegate types
export type MonsterDebutDelegate = () => void;
export type MonsterWLDelegate = () => void;
export type MonsterCrActionDelegate = (player: Player) => void;
export type MonsterCsActionDelegate = (player: Player, consumeType: number, type: number, fuse: string, argst: string) => void;
export type MonsterCsValidDelegate = (player: Player, consumeType: number, type: number, fuse: string) => boolean;
export type MonsterCsInputDelegate = (player: Player, consumeType: number, type: number, fuse: string, prev: string) => string;

const DefMonsterDebut: MonsterDebutDelegate = () => {};
const DefMonsterWL: MonsterWLDelegate = () => {};
const DefMonsterCrAction: MonsterCrActionDelegate = () => {};
const DefMonsterCsAction: MonsterCsActionDelegate = () => {};
const DefMonsterCsValid: MonsterCsValidDelegate = () => true;
const DefMonsterCsInput: MonsterCsInputDelegate = () => '';

export class Monster implements NMB {
  readonly name: string;
  readonly code: string;
  readonly group: number;
  readonly genre: number;
  readonly element: FiveElement;
  readonly level: MonsterLevel;
  readonly strb: number;
  readonly aglb: number;
  dbSerial = 0;
  readonly isEx: boolean;

  readonly eaOccurs: string[][] | null;
  readonly eaProperties: number[][] | null;
  readonly eaLocks: boolean[][] | null;
  readonly eaOnces: boolean[][] | null;
  readonly eaIsTermini: boolean[][] | null;
  readonly eaHinds: boolean[][] | null;

  padrone = 0;
  debutText = '';
  petText = '';
  winText = '';
  loseText = '';

  readonly rom = new Diva();
  readonly rfm = new Diva();
  readonly ram = new Diva();
  teamBursted = false;
  readonly seals = new Set<string>();

  // SPI fields
  private spiHW = 0; private spiHL = 0; private spiHw = 0; private spiHl = 0; private spiHC = 0; private spiHc = 0;
  private spiTW = 0; private spiTL = 0; private spiTw = 0; private spiTl = 0; private spiTC = 0; private spiTc = 0;
  private spiS = false;

  // Mutable STR/AGL
  private _mSTR: number;
  get str(): number { return this._mSTR >= 0 ? this._mSTR : 0; }
  set str(value: number) { this._mSTR = value; }

  private _mAGL: number;
  get agl(): number { return this._mAGL >= 0 ? this._mAGL : 0; }
  set agl(value: number) { this._mAGL = value; }

  // Delegate properties
  private _debut: MonsterDebutDelegate | null = null;
  get debut(): MonsterDebutDelegate { return this._debut ?? DefMonsterDebut; }
  set debut(handler: MonsterDebutDelegate) { this._debut = handler; }

  private _curtain: MonsterDebutDelegate | null = null;
  get curtain(): MonsterDebutDelegate { return this._curtain ?? DefMonsterDebut; }
  set curtain(handler: MonsterDebutDelegate) { this._curtain = handler; }

  private _winEff: MonsterWLDelegate | null = null;
  get winEff(): MonsterWLDelegate { return this._winEff ?? DefMonsterWL; }
  set winEff(handler: MonsterWLDelegate) { this._winEff = handler; }

  private _loseEff: MonsterWLDelegate | null = null;
  get loseEff(): MonsterWLDelegate { return this._loseEff ?? DefMonsterWL; }
  set loseEff(handler: MonsterWLDelegate) { this._loseEff = handler; }

  private _incrAction: MonsterCrActionDelegate | null = null;
  get incrAction(): MonsterCrActionDelegate { return this._incrAction ?? DefMonsterCrAction; }
  set incrAction(handler: MonsterCrActionDelegate) { this._incrAction = handler; }

  private _decrAction: MonsterCrActionDelegate | null = null;
  get decrAction(): MonsterCrActionDelegate { return this._decrAction ?? DefMonsterCrAction; }
  set decrAction(handler: MonsterCrActionDelegate) { this._decrAction = handler; }

  private _consumeAction: MonsterCsActionDelegate | null = null;
  get consumeAction(): MonsterCsActionDelegate { return this._consumeAction ?? DefMonsterCsAction; }
  set consumeAction(handler: MonsterCsActionDelegate) { this._consumeAction = handler; }

  private _consumeInput: MonsterCsInputDelegate | null = null;
  get consumeInput(): MonsterCsInputDelegate { return this._consumeInput ?? DefMonsterCsInput; }
  set consumeInput(handler: MonsterCsInputDelegate) { this._consumeInput = handler; }

  private _consumeValid: MonsterCsValidDelegate | null = null;
  get consumeValid(): MonsterCsValidDelegate { return this._consumeValid ?? DefMonsterCsValid; }
  set consumeValid(handler: MonsterCsValidDelegate) { this._consumeValid = handler; }

  constructor(
    name: string,
    code: string,
    group: number,
    genre: number,
    element: FiveElement,
    strb: number,
    agl: number,
    level: MonsterLevel,
    eaOccurs: string[][] | null,
    eaProperties: number[][] | null,
    eaLocks: boolean[][] | null,
    eaOnces: boolean[][] | null,
    eaIsTermini: boolean[][] | null,
    eaHinds: boolean[][] | null,
    spis: string,
  ) {
    this.name = name;
    this.code = code;
    this.group = Math.abs(group);
    this.genre = genre;
    this.isEx = group < 0;
    this.element = element;
    this.level = level;
    this.strb = strb;
    this._mSTR = strb;
    this.aglb = agl;
    this._mAGL = agl;
    this.eaOccurs = eaOccurs;
    this.eaProperties = eaProperties;
    this.eaLocks = eaLocks;
    this.eaOnces = eaOnces;
    this.eaIsTermini = eaIsTermini;
    this.eaHinds = eaHinds;
    this.parseSpi(spis);
  }

  isMonster(): boolean { return true; }
  isNpc(): boolean { return false; }

  /** Parse SPI string */
  parseSpi(spis: string): void {
    this.spiHW = this.spiHL = this.spiHw = this.spiHl = this.spiHC = this.spiHc = 0;
    this.spiTW = this.spiTL = this.spiTw = this.spiTl = this.spiTC = this.spiTc = 0;
    this.spiS = false;
    for (let i = 0; i < spis.length;) {
      if (spis[i] === 'S') {
        this.spiS = true;
        i++;
      } else if (i + 2 < spis.length && spis[i + 2] === '#') {
        this.bitOr(spis[i], spis[i + 1], 0x4);
        i += 3;
      } else if (i + 2 < spis.length && spis[i + 2] === '+') {
        this.bitOr(spis[i], spis[i + 1], 0x2);
        i += 3;
      } else {
        this.bitOr(spis[i], spis[i + 1], 0x1);
        i += 2;
      }
    }
  }

  private bitOr(ichi: string, ni: string, mask: number): void {
    const key = ichi + ni;
    const fieldMap: Record<string, () => void> = {
      HW: () => { this.spiHW |= mask; },
      HL: () => { this.spiHL |= mask; },
      Hw: () => { this.spiHw |= mask; },
      Hl: () => { this.spiHl |= mask; },
      HC: () => { this.spiHC |= mask; },
      Hc: () => { this.spiHc |= mask; },
      TW: () => { this.spiTW |= mask; },
      TL: () => { this.spiTL |= mask; },
      Tw: () => { this.spiTw |= mask; },
      Tl: () => { this.spiTl |= mask; },
      TC: () => { this.spiTC |= mask; },
      Tc: () => { this.spiTc |= mask; },
    };
    fieldMap[key]?.();
  }

  /** Whether harm is involved given context */
  isHarmInvolved(self: boolean, attend: boolean, debut: boolean, win: boolean, round: boolean): boolean {
    let value: number;
    if (debut && round) value = this.spiHC;
    else if (debut && !round) value = this.spiHc;
    else if (win && round) value = this.spiHW;
    else if (!win && round) value = this.spiHL;
    else if (win && !round) value = this.spiHw;
    else value = this.spiHl;

    if ((value & 0x1) !== 0) return true;
    if ((value & 0x2) !== 0 && attend) return true;
    if ((value & 0x4) !== 0 && self) return true;
    return false;
  }

  /** Whether harm team is involved */
  isHarmInvolvedTeam(debut: boolean, win: boolean, round: boolean): boolean {
    let value: number;
    if (debut && round) value = this.spiHC;
    else if (debut && !round) value = this.spiHc;
    else if (win && round) value = this.spiHW;
    else if (!win && round) value = this.spiHL;
    else if (win && !round) value = this.spiHw;
    else value = this.spiHl;
    return (value & 0x7) !== 0;
  }

  /** Whether tux is involved given context */
  isTuxInvolved(self: boolean, attend: boolean, debut: boolean, win: boolean, round: boolean): boolean {
    let value: number;
    if (debut && round) value = this.spiTC;
    else if (debut && !round) value = this.spiTc;
    else if (win && round) value = this.spiTW;
    else if (!win && round) value = this.spiTL;
    else if (win && !round) value = this.spiTw;
    else value = this.spiTl;

    if ((value & 0x1) !== 0) return true;
    if ((value & 0x2) !== 0 && attend) return true;
    if ((value & 0x4) !== 0 && self) return true;
    return false;
  }

  /** Whether monster causes silence */
  isSilence(): boolean {
    return this.spiS;
  }

  resetRam(): void { this.ram.clear(); }
  resetRfm(): void { this.resetRam(); this.rfm.clear(); }
  resetRom(): void { this.resetRfm(); this.rom.clear(); }

  /** Check if linked for consume type and inType */
  isLinked(consumeType: number, inType: number): boolean {
    return this.eaOccurs != null &&
      this.eaOccurs.length > consumeType &&
      this.eaOccurs[consumeType] != null &&
      this.eaOccurs[consumeType].length > inType &&
      this.eaOccurs[consumeType][inType].includes('%');
  }
}
