/**
 * TuxEquip class - Translation of C# PSD.Base.Card.TuxEqiup
 * Inherits from Tux, represents equipment cards
 */
import { TuxType } from '@shared/types/enums';
import { Tux } from './tux';
import { Diva } from '../utils/diva';
import { Algo } from '../utils/algo';
import type { Player } from '../player';

// Equipment-specific delegate types
export type CrActionDelegate = (player: Player) => void;
export type CsActionDelegate = (player: Player, consumeType: number, type: number, fuse: string, argst: string) => void;
export type CsActionHolderDelegate = (provider: Player, user: Player, consumeType: number, type: number, fuse: string, argst: string) => void;
export type CsValidDelegate = (player: Player, consumeType: number, type: number, fuse: string) => boolean;
export type CsValidHolderDelegate = (provider: Player, user: Player, consumeType: number, type: number, fuse: string) => boolean;
export type CsInputDelegate = (player: Player, consumeType: number, type: number, fuse: string, prev: string) => string;
export type CsInputHolderDelegate = (provider: Player, user: Player, consumeType: number, type: number, fuse: string, prev: string) => string;
export type CsUseActionDelegate = (cardUt: number, player: Player, source: number) => void;

const DefCrAction: CrActionDelegate = () => {};
const DefCsAction: CsActionDelegate = () => {};
const DefCsActionHolder: CsActionHolderDelegate = () => {};
const DefCsValid: CsValidDelegate = () => true;
const DefCsValidHolder: CsValidHolderDelegate = () => true;
const DefCsInput: CsInputDelegate = () => '';
const DefCsInputHolder: CsInputHolderDelegate = () => '';
const DefCsUseAction: CsUseActionDelegate = () => {};

export class TuxEquip extends Tux {
  incrOfSTR = 0;
  incrOfDEX = 0;
  singleEntry = 0;
  rfm = new Diva();

  csPriorities: number[][] | null = null;
  csOccur: string[][] | null = null;
  csLock: boolean[][] | null = null;
  csOnce: boolean[][] | null = null;
  csIsTermini: boolean[][] | null = null;
  csHind: boolean[][] | null = null;

  private _incrAction: CrActionDelegate | null = null;
  get incrAction(): CrActionDelegate { return this._incrAction ?? DefCrAction; }
  set incrAction(handler: CrActionDelegate) { this._incrAction = handler; }

  private _decrAction: CrActionDelegate | null = null;
  get decrAction(): CrActionDelegate { return this._decrAction ?? DefCrAction; }
  set decrAction(handler: CrActionDelegate) { this._decrAction = handler; }

  private _insAction: CrActionDelegate | null = null;
  get insAction(): CrActionDelegate { return this._insAction ?? DefCrAction; }
  set insAction(handler: CrActionDelegate) { this._insAction = handler; }

  private _delAction: CrActionDelegate | null = null;
  get delAction(): CrActionDelegate { return this._delAction ?? DefCrAction; }
  set delAction(handler: CrActionDelegate) { this._delAction = handler; }

  private _consumeAction: CsActionDelegate | null = null;
  get consumeAction(): CsActionDelegate { return this._consumeAction ?? DefCsAction; }
  set consumeAction(handler: CsActionDelegate) { this._consumeAction = handler; }

  private _consumeActionHolder: CsActionHolderDelegate | null = null;
  get consumeActionHolder(): CsActionHolderDelegate { return this._consumeActionHolder ?? DefCsActionHolder; }
  set consumeActionHolder(handler: CsActionHolderDelegate) { this._consumeActionHolder = handler; }

  private _consumeInput: CsInputDelegate | null = null;
  get consumeInput(): CsInputDelegate { return this._consumeInput ?? DefCsInput; }
  set consumeInput(handler: CsInputDelegate) { this._consumeInput = handler; }

  private _consumeInputHolder: CsInputHolderDelegate | null = null;
  get consumeInputHolder(): CsInputHolderDelegate { return this._consumeInputHolder ?? DefCsInputHolder; }
  set consumeInputHolder(handler: CsInputHolderDelegate) { this._consumeInputHolder = handler; }

  private _consumeValid: CsValidDelegate | null = null;
  get consumeValid(): CsValidDelegate { return this._consumeValid ?? DefCsValid; }
  set consumeValid(handler: CsValidDelegate) { this._consumeValid = handler; }

  private _consumeValidHolder: CsValidHolderDelegate | null = null;
  get consumeValidHolder(): CsValidHolderDelegate { return this._consumeValidHolder ?? DefCsValidHolder; }
  set consumeValidHolder(handler: CsValidHolderDelegate) { this._consumeValidHolder = handler; }

  private _useAction: CsUseActionDelegate | null = null;
  get useAction(): CsUseActionDelegate { return this._useAction ?? DefCsUseAction; }
  set useAction(handler: CsUseActionDelegate) { this._useAction = handler; }

