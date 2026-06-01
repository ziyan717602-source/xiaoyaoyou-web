/**
 * Evenement class - Translation of C# PSD.Base.Card.Evenement
 */
import type { Player } from '../player';

export type EveActionDelegate = (player: Player) => void;
export type EveValidDelegate = () => boolean;

const DefEveAction: EveActionDelegate = () => {};
const DefEveValid: EveValidDelegate = () => true;

export class Evenement {
  readonly name: string;
  readonly code: string;
  readonly range: number[];
  readonly background: string;
  readonly description: string;
  readonly group: number;
  readonly genre: number;

  occurs: string[] = [];
  priorties: number[] = [];
  isOnce: boolean[] = [];
  isTermini: boolean[] = [];
  lock: boolean[] = [];

  private spi = 0;

  private _action: EveActionDelegate | null = null;
  get action(): EveActionDelegate { return this._action ?? DefEveAction; }
  set action(handler: EveActionDelegate) { this._action = handler; }

  private _pers: EveActionDelegate | null = null;
  get pers(): EveActionDelegate { return this._pers ?? DefEveAction; }
  set pers(handler: EveActionDelegate) { this._pers = handler; }

  private _persValid: EveValidDelegate | null = null;
  get persValid(): EveValidDelegate { return this._persValid ?? DefEveValid; }
  set persValid(handler: EveValidDelegate) { this._persValid = handler; }

  constructor(
    name: string,
    code: string,
    range: string,
    group: number,
    genre: number,
    background: string,
    description: string,
    spis: string,
  ) {
    this.name = name;
    this.code = code;
    this.range = range.split(',').map(p => parseInt(p, 10));
    this.background = background;
    this.group = group;
    this.genre = genre;
    this.description = description;

    // Parse SPI
    this.spi = 0;
    for (let i = 0; i < spis.length; i++) {
      if (spis[i] === 'H') {
        this.spi |= 0x1;
      } else if (spis[i] === 'T') {
        if (i + 1 < spis.length && spis[i + 1] === '#') {
          this.spi |= 0x4;
          i++;
        } else {
          this.spi |= 0x2;
        }
      } else if (spis[i] === 'S') {
        this.spi |= 0x8;
      }
    }
  }

  /** Check if harm is involved */
  isHarmInvolved(): boolean {
    return (this.spi & 0x1) !== 0;
  }

  /** Check if tux is involved */
  isTuxInvolved(_self: boolean): boolean {
    if ((this.spi & 0x2) !== 0) return true;
    return (this.spi & 0x4) !== 0;
  }

  /** Check if silence */
  isSilence(): boolean {
    return (this.spi & 0x8) !== 0;
  }
}
