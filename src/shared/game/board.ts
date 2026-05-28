/**
 * Board class - Translation of C# PSD.Base.Board
 */
import { Rueue } from './utils/rueue';
import { Algo } from './utils/algo';
import type { NMB } from './card/nmb';
import { Player } from './player';
import type { LibGroup } from './lib-group';

export class Board {
  readonly garden = new Map<number, Player>();

  private mRounder: Player | null = null;
  private mHinder: Player | null = null;
  private mSupporter: Player | null = null;
  private mHorn: Player | null = null;

  get rounder(): Player { return this.mRounder ?? this.ghost; }
  set rounder(player: Player | null) { this.mRounder = player ?? null; }

  roundIN = '';
  supportSucc = false;
  hinderSucc = false;
  readonly posHinders: string[] = [];
  readonly posSupporters: string[] = [];
  allowNoSupport = false;
  allowNoHinder = false;
  readonly rDrums = new Map<Player, boolean>();
  readonly oDrums = new Map<Player, boolean>();
  clockWised = true;
  inCampaign = false;
  poolEnabled = false;
  playerPoolEnabled = false;
  isMonsterDebut = false;
  rPool = 0;
  oPool = 0;
  readonly rPoolGain = new Map<string, number>();
  readonly oPoolGain = new Map<string, number>();
  isBattleWin = false;
  poolDelta = 0;
  mon1Catchable = false;
  mon2Catchable = false;
  monster1 = 0;
  monster2 = 0;
  mon1From = 0;
  readonly wang: number[] = [];
  battler: NMB | null = null;
  eve = 0;
  useCardRound = 0;
  fightTangled = false;
  diceValue = 0;
  readonly pZone: number[] = [];
  readonly csPets: string[] = [];
  readonly csEquips: string[] = [];

  // Card piles
  tuxPiles = new Rueue<number>();
  evePiles = new Rueue<number>();
  monPiles = new Rueue<number>();
  tuxDises: number[] = [];
  eveDises: number[] = [];
  monDises: number[] = [];
  heroPiles = new Rueue<number>();
  restNpcPiles = new Rueue<number>();
  restMonPiles = new Rueue<number>();
  heroDises: number[] = [];
  restNpcDises: number[] = [];
  restMonDises: number[] = [];

  // Bans and protections
  readonly bannedHero: number[] = [];
  readonly protectedTux: number[] = [];
  readonly pendingTux = new Rueue<string>();
  readonly petProtectedPlayer: number[] = [];
  readonly escueBanned = new Set<string>();
  readonly silence = new Set<string>();
  readonly jumpTable = new Map<string, string>();

  // Scores
  finalAkaScore = 0;
  finalAoScore = 0;

  // Ghost player sentinel
  readonly ghost: Player;

  constructor() {
    this.ghost = new Player('鬼', 0, 0, false);
  }

  /** Get the opponent of a player */
  getOpponent(player: Player): Player {
    let mycount = 0;
    let opcount = 0;
    const list = [...this.garden.keys()].sort((a, b) => a - b);
    if (!this.clockWised) list.reverse();

    for (const ut of list) {
      const py = this.garden.get(ut)!;
      if (py.team === player.team) {
        mycount++;
        if (py.uid === player.uid) break;
      }
    }

    let next = false;
    for (const ut of list) {
      const py = this.garden.get(ut)!;
      if (py.team === player.oppTeam) {
        opcount++;
        if (next && py.isAlive) return py;
        if (opcount === mycount) {
          if (py.isAlive) return py;
          else next = true;
        }
      }
    }

    for (const ut of list) {
      const py = this.garden.get(ut)!;
      if (py.isAlive && py.team === player.oppTeam) return py;
    }

    return this.ghost;
  }

  get opponent(): Player {
    return this.getOpponent(this.rounder);
  }

  get hinder(): Player { return this.mHinder ?? this.ghost; }
  set hinder(player: Player | null) { this.mHinder = player ?? null; }

  get supporter(): Player { return this.mSupporter ?? this.ghost; }
  set supporter(player: Player | null) { this.mSupporter = player ?? null; }

  get horn(): Player { return this.mHorn ?? this.ghost; }
  set horn(player: Player | null) { this.mHorn = player ?? null; }

  /** Get the face-to-face player */
  facer(player: Player): Player {
    const uhd = Math.floor(((player.uid + 1) / 2) * 4) - 1 - player.uid;
    if (uhd > 6) return this.ghost;
    return this.garden.get(uhd) ?? this.ghost;
  }

