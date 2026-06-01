/**
 * Player class - Translation of C# PSD.Base.Player
 */
import { TuxType } from '@shared/types/enums';
import { Diva } from './utils/diva';
import { FiveElementHelper } from './card/five-element';
import { Algo } from './utils/algo';
import type { Hero } from './card/hero';
import type { Board } from './board';

export class Player {
  // Account info
  readonly name: string;
  readonly avatar: number;
  readonly uid: number;
  aUid = 0;
  hopeTeam = 0;

  // Property
  selectHero = 0;
  team = 0;
  readonly isReal: boolean;
  gender = 'M';

  // HP and battle
  hp = 0;
  hpBase = 0;
  sdASet = false;
  sdCSet = false;
  mSTRa = 0;
  mSTRb = 0;
  private _mSTRc = 0;
  strh = 0;
  mDEXa = 0;
  mDEXb = 0;
  private _mDEXc = 0;
  dexh = 0;
  strI = 0;
  dexI = 0;
  tuxLimit = 3;

  get strA(): number { return this.mSTRa >= 0 ? this.mSTRa : 0; }
  set strA(value: number) { this.mSTRa = value; }
  get strB(): number { return this.mSTRb >= 0 ? this.mSTRb : 0; }
  set strB(value: number) { this.mSTRb = value; }
  get strC(): number { return this._mSTRc; }
  set strC(value: number) { this._mSTRc = value >= 0 ? value : 0; }

  get dexA(): number { return this.mDEXa >= 0 ? this.mDEXa : 0; }
  set dexA(value: number) { this.mDEXa = value; }
  get dexB(): number { return this.mDEXb >= 0 ? this.mDEXb : 0; }
  set dexB(value: number) { this.mDEXb = value; }
  get dexC(): number { return this._mDEXc; }
  set dexC(value: number) { this._mDEXc = value >= 0 ? value : 0; }

  get str(): number { return this.sdCSet ? this.strC : (this.sdASet ? this.strA : this.strB); }
  get dex(): number { return this.sdCSet ? this.dexC : (this.sdASet ? this.dexA : this.dexB); }
  get oppTeam(): number { return 3 - this.team; }

  // Cards
  readonly tux: number[] = [];
  armor = 0;
  weapon = 0;
  trove = 0;
  exEquip = 0;
  readonly exCards: number[] = [];
  readonly fakeq = new Map<number, string>();
  readonly pets: number[];
  readonly escue: number[] = [];

  // Status
  isAlive = false;
  nineteen = false;
  private _isTared = false;
  immobilized = false;
  loved = false;
  petDisabled = false;
  restZP = 0;
  exMask = 0;
  fyMask = 0;
  readonly runes: number[] = [];
  readonly exSpouses: string[] = [];

  isRan = false;
  isZhu = false;

  // Card disabled system (bitmask)
  private cardDisabled = new Map<string, number>();
  private cardEffDisabled = new Map<string, number>();
  private mSilence = new Set<string>();

  // Memory system
  tokenAwake = false;
  tokenCount = 0;
  tokenTars: number[] = [];
  tokenExcl: string[] = [];
  tokenFold: number[] = [];
  readonly rom = new Diva();
  readonly rfm = new Diva();
  readonly ram = new Diva();
  readonly coss: number[] = []; // Stack<number> -> array used as stack
  guardian = 0;

  // Options
  isTPOpt = true;
  isSKOpt = true;
  isMyOpt = true;

  // Skills
  readonly skills = new Set<string>();

  // Price system
  readonly cz01PriceDict = new Map<string, string[]>();

  // Computed
  get isTared(): boolean { return this._isTared && this.uid !== 0 && this.isAlive && this.isReal; }
  set isTared(value: boolean) { this._isTared = value; }

  get singleTokenTar(): number { return this.tokenTars.length > 0 ? this.tokenTars[0] : 0; }

  constructor(name: string, avatar: number, uid: number, isReal = true) {
    this.name = name;
    this.avatar = avatar;
    this.uid = uid;
    this.isReal = isReal;
    this.pets = Algo.repeatToArray(0, FiveElementHelper.PropCount);
  }

