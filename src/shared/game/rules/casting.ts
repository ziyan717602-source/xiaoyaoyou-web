/**
 * Casting classes - Translation of C# PSD.Base.Rules.Casting
 */

export abstract class Casting {
  static readonly playerCapacity = 6;
}

export class CastingPick extends Casting {
  readonly xuan = new Map<number, number[]>();
  readonly huan = new Map<number, number[]>();
  readonly ding = new Map<number, number>();

  constructor() {
    super();
    for (let i = 1; i <= Casting.playerCapacity; i++) {
      this.ding.set(i, 0);
    }
  }

  init(ut: number, xuan: number[], huan?: number[]): void {
    this.xuan.set(ut, [...xuan]);
    if (huan) {
      this.huan.set(ut, [...huan]);
    }
  }

  pick(ut: number, which: number): boolean {
    const x = this.xuan.get(ut);
    if (x && x.includes(which)) {
      x.splice(x.indexOf(which), 1);
      this.ding.set(ut, which);
      return true;
    }
    if (!this.xuan.has(ut)) {
      this.ding.set(ut, which);
      return true;
    }
    return false;
  }

  switch(ut: number, which: number): number {
    const x = this.xuan.get(ut);
    const h = this.huan.get(ut);
    if (x && h && x.includes(which) && h.length > 0) {
      const value = h.shift()!;
      x.splice(x.indexOf(which), 1);
      x.push(value);
      return value;
    }
    return 0;
  }

  switchAt(ut: number, idx: number): number {
    const x = this.xuan.get(ut);
    const h = this.huan.get(ut);
    if (x && h && idx <= x.length && h.length > 0) {
      const value = h.shift()!;
      x[idx] = value;
      return value;
    }
    return 0;
  }

  switchTo(ut: number, which: number, to: number): number {
    const x = this.xuan.get(ut);
    const h = this.huan.get(ut);
    if (x && h && x.includes(which) && h.length > 0) {
      h.shift();
      x.splice(x.indexOf(which), 1);
      x.push(to);
      return to;
    }
    return 0;
  }

  toMessage(ut: number): string {
    const x = this.xuan.get(ut) ?? [];
    const h = this.huan.get(ut);
    return x.join(',') + (h && h.length > 0 ? ',0' : '');
  }
}

export class CastingTable extends Casting {
  xuan: number[];
  readonly banAka: number[];
  readonly banAo: number[];
  readonly ding = new Map<number, number>();

  constructor(xuan: number[], bAka?: number[], bAo?: number[]) {
    super();
    this.xuan = [...xuan];
    this.banAka = bAka ? [...bAka] : [];
    this.banAo = bAo ? [...bAo] : [];
    for (let i = 1; i <= Casting.playerCapacity; i++) {
      this.ding.set(i, 0);
    }
  }

  pick(ut: number, which: number): boolean {
    const idx = this.xuan.indexOf(which);
    if (idx !== -1) {
      this.xuan.splice(idx, 1);
      this.ding.set(ut, which);
      return true;
    }
    return false;
  }

  ban(ut: number, which: number): boolean {
    const aka = ut % 2 === 1;
    const idx = this.xuan.indexOf(which);
    if (idx !== -1) {
      this.xuan.splice(idx, 1);
      (aka ? this.banAka : this.banAo).push(which);
      return true;
    }
    return false;
  }

  putBack(which: number): boolean {
    if (this.xuan.includes(which)) return false;
    this.xuan.push(which);
    return true;
  }

  toMessage(): string {
    const lists = [this.xuan, this.banAka, this.banAo];
    const answers: string[] = [];
    for (const list of lists) {
      if (list.length > 0) answers.push(`${list.length},${list.join(',')}`);
      else answers.push('0');
    }
    return answers.join(',');
  }
}

export class CastingPublic extends Casting {
  xuan: number[];
  readonly dingAka: number[];
  readonly dingAo: number[];
  readonly banAka: number[];
  readonly banAo: number[];
  readonly secrets: number[];
  silencedIdx = 0;

  constructor(
    xuan: number[],
    pAka?: number[],
    pAo?: number[],
    bAka?: number[],
    bAo?: number[],
    secrets?: number[],
    silencedIdx = 0,
  ) {
    super();
    this.xuan = [...xuan];
    this.dingAka = pAka ? [...pAka] : [];
    this.dingAo = pAo ? [...pAo] : [];
    this.banAka = bAka ? [...bAka] : [];
    this.banAo = bAo ? [...bAo] : [];
    this.secrets = secrets ? [...secrets] : [];
    this.silencedIdx = silencedIdx;
  }

  ban(aka: boolean, which: number): boolean {
    const idx = this.xuan.indexOf(which);
    if (idx !== -1) {
      this.xuan.splice(idx, 1);
      (aka ? this.banAka : this.banAo).push(which);
      return true;
    }
    return false;
  }

