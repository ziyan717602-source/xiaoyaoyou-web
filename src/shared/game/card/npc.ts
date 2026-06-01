/**
 * NPC class - Translation of C# PSD.Base.Card.NPC
 */
import type { NMB } from './nmb';
import type { Player } from '../player';

export type NpcDebutDelegate = (trigger: Player) => void;
const DefNpcDebut: NpcDebutDelegate = () => {};

export class Npc implements NMB {
  readonly name: string;
  readonly code: string;
  readonly group: number;
  readonly gender: string;
  readonly genre: number;

  private _mSTR: number;
  get str(): number { return this._mSTR >= 0 ? this._mSTR : 0; }
  set str(value: number) { this._mSTR = value; }
  readonly strb: number;
  readonly agl = 0; // NPCs always have 0 AGL

  readonly skills: string[];
  readonly hero: number;
  debutText = '';
  romUshort = 0;

  private _debut: NpcDebutDelegate | null = null;
  get debut(): NpcDebutDelegate { return this._debut ?? DefNpcDebut; }
  set debut(handler: NpcDebutDelegate) { this._debut = handler; }

  constructor(
    code: string,
    group: number,
    genre: number,
    name: string,
    str: number,
    skills: string[],
    hero: number,
    gender: string,
  ) {
    this.name = name;
    this.code = code;
    this.group = group;
    this.genre = genre;
    this._mSTR = str;
    this.strb = str;
    this.skills = skills;
    this.hero = hero;
    this.gender = gender;
  }

  isMonster(): boolean { return false; }
  isNpc(): boolean { return true; }

  /** Force change attribute for version compatibility */
  forceChange(field: string, value: unknown): void {
    if (field === 'Code' && typeof value === 'string') {
      (this as { code: string }).code = value;
    }
  }
}