  // Disabled level helpers
  private static setDisabledLevel(table: Map<string, number>, tag: string, value: boolean, maskCode: number): void {
    if (value) {
      const existing = table.get(tag);
      table.set(tag, (existing ?? 0) | maskCode);
    } else {
      const existing = table.get(tag);
      if (existing !== undefined) {
        const newVal = existing & ~maskCode;
        if (newVal === 0) table.delete(tag);
        else table.set(tag, newVal);
      }
    }
  }

  private static getDisabledLevel(table: Map<string, number>): number {
    let result = 0;
    for (const v of table.values()) result |= v;
    return result;
  }

  private setTuxEffDisabledLevel(tag: string, value: boolean, maskCode: number): void {
    Player.setDisabledLevel(this.cardEffDisabled, tag, value, maskCode);
  }

  private getTuxEffDisabledLevel(): number {
    return Player.getDisabledLevel(this.cardEffDisabled);
  }

  private setTuxDisabledLevel(tag: string, value: boolean, maskCode: number): void {
    Player.setDisabledLevel(this.cardDisabled, tag, value, maskCode);
  }

  private getTuxDisabledLevel(): number {
    return Player.getDisabledLevel(this.cardDisabled);
  }

  get equipDisabled(): boolean { return (this.getTuxEffDisabledLevel() & 7) !== 0; }
  setEquipDisabled(tag: string, value: boolean): void { this.setTuxEffDisabledLevel(tag, value, 7); }
  get weaponDisabled(): boolean { return (this.getTuxEffDisabledLevel() & 1) !== 0; }
  setWeaponDisabled(tag: string, value: boolean): void { this.setTuxEffDisabledLevel(tag, value, 1); }
  get armorDisabled(): boolean { return (this.getTuxEffDisabledLevel() & 2) !== 0; }
  setArmorDisabled(tag: string, value: boolean): void { this.setTuxEffDisabledLevel(tag, value, 2); }
  get troveDisabled(): boolean { return (this.getTuxEffDisabledLevel() & 4) !== 0; }
  setTroveDisabled(tag: string, value: boolean): void { this.setTuxEffDisabledLevel(tag, value, 4); }

  get zpDisabled(): boolean { return (this.getTuxDisabledLevel() & 1) !== 0; }
  setZPDisabled(tag: string, value: boolean): void { this.setTuxDisabledLevel(tag, value, 0x1); }
  get jpDisabled(): boolean { return (this.getTuxDisabledLevel() & 2) !== 0; }
  setJPDisabled(tag: string, value: boolean): void { this.setTuxDisabledLevel(tag, value, 0x2); }
  get tpDisabled(): boolean { return (this.getTuxDisabledLevel() & 4) !== 0; }
  setTPDisabled(tag: string, value: boolean): void { this.setTuxDisabledLevel(tag, value, 0x4); }
  get xpDisabled(): boolean { return (this.getTuxDisabledLevel() & 8) !== 0; }
  setXPDisabled(tag: string, value: boolean): void { this.setTuxDisabledLevel(tag, value, 0x8); }
  setAllTuxDisabled(tag: string, value: boolean): void { this.setTuxDisabledLevel(tag, value, 0xF); }

  // Silence system
  setSilence(tag: string): void { this.mSilence.add(tag); }
  resetSilence(tag: string): void { this.mSilence.delete(tag); }
  get isSilenced(): boolean { return this.mSilence.size > 0; }

  // Pet count
  getPetCount(): number {
    return this.pets.filter(p => p !== 0).length;
  }

  // Reset methods
  resetStatus(): void {
    this.immobilized = false;
    this.cardDisabled.clear();
    this.cardEffDisabled.clear();
    this.mSilence.clear();
    this.petDisabled = false;
    this.loved = false;
    this.dexI = 0;
    this.strI = 0;
  }

  resetRam(hero = 0): void {
    const newDiva = new Diva();
    if (hero !== 0) {
      for (const key of this.ram.getKeys()) {
        if (key.startsWith('@') && !key.startsWith('@' + hero)) {
          newDiva.set(key, this.ram.getObject(key));
        }
      }
      (this as { ram: Diva }).ram = newDiva;
    } else {
      this.ram.clear();
    }
  }

  resetRfm(hero = 0): void {
    this.resetRam(hero);
    const newDiva = new Diva();
    if (hero !== 0) {
      for (const key of this.rfm.getKeys()) {
        if (key.startsWith('@') && !key.startsWith('@' + hero)) {
          newDiva.set(key, this.rfm.getObject(key));
        }
      }
      (this as { rfm: Diva }).rfm = newDiva;
    } else {
      this.rfm.clear();
    }
  }