  pick(aka: boolean, which: number): number {
    const idx = this.xuan.indexOf(which);
    if (idx !== -1) {
      this.xuan.splice(idx, 1);
      (aka ? this.dingAka : this.dingAo).push(which);
      return which;
    }
    if (which === 0 && this.silencedIdx < this.secrets.length) {
      const wh = this.secrets[this.silencedIdx++];
      const whIdx = this.xuan.indexOf(wh);
      if (whIdx !== -1) this.xuan.splice(whIdx, 1);
      (aka ? this.dingAka : this.dingAo).push(wh);
      return wh;
    }
    return 0;
  }

  pickReport(aka: boolean, which: number): boolean {
    const idx = this.xuan.indexOf(which);
    if (idx !== -1) {
      this.xuan.splice(idx, 1);
      (aka ? this.dingAka : this.dingAo).push(which);
      return true;
    }
    const zeroIdx = this.xuan.indexOf(0);
    if (zeroIdx !== -1) this.xuan.splice(zeroIdx, 1);
    (aka ? this.dingAka : this.dingAo).push(which);
    return false;
  }

  toMessage(): string {
    const lists = [this.xuan, this.dingAka, this.dingAo, this.banAka, this.banAo];
    const answers: string[] = [];
    for (const list of lists) {
      if (list.length > 0) {
        answers.push(String(list.length));
        for (const iv of list) {
          if (this.secrets.includes(iv)) answers.push('0');
          else answers.push(String(iv));
        }
      } else {
        answers.push('0');
      }
    }
    return answers.join(',');
  }
}

export class CastingCongress extends Casting {
  xuanAka: number[];
  xuanAo: number[];
  readonly ding = new Map<number, number>();
  decidedAka = false;
  decidedAo = false;
  captainMode = false;
  readonly secrets: number[];

  constructor(xuanAka: number[], xuanAo: number[], secrets: number[]) {
    super();
    this.xuanAka = [...xuanAka];
    this.xuanAo = [...xuanAo];
    this.secrets = [...secrets];
    for (let i = 1; i <= Casting.playerCapacity; i++) {
      this.ding.set(i, 0);
    }
  }

  init(ut: number, selAva: number): void {
    this.ding.set(ut, selAva);
  }

  set(to: number, which: number): { result: number; putBackTo: number } {
    if (to === 0) {
      for (const [key, value] of this.ding) {
        if (value === which) {
          if (key % 2 === 0) this.xuanAo.push(which);
          else this.xuanAka.push(which);
          this.ding.set(key, 0);
          return { result: which, putBackTo: 0 };
        }
      }
      return { result: -1, putBackTo: 0 };
    }

    const xuanList = to % 2 === 0 ? this.xuanAo : this.xuanAka;
    const idx = xuanList.indexOf(which);
    if (idx !== -1) {
      xuanList.splice(idx, 1);
      const putBack = this.ding.get(to) ?? 0;
      if (putBack !== 0) xuanList.push(putBack);
      this.ding.set(to, which);
      return { result: putBack, putBackTo: 0 };
    }

    for (const [pairKey, pairValue] of this.ding) {
      if (pairKey !== to && pairKey % 2 === to % 2 && pairValue === which) {
        const putBack = this.ding.get(to) ?? 0;
        this.ding.set(to, which);
        this.ding.set(pairKey, putBack);
        return { result: putBack, putBackTo: pairKey };
      }
    }
    return { result: -1, putBackTo: 0 };
  }

  isDecide(ut: number): boolean {
    for (const [key, value] of this.ding) {
      if (key % 2 === ut % 2 && value === 0) return false;
    }
    return true;
  }

  toMessage(akaTeam: boolean, watch = false): string {
    const aka = !watch && akaTeam;
    const ao = !watch && !akaTeam;
    const allAka: number[] = [...this.xuanAka];
    const allAo: number[] = [...this.xuanAo];
    for (const [key, value] of this.ding) {
      if (key % 2 === 1 && value !== 0) allAka.push(value);
      if (key % 2 === 0 && value !== 0) allAo.push(value);
    }
    if (!aka) {
      for (let i = 0; i < allAka.length; i++) {
        if (this.secrets.includes(allAka[i])) allAka[i] = 0;
      }
    }
    if (!ao) {
      for (let i = 0; i < allAo.length; i++) {
        if (this.secrets.includes(allAo[i])) allAo[i] = 0;
      }
    }
    const answers: string[] = [];
    const lists = watch
      ? [allAka, allAo]
      : aka ? [this.xuanAka, allAo] : [allAka, this.xuanAo];
    for (const list of lists) {
      if (list.length > 0) answers.push(`${list.length},${list.join(',')}`);
      else answers.push('0');
    }
    for (let i = 1; i <= 6; i++) {
      answers.push(`${i},${!watch && ((i % 2 === 0) !== akaTeam) ? (this.ding.get(i) ?? 0) : '0'}`);
    }
    return answers.join(',');
  }

  isCaptain(ut: number): boolean { return ut === 3 || ut === 4; }
  getCaptainLoop(): number[] { return [4, 3, 3, 4]; }
}