  constructor(
    name: string,
    code: string,
    genre: number,
    type: TuxType,
    description: string,
    special: Record<string, string>,
    growup: string,
  ) {
    super(name, code, genre, type, description, special);

    const getValue = (ch: string): number => {
      const index = growup.indexOf(ch);
      if (index < 0) return 0;
      if (growup[index + 1] === '-') {
        return parseInt(Algo.substring(growup, index + 1, index + 3), 10);
      }
      return parseInt(Algo.substring(growup, index + 1, index + 2), 10);
    };

    this.incrOfSTR = getValue('A');
    this.incrOfDEX = getValue('X');
  }

  override isTuxEquip(): boolean { return true; }
  isLuggage(): boolean { return false; }
  isIllusion(): boolean { return false; }

  resetRFM(): void {
    this.rfm.clear();
  }

  override occurString(): string {
    let ocr = '';
    if (this.occurs != null) {
      ocr += this.occurs.join(',');
    } else {
      ocr += '^';
    }
    if (this.csOccur != null) {
      ocr += ';' + this.csOccur.map(p => (p != null) ? p.join(',') : '^').join(';');
    } else {
      ocr += '^';
    }
    return ocr;
  }

  /** Check if linked for consume type and inType */
  isLinkedConsume(consumeType: number, inType: number): boolean {
    return this.csOccur != null && this.csOccur.length > consumeType &&
      this.csOccur[consumeType] != null &&
      this.csOccur[consumeType].length > inType &&
      this.csOccur[consumeType][inType].includes('%');
  }

  override parse(
    countStr: string,
    occurStr: string,
    parasitismStr: string,
    priorStr: string,
    tarStr: string,
    tmhdstr: string,
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

    // Parse occur string with consume sections (separated by ;)
    const occurStrs = occurStr.split(';');
    if (occurStrs.length > 1) {
      this.csOccur = [];
      this.csLock = [];
    }
    for (let i = 0; i < occurStrs.length; i++) {
      if (occurStrs[i] && occurStrs[i] !== '^') {
        if (i === 0) {
          this.occurs = occurStrs[i].split(',');
        } else {
          const occurs = occurStrs[i].split(',');
          const csOccurRow: string[] = [];
          const csLockRow: boolean[] = [];
          for (const o of occurs) {
            if (o.startsWith('!')) {
              csOccurRow.push(o.substring(1));
              csLockRow.push(true);
            } else {
              csOccurRow.push(o);
              csLockRow.push(false);
            }
          }
          if (this.csOccur) this.csOccur.push(csOccurRow);
          if (this.csLock) this.csLock.push(csLockRow);
        }
      }
    }

    if (parasitismStr && parasitismStr !== '^') {
      this.parasitism = parasitismStr.split('&');
    } else {
      this.parasitism = [];
    }

    // Parse priority string with consume sections
    const priorStrs = priorStr.split(';');
    if (priorStrs.length > 1) {
      this.csPriorities = [];
      this.csOnce = [];
    }
    for (let i = 0; i < priorStrs.length; i++) {
      if (priorStrs[i] && priorStrs[i] !== '^') {
        if (i === 0) {
          this.priorities = priorStrs[i].split(',').map(p => parseInt(p, 10));
        } else {
          const priors = priorStrs[i].split(',');
          const csPriorRow: number[] = [];
          const csOnceRow: boolean[] = [];
          for (const p of priors) {
            if (p.startsWith('!')) {
              csPriorRow.push(parseInt(p.substring(1), 10));
              csOnceRow.push(true);
            } else {
              csPriorRow.push(parseInt(p, 10));
              csOnceRow.push(false);
            }
          }
          if (this.csPriorities) this.csPriorities.push(csPriorRow);
          if (this.csOnce) this.csOnce.push(csOnceRow);
        }
      }
    }

    // Parse targets
    if (tarStr) {
      this.targets = tarStr.split(',').map(t => t[0]);
    }

    // Parse termini/hind string
    const tmhd = tmhdstr.split(';');
    if (tmhd.length > 1) {
      this.csIsTermini = [];
      this.csHind = [];
    }
    for (let i = 0; i < tmhd.length; i++) {
      if (tmhd[i] && tmhd[i] !== '^') {
        if (i === 0) {
          this.isTermini = tmhd[i].split(',').map(t => t[0] === '1');
        } else {
          const trs = tmhd[i].split(',');
          const csTerminiRow: boolean[] = [];
          const csHindRow: boolean[] = [];
          for (const t of trs) {
            const val = parseInt(t, 10);
            csTerminiRow.push((val & 1) !== 0);
            csHindRow.push((val & 2) !== 0);
          }
          if (this.csIsTermini) this.csIsTermini.push(csTerminiRow);
          if (this.csHind) this.csHind.push(csHindRow);
        }
      }
    }

    this.dbSerial = dbSerial;
  }
}