  resetTokens(): void {
    this.tokenAwake = false;
    this.tokenCount = 0;
    this.tokenExcl = [];
    this.tokenTars = [];
    this.tokenFold = [];
  }

  resetRom(board: Board, hero = 0): void {
    this.resetTokens();
    for (const cd of this.tokenExcl) {
      if (cd.startsWith('H')) {
        const heroSwal = parseInt(cd.substring(1), 10);
        const idx = board.bannedHero.indexOf(heroSwal);
        if (idx !== -1) board.bannedHero.splice(idx, 1);
      }
    }
    this.resetRfm(hero);
    const newDiva = new Diva();
    if (hero !== 0) {
      for (const key of this.rom.getKeys()) {
        if (key.startsWith('@') && !key.startsWith('@' + hero)) {
          newDiva.set(key, this.rom.getObject(key));
        }
      }
      (this as { rom: Diva }).rom = newDiva;
    } else {
      this.rom.clear();
    }
  }

  // Init from hero
  initFromHero(hero: Hero, reset: boolean, sdASet: boolean, sdCSet: boolean): void {
    this.gender = hero.gender;
    this.strh = this.strB = hero.str;
    this.dexh = this.dexB = hero.dex;
    this.sdASet = sdASet;
    this.sdCSet = sdCSet;
    this.strI = 0;
    this.dexI = 0;
    if (reset) {
      this.skills.clear();
      this.isAlive = true;
      this.nineteen = false;
      this.isTared = true;
      this.petDisabled = false;
      this.immobilized = false;
      this.hp = this.hpBase = hero.hp;
      this.loved = false;
      this.tuxLimit = 3;
    }
  }

  // Card operations
  removeCard(card: number, discards: number[]): boolean {
    if (this.tux.includes(card)) {
      this.tux.splice(this.tux.indexOf(card), 1);
      discards.push(card);
      return true;
    }
    if (this.armor === card) { this.armor = 0; discards.push(card); return true; }
    if (this.weapon === card) { this.weapon = 0; discards.push(card); return true; }
    if (this.trove === card) { this.trove = 0; discards.push(card); return true; }
    if (this.exEquip === card) { this.exEquip = 0; discards.push(card); return true; }
    if (this.exCards.includes(card)) {
      this.exCards.splice(this.exCards.indexOf(card), 1);
      discards.push(card);
      return true;
    }
    if (this.fakeq.has(card)) {
      this.fakeq.delete(card);
      discards.push(card);
      return true;
    }
    return false;
  }

  hasAnyCards(): boolean {
    return this.tux.length > 0 || this.hasAnyEquips();
  }

  hasAnyEquips(): boolean {
    return this.weapon !== 0 || this.armor !== 0 || this.trove !== 0 ||
      this.exEquip !== 0 || this.exCards.length > 0 || this.fakeq.size > 0;
  }

  hasCard(ut: number): boolean {
    return this.tux.includes(ut) || this.weapon === ut || this.armor === ut ||
      this.trove === ut || this.exEquip === ut || this.exCards.includes(ut) ||
      this.fakeq.has(ut);
  }

  hasCards(uts: Iterable<number>): boolean {
    for (const ut of uts) {
      if (!this.hasCard(ut)) return false;
    }
    return true;
  }

  listOutAllCards(): number[] {
    const result: number[] = [...this.tux];
    result.push(...this.listOutAllEquips());
    return result;
  }

  listOutAllEquips(): number[] {
    const result = this.listOutAllBaseEquip();
    result.push(...this.exCards);
    result.push(...this.fakeq.keys());
    return result;
  }

  listOutAllBaseEquip(): number[] {
    const result: number[] = [];
    if (this.weapon !== 0) result.push(this.weapon);
    if (this.armor !== 0) result.push(this.armor);
    if (this.trove !== 0) result.push(this.trove);
    if (this.exEquip !== 0) result.push(this.exEquip);
    return result;
  }

  listOutAllTuxsWithEncrypt(): number[] {
    return new Array(this.tux.length).fill(0);
  }

  listOutAllCardsWithEncrypt(): number[] {
    const result = this.listOutAllTuxsWithEncrypt();
    result.push(...this.listOutAllEquips());
    return result;
  }