  /** Check if player is attending the battle */
  isAttendWar(player: Player): boolean {
    return player.uid === this.rounder.uid || player.uid === this.hinder.uid ||
      player.uid === this.supporter.uid || this.rDrums.has(player) ||
      this.oDrums.has(player);
  }

  /** Check if player successfully attended the battle */
  isAttendWarSucc(player: Player): boolean {
    return player.uid === this.rounder.uid ||
      (player.uid === this.hinder.uid && this.hinderSucc) ||
      (player.uid === this.supporter.uid && this.supportSucc) ||
      (this.rDrums.has(player) && this.rDrums.get(player)!) ||
      (this.oDrums.has(player) && this.oDrums.get(player)!);
  }

  /** Get all drum UIDs */
  get drumUts(): number[] {
    return [
      ...[...this.rDrums.keys()].map(p => p.uid),
      ...[...this.oDrums.keys()].map(p => p.uid),
    ];
  }

  /** Get all battle attenders */
  getAllAttenders(): Player[] {
    const pys: Player[] = [this.rounder];
    if (this.supporter.uid !== 0) pys.push(this.supporter);
    if (this.hinder.uid !== 0) pys.push(this.hinder);
    pys.push(...this.rDrums.keys());
    pys.push(...this.oDrums.keys());
    return pys;
  }

  // Battle calculations
  calculateRPool(): number {
    const rDrumStr = [...this.rDrums.entries()]
      .filter(([_, v]) => v)
      .reduce((sum, [p]) => sum + p.str, 0);
    return Math.max(
      this.rounder.str + this.rPool +
        (this.supportSucc ? this.supporter.str : 0) + rDrumStr, 0);
  }

  calculateOPool(): number {
    const battlerStr = this.battler?.str ?? 0;
    const oDrumStr = [...this.oDrums.entries()]
      .filter(([_, v]) => v)
      .reduce((sum, [p]) => sum + p.str, 0);
    return Math.max(
      battlerStr + this.oPool +
        (this.hinderSucc ? this.hinder.str : 0) + oDrumStr, 0);
  }

  isRounderBattleWin(): boolean {
    for (const py of this.garden.values()) {
      if (py.isAlive && py.strI < 0) return py.team === this.rounder.oppTeam;
      if (py.isAlive && py.strI > 0) return py.team === this.rounder.team;
    }
    return this.calculateRPool() >= this.calculateOPool();
  }

  cleanBattler(): void {
    this.supporter = null;
    this.hinder = null;
    this.supportSucc = false;
    this.hinderSucc = false;
    this.rDrums.clear();
    this.oDrums.clear();
    this.escueBanned.clear();
    this.silence.clear();
  }

  // Player ordering
  orderedPlayer(start?: number): number[] {
    const uid = start ?? this.rounder.uid;
    const list: number[] = [];
    if (this.garden.size >= 1) {
      let idx = uid;
      do {
        list.push(idx);
        if (this.clockWised) ++idx;
        else --idx;
        while (idx > this.garden.size) idx -= this.garden.size;
        while (idx <= 0) idx += this.garden.size;
      } while (idx !== uid);
    }
    return list;
  }

  getNextPlayer(rounder: number): number {
    const ordered = this.orderedPlayer();
    for (const p of ordered) {
      if (p !== rounder && this.garden.get(p)?.isAlive) return p;
    }
    return 0;
  }

  getPrevPlayer(rounder: number): number {
    const ordered = this.orderedPlayer().reverse();
    for (const p of ordered) {
      if (p !== rounder && this.garden.get(p)?.isAlive) return p;
    }
    return 0;
  }

  reOrderedPlayers(players: Iterable<number>): number[] {
    const order = this.orderedPlayer();
    const result: number[] = [];
    for (const py of order) {
      for (const p of players) {
        if (p === py) {
          result.push(py);
          break;
        }
      }
    }
    return result;
  }

  // Serialization
  static readonly StatusKey = [
    'I,hero', 'I,state', 'U,hp', 'U,hpa', 'U,str',
    'U,stra', 'U,dex', 'U,dexa', 'I,tuxCount', 'U,wp', 'U,am', 'U,tr', 'U,exq', 'LA,lug', 'U,guard',
    'U,coss', 'LU,pet', 'LU,excard', 'LU,rune', 'LD,fakeq', 'I,token', 'LA,excl', 'LU,tar', 'U,awake',
    'I,foldsz', 'LU,escue',
  ];