  listOutAllCardsWithEncryptExcept(except: number[]): number[] {
    const result: number[] = [];
    for (const ut of this.tux) {
      if (!except.includes(ut)) result.push(0);
    }
    for (const ut of this.listOutAllEquips()) {
      if (!except.includes(ut)) result.push(ut);
    }
    return result;
  }

  getBaseEquipCount(): number {
    return (this.weapon !== 0 ? 1 : 0) + (this.armor !== 0 ? 1 : 0) +
      (this.trove !== 0 ? 1 : 0) + (this.exEquip !== 0 ? 1 : 0);
  }

  getEquipCount(): number {
    return this.getBaseEquipCount() + this.exCards.length + this.fakeq.size;
  }

  getAllCardsCount(): number {
    return this.tux.length + this.getEquipCount();
  }

  isValidPlayer(): boolean {
    return this.uid !== 0 && this.isAlive && this.isReal;
  }

  getSlotCapacity(tuxType: TuxType): number {
    let mask = 0;
    if (tuxType === TuxType.WQ) mask = 0x1;
    else if (tuxType === TuxType.FJ) mask = 0x2;
    else if (tuxType === TuxType.XB) mask = 0x4;
    return 1 + ((this.exMask & mask) === 0 ? 0 : 1) + ((this.fyMask & mask) === 0 ? 0 : -1);
  }

  getCurrentEquipCount(tuxType: TuxType): number {
    const cap = this.getSlotCapacity(tuxType);
    if (cap === 0) return 0;
    const ext = (cap === 2 && this.exEquip !== 0) ? 1 : 0;
    if (tuxType === TuxType.WQ) return (this.weapon !== 0 ? 1 : 0) + ext;
    if (tuxType === TuxType.FJ) return (this.armor !== 0 ? 1 : 0) + ext;
    if (tuxType === TuxType.XB) return (this.trove !== 0 ? 1 : 0) + ext;
    return 0;
  }

  // Price system
  clearPrice(): void {
    this.cz01PriceDict.clear();
  }

  addToPrice(tuxCode: string, inEq: boolean, reason: string, type: string, price: number): void {
    const prefix = (inEq ? '{E}' : '') + tuxCode;
    const existing = this.cz01PriceDict.get(prefix);
    if (existing) {
      existing.push(`${reason},${type},${price}`);
    } else {
      this.cz01PriceDict.set(prefix, [`${reason},${type},${price}`]);
    }
  }

  removeFromPrice(tuxCode: string, inEq: boolean, reason: string): void {
    const prefix = (inEq ? '{E}' : '') + tuxCode;
    const existing = this.cz01PriceDict.get(prefix);
    if (existing) {
      const filtered = existing.filter(p => !p.startsWith(reason + ','));
      if (filtered.length === 0) {
        this.cz01PriceDict.delete(prefix);
      } else {
        this.cz01PriceDict.set(prefix, filtered);
      }
    }
  }

  getPrice(tuxCode: string, inEq: boolean): number {
    const prefix = (inEq ? '{E}' : '') + tuxCode;
    let zero = 0;
    const entries = this.cz01PriceDict.get(prefix);
    if (entries) {
      for (const line of entries) {
        const lines = line.split(',');
        const value = parseInt(lines[2], 10);
        if (lines[1] === '!') return value;
        else if (lines[1] === '=') zero = value > zero ? value : zero;
        else if (lines[1] === '+') zero += value;
        else if (lines[1] === '-') zero -= value;
      }
    }
    return zero < 0 ? 0 : zero;
  }

  // Stack operations for coss
  cossPush(value: number): void { this.coss.push(value); }
  cossPop(): number | undefined { return this.coss.pop(); }
  cossPeek(): number | undefined { return this.coss.length > 0 ? this.coss[this.coss.length - 1] : undefined; }

  // Static factory method
  static warriors(name: string, extUid: number, team: number, str: number, agl: number): Player {
    const p = new Player(name, 0, extUid, false);
    p.strB = str;
    p.dexB = agl;
    p.isAlive = false;
    p.team = team;
    return p;
  }

  // Player comparator for dictionary keys
  static playerEquals(a: Player, b: Player): boolean {
    return a === b;
  }

  static playerHashCode(p: Player): number {
    return p.uid;
  }
}