  toSerialMessage(tuple: LibGroup): string {
    const uList: unknown[] = [];
    for (const py of this.garden.values()) {
      uList.push(py.uid);
      for (const keyPair of Board.StatusKey) {
        const serp = keyPair.indexOf(',');
        const key = keyPair.substring(serp + 1);
        switch (key) {
          case 'hero': uList.push(py.selectHero); break;
          case 'state': {
            let state = 0;
            state |= py.isAlive ? 1 : 0;
            state |= py.loved ? 2 : 0;
            state |= py.immobilized ? 4 : 0;
            state |= py.petDisabled ? 8 : 0;
            uList.push(state);
            break;
          }
          case 'hp': uList.push(py.hp); break;
          case 'hpa': uList.push(py.hpBase); break;
          case 'str': uList.push(py.str); break;
          case 'stra': uList.push(this.poolEnabled ? py.strA : py.str); break;
          case 'dex': uList.push(py.dex); break;
          case 'dexa': uList.push(this.poolEnabled ? py.dexA : py.dex); break;
          case 'tuxCount': uList.push(py.tux.length); break;
          case 'wp': uList.push(py.weapon); break;
          case 'am': uList.push(py.armor); break;
          case 'tr': uList.push(py.trove); break;
          case 'exq': uList.push(py.exEquip); break;
          case 'lug': {
            const lug = tuple.tl.decodeTux(py.trove);
            uList.push(lug !== null && 'capacities' in lug ? Algo.listToString((lug as { capacities: string[] }).capacities) : '0');
            break;
          }
          case 'guard': uList.push(py.guardian); break;
          case 'coss': uList.push(py.cossPeek() ?? 0); break;
          case 'pet':
            uList.push(Algo.listToString(py.pets.filter(p => p !== 0)));
            break;
          case 'excard': uList.push(Algo.listToString(py.exCards)); break;
          case 'token': uList.push(py.tokenCount); break;
          case 'fakeq':
            uList.push(Algo.listToString([...py.fakeq.entries()].map(([k, v]) => `${k},${v}`)));
            break;
          case 'rune': uList.push(Algo.listToString(py.runes)); break;
          case 'excl': uList.push(Algo.listToString(py.tokenExcl)); break;
          case 'tar': uList.push(Algo.listToString(py.tokenTars)); break;
          case 'awake': uList.push(py.tokenAwake ? 1 : 0); break;
          case 'foldsz': uList.push(py.tokenFold.length); break;
          case 'escue': uList.push(Algo.listToString(py.escue)); break;
        }
      }
    }
    return uList.length > 0 ? ('H09G,' + uList.join(',')) : '';
  }

  generateSerialFieldMessage(): string {
    const parts: string[] = [];
    parts.push(`${this.tuxPiles.count},${this.monPiles.count},${this.evePiles.count},` +
      `${this.tuxDises.length},${this.monDises.length},${this.eveDises.length}`);
    parts.push(`${this.rounder != null ? this.rounder.uid : 0}`);
    parts.push(`${this.supporter.uid},${this.supportSucc || !this.poolEnabled ? 1 : 0}`);
    parts.push(`${this.hinder.uid},${this.hinderSucc || !this.poolEnabled ? 1 : 0}`);

    const drums = [
      ...[...this.rDrums.entries()].map(([p, v]) => `${p.uid},${v || !this.poolEnabled ? 1 : 0}`),
      ...[...this.oDrums.entries()].map(([p, v]) => `${p.uid},${v || !this.poolEnabled ? 1 : 0}`),
    ];
    parts.push(Algo.listToString(drums));

    const wangVal = this.wang.length !== 0 ? this.wang[this.wang.length - 1] : 0;
    parts.push(`${wangVal},${this.monster1},${this.monster2},${this.eve}`);

    if (this.poolEnabled) {
      parts.push(`${this.rounder.team},${this.calculateRPool()},${this.rounder.oppTeam},${this.calculateOPool()}`);
    } else {
      parts.push(`${this.rounder.team},0,${this.rounder.oppTeam},0`);
    }

    return parts.join(',');
  }

  generatePrivateMessage(ut: number): string {
    const py = this.garden.get(ut)!;
    const h09f: string[] = [];
    h09f.push(Algo.listToString(py.tux));
    h09f.push(Algo.listToString(py.tokenFold));
    h09f.push(Algo.listToString([...py.skills]));
    return h09f.join(',');
  }
}
