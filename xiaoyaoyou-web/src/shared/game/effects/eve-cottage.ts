/**
 * EveCottage - Translation of C# PSD.PSDGamepkg.JNS.EveCottage
 *
 * Event effects: SJ101-SJ501, SJT01-SJT20, SJH01-SJH11, SJ001-SJ003.
 * Events only receive the rounder player (no Action/Valid/Input pattern).
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElement, TuxType } from '@shared/types/enums';
import { FiveElementHelper, HPEvoMask } from '../card/five-element';
import type { EveEffectRegistration } from './types';
import type { LibGroup } from '../lib-group';

export class EveCottage extends JNSBase {
  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    super(board, libGroup, raiseGMessage, innerGMessage, asyncInput);
  }

  /** Register all event effects */
  registerAll(): EveEffectRegistration[] {
    return [
      this.sj101Effect(),
      this.sj102Effect(),
      this.sj103Effect(),
      this.sj104Effect(),
      this.sj201Effect(),
      this.sj202Effect(),
      this.sj301Effect(),
      this.sj302Effect(),
      this.sj303Effect(),
      this.sj401Effect(),
      this.sj402Effect(),
      this.sj501Effect(),
      this.sjt01Effect(),
      this.sjt02Effect(),
      this.sjt03Effect(),
      this.sjt05Effect(),
      this.sjt06Effect(),
      this.sjt08Effect(),
      this.sjt09Effect(),
      this.sjt12Effect(),
      this.sjt19Effect(),
      this.sjt20Effect(),
      this.sjh01Effect(),
      this.sjh02Effect(),
      this.sjh03Effect(),
      this.sjh04Effect(),
      this.sjh05Effect(),
      this.sjh06Effect(),
      this.sjh07Effect(),
      this.sjh10Effect(),
      this.sjh11Effect(),
    ];
  }

  // ═══════════════════════════════════════════════
  // Eve Of Pal1
  // ═══════════════════════════════════════════════

  private sj101Effect(): EveEffectRegistration {
    return {
      code: 'SJ101',
      action: async (rd) => {
        if (rd.gender === 'M') {
          this.raiseGMessage(`G0DH,${rd.uid},0,1`);
          this.harm(null, rd, 1, FiveElement.THUNDER);
        } else if (rd.gender === 'F') {
          if (rd.armor !== 0) {
            this.raiseGMessage(`G0QZ,${rd.uid},${rd.armor}`);
          }
          if ([...this.board.garden.values()].some(p => p.isAlive && p.gender === 'M')) {
            const input = await this.asyncInput(
              rd.uid,
              `#「天雷破」的,/T1${this.formatPlayers(p => p.isAlive && p.gender === 'M')}`,
              'SJ101',
              '0',
            );
            if (!input.startsWith('/')) {
              const target = parseInt(input, 10);
              this.raiseGMessage(`G0CC,${rd.uid},0,${rd.uid},JP05,0;1,R${rd.uid}EV,${target}`);
            }
          }
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Eve Of Pal1 (continued)
  // ═══════════════════════════════════════════════

  private sj102Effect(): EveEffectRegistration {
    return {
      code: 'SJ102',
      action: (_rd) => {
        const invs = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.getPetCount() === 0)
          .map(p => p.uid);
        if (invs.length > 0) {
          this.raiseGMessage(`G0DH,${invs.map(p => `${p},0,1`).join(',')}`);
        }
      },
    };
  }

  private sj103Effect(): EveEffectRegistration {
    return {
      code: 'SJ103',
      action: async (rd) => {
        const input = await this.asyncInput(
          rd.uid,
          `#获得2张手牌的,T1${this.aTeammates(rd)},T1${this.aEnemy(rd)}`,
          'SJ103',
          '0',
        );
        const ips = input.split(',');
        this.raiseGMessage(`G0DH,${ips[0]},0,2,${ips[1]},0,2`);
      },
    };
  }

  private sj104Effect(): EveEffectRegistration {
    return {
      code: 'SJ104',
      action: async (rd) => {
        const nx = this.board.getOpponent(rd);
        if (this.board.tuxPiles.count >= 4) {
          const pops: number[] = [];
          for (let i = 0; i < 4; i++) pops.push(this.board.tuxPiles.dequeue() as number);
          this.raiseGMessage('G2IN,0,4');
          this.raiseGMessage(`G1IU,${pops.join(',')}`);

          let idxs = 1;
          do {
            const ut = [rd.uid, nx.uid][idxs];
            this.raiseGMessage(`G2FU,0,${ut},0,C,${pops.join(',')}`);
            const input = await this.asyncInput(
              ut,
              `+Z1(p${this.board.pZone.join('p')}),#获得卡牌的,/T1${[this.aTeammates(rd), this.aEnemy(rd)][idxs]}`,
              'SJ104',
              '0',
            );
            if (!input.includes('/') && !input.startsWith('/')) {
              const ips = input.split(',');
              const cd = parseInt(ips[0], 10);
              if (!isNaN(cd) && this.board.pZone.includes(cd)) {
                const ut2 = parseInt(ips[1], 10);
                this.raiseGMessage(`G1OU,${cd}`);
                this.raiseGMessage(`G2QU,0,C,0,${cd}`);
                this.raiseGMessage(`G0HQ,2,${ut2},0,0,${cd}`);
                pops.splice(pops.indexOf(cd), 1);
                idxs = (idxs + 1) % 2;
              }
            }
            this.raiseGMessage('G2FU,3');
          } while (pops.length > 0);
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Eve Of Pal2
  // ═══════════════════════════════════════════════

  private sj201Effect(): EveEffectRegistration {
    return {
      code: 'SJ201',
      action: (_rd) => {
        const invs = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.hp <= 3);
        if (invs.length > 0) {
          this.raiseGMessage(`G0DH,${invs.map(p => `${p.uid},0,1`).join(',')}`);
        }
      },
    };
  }

  private sj202Effect(): EveEffectRegistration {
    return {
      code: 'SJ202',
      action: async (rd) => {
        const invs = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.hp >= 2 && p.team === rd.team)
          .map(p => p.uid);
        if (invs.length > 0) {
          const input = await this.asyncInput(
            rd.uid,
            `#HP将为1的,T1(p${invs.join('p')})`,
            'SJ202',
            '0',
          );
          const target = parseInt(input, 10);
          const leifeng = this.board.garden.get(target);
          if (!leifeng) return;
          this.harm(null, leifeng, leifeng.hp - 1, FiveElement.A, HPEvoMask.TERMIN_AT);
        }
        const msg = this.affichePlayers(
          p => p.isAlive && p.team === this.board.rounder.team,
          p => `${p.uid},0,1`,
        );
        if (msg) {
          this.raiseGMessage(`G0DH,${msg}`);
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Eve Of Pal3
  // ═══════════════════════════════════════════════

  private sj301Effect(): EveEffectRegistration {
    return {
      code: 'SJ301',
      action: (_rd) => {
        const msg = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length !== 3)
          .map(p => p.tux.length > 3
            ? `${p.uid},1,${p.tux.length - 3}`
            : `${p.uid},0,${3 - p.tux.length}`)
          .join(',');
        if (msg) {
          this.raiseGMessage(`G0DH,${msg}`);
        }
      },
    };
  }

  private sj302Effect(): EveEffectRegistration {
    return {
      code: 'SJ302',
      action: (_rd) => {
        const minHp = Math.min(...[...this.board.garden.values()]
          .filter(p => p.isAlive)
          .map(p => p.hp));
        const targets = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.hp === minHp);
        this.cureMultiple(null, targets, 2);
      },
    };
  }

  private sj303Effect(): EveEffectRegistration {
    return {
      code: 'SJ303',
      action: (rd) => {
        const countOfPet = rd.getPetCount();
        if (countOfPet > 0) {
          this.raiseGMessage(`G0DH,${rd.uid},1,${countOfPet}`);
        }
        this.raiseGMessage(`G0DH,${rd.uid},0,1`);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Eve Of Pal4
  // ═══════════════════════════════════════════════

  private sj401Effect(): EveEffectRegistration {
    return {
      code: 'SJ401',
      action: (rd) => {
        if (rd.tux.length > 0) {
          this.raiseGMessage(`G0DH,${rd.uid},2,${rd.tux.length}`);
        }
        this.raiseGMessage(`G0DH,${rd.uid},0,2`);
      },
    };
  }

  private sj402Effect(): EveEffectRegistration {
    return {
      code: 'SJ402',
      action: (_rd) => {
        const lst = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.getPetCount() > 0);
        if (lst.length > 0) {
          const parts = lst.map(p => `${p.uid},0,${FiveElementHelper.elem2Int(FiveElement.A)},${p.getPetCount()},0`);
          this.raiseGMessage('G0OH,' + parts.join(';'));
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Eve Of Pal5
  // ═══════════════════════════════════════════════

  private sj501Effect(): EveEffectRegistration {
    return {
      code: 'SJ501',
      action: (_rd) => {
        const maxTux = Math.max(...[...this.board.garden.values()]
          .filter(p => p.isAlive)
          .map(p => p.tux.length));
        const v = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length === maxTux);
        if (v.length === 1) {
          this.raiseGMessage(`G0DS,${v[0].uid},0,1`);
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Package 5#
  // ═══════════════════════════════════════════════

  private sjt01Effect(): EveEffectRegistration {
    return {
      code: 'SJT01',
      action: (rd) => {
        const hd = this.board.facer(rd);
        if (hd != null && hd.isAlive) {
          this.raiseGMessage(
            `G0HQ,4,${rd.uid},${hd.uid},${rd.tux.length},${hd.tux.length}` +
            (rd.tux.length > 0 ? `,${rd.tux.join(',')}` : '') +
            (hd.tux.length > 0 ? `,${hd.tux.join(',')}` : ''),
          );
        }
      },
    };
  }

  private sjt02Effect(): EveEffectRegistration {
    return {
      code: 'SJT02',
      action: (_rd) => {
        const harms: string[] = [];
        for (const py of this.board.garden.values()) {
          if (!py.isAlive) continue;
          const acc = (py.weapon !== 0 ? 1 : 0) + (py.armor !== 0 ? 1 : 0) +
            (py.trove !== 0 ? 1 : 0) + (py.exEquip !== 0 ? 1 : 0);
          if (acc > 0) {
            harms.push(`${py.uid},0,${FiveElementHelper.elem2Int(FiveElement.A)},${acc},0`);
          }
        }
        if (harms.length > 0) {
          this.raiseGMessage('G0OH,' + harms.join(';'));
        }
      },
    };
  }

  private sjt03Effect(): EveEffectRegistration {
    return {
      code: 'SJT03',
      action: (rd) => {
        const oppPetCount = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.team === rd.oppTeam)
          .reduce((sum, p) => sum + p.getPetCount(), 0) + 1;
        const teammates = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.team === rd.team);
        const cardsPerPlayer = Math.floor(oppPetCount / teammates.length);
        const remainder = oppPetCount % teammates.length;
        for (let i = 0; i < teammates.length; i++) {
          const count = cardsPerPlayer + (i < remainder ? 1 : 0);
          if (count > 0) {
            this.raiseGMessage(`G0DH,${teammates[i].uid},0,${count}`);
          }
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Package 6#
  // ═══════════════════════════════════════════════

  private sjt05Effect(): EveEffectRegistration {
    return {
      code: 'SJT05',
      action: (rd) => {
        const result = this.affichePlayers(
          p => p.isAlive && p.tux.length > 0,
          p => `${p.uid},1,1`,
        );
        if (result) {
          this.raiseGMessage(`G0DH,${result}`);
        }
      },
    };
  }

  private sjt06Effect(): EveEffectRegistration {
    return {
      code: 'SJT06',
      action: (_rd) => {
        const invs = [...this.board.garden.values()]
          .filter(p => p.getPetCount() === 0)
          .map(p => p.uid);
        if (invs.length > 0) {
          this.raiseGMessage(`G1XR,1,0,2,${invs.join(',')}`);
        }
      },
    };
  }

  private sjt08Effect(): EveEffectRegistration {
    return {
      code: 'SJT08',
      action: (_rd) => {
        let g0dh = '';
        const ovs = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.getEquipCount() > 2);
        if (ovs.length > 0) {
          g0dh += ',' + ovs.map(p => `${p.uid},1,${p.getEquipCount() - 2}`).join(',');
        }
        const ivs = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.getEquipCount() < 2);
        if (ivs.length > 0) {
          g0dh += ',' + ivs.map(p => `${p.uid},0,${2 - p.getEquipCount()}`).join(',');
        }
        if (g0dh) {
          this.raiseGMessage(`G0DH${g0dh}`);
        }
      },
    };
  }

  private sjt09Effect(): EveEffectRegistration {
    return {
      code: 'SJT09',
      action: (_rd) => {
        const cures: string[] = [];
        const harms: string[] = [];
        for (const p of this.board.garden.values()) {
          if (!p.isAlive) continue;
          if (p.tux.length < 3) {
            cures.push(`${p.uid},0,${FiveElementHelper.elem2Int(FiveElement.A)},${3 - p.tux.length},0`);
          } else if (p.tux.length > 3) {
            harms.push(`${p.uid},0,${FiveElementHelper.elem2Int(FiveElement.A)},${p.tux.length - 3},0`);
          }
        }
        if (cures.length > 0) this.raiseGMessage('G0IH,' + cures.join(';'));
        if (harms.length > 0) this.raiseGMessage('G0OH,' + harms.join(';'));
      },
    };
  }

  private sjt12Effect(): EveEffectRegistration {
    return {
      code: 'SJT12',
      action: (_rd) => {
        const pys = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length > 0)
          .map(p => p.uid);
        if (pys.length > 0) {
          this.raiseGMessage(`G1XR,1,0,0,${pys.join(',')}`);
        }
      },
    };
  }

  private sjt19Effect(): EveEffectRegistration {
    return {
      code: 'SJT19',
      action: (_rd) => {
        const lst = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length > 0);
        if (lst.length > 0) {
          const parts = lst.map(p =>
            `${p.uid},0,${FiveElementHelper.elem2Int(FiveElement.YINN)},${p.tux.length},0`,
          );
          this.raiseGMessage('G0OH,' + parts.join(';'));
        }
      },
    };
  }

  private sjt20Effect(): EveEffectRegistration {
    return {
      code: 'SJT20',
      action: (_rd) => {
        const zeros = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length <= 1);
        const ones = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length > 1);
        const fours = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length >= 4);
        if (ones.length > 0) {
          this.raiseGMessage(
            `G0DH,${ones.map(p => `${p.uid},2,${p.tux.length - 1}`).join(',')}`,
          );
        }
        fours.forEach(p => this.raiseGMessage(`G0IF,${p.uid},6`));
        zeros.forEach(p => this.raiseGMessage(`G0IF,${p.uid},4`));
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Special Events
  // ═══════════════════════════════════════════════

  private sj001Effect(): EveEffectRegistration {
    return {
      code: 'SJ001',
      action: (_rd) => {
        const parts = [...this.board.garden.values()]
          .filter(p => p.isAlive)
          .map(p => `${p.uid},0,${FiveElementHelper.elem2Int(FiveElement.AQUA)},12,0`);
        this.raiseGMessage('G0OH,' + parts.join(';'));
      },
    };
  }

  private sj002Effect(): EveEffectRegistration {
    return {
      code: 'SJ002',
      action: (_rd) => {
        this.raiseGMessage(
          `G0OH,5,0,${FiveElementHelper.elem2Int(FiveElement.SATURN)},12,0`,
        );
        this.raiseGMessage(
          `G0OH,1,0,${FiveElementHelper.elem2Int(FiveElement.SATURN)},12,0`,
        );
      },
    };
  }

  private sj003Effect(): EveEffectRegistration {
    return {
      code: 'SJ003',
      action: (_rd) => {
        this.raiseGMessage('G2HP,2,0,15');
        this.raiseGMessage('G2HP,4,0,6');
        this.raiseGMessage('G2HP,6,0,7');
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Holiday Events (SJH01-SJH11)
  // ═══════════════════════════════════════════════

  private sjh01Effect(): EveEffectRegistration {
    return {
      code: 'SJH01',
      action: async (rd) => {
        const greater = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.strh > rd.strh && p.tux.length > 0)
          .map(p => p.uid);
        if (greater.length === 0) return;
        const hint = greater.length === 1
          ? `#获取手牌,/T1(p${greater[0]})`
          : `#获取手牌,/T1~2(p${greater.join('p')})`;
        const select = await this.asyncInput(rd.uid, hint, 'SJH01', '0');
        if (select.startsWith('/')) return;
        const tars = select.split(',').map(Number);
        this.raiseGMessage(`G0TT,${rd.uid}`);
        for (const tar of tars) {
          const tg = this.board.garden.get(tar);
          if (!tg || tg.tux.length === 0) continue;
          await this.asyncInput(
            rd.uid,
            `#获得${tg.name}的,C1(p${tg.tux.map(() => 'p0').join('')})`,
            'SJH01',
            '1',
          );
          this.raiseGMessage(`G0HQ,0,${rd.uid},${tar},2,1`);
        }
      },
    };
  }

  private sjh02Effect(): EveEffectRegistration {
    return {
      code: 'SJH02',
      action: async (_rd) => {
        const list = this.board.orderedPlayer();
        const showList: number[] = [];
        const notShowList: number[] = [];
        for (const ut of list) {
          const py = this.board.garden.get(ut);
          if (!py || !py.isAlive) continue;
          let show = false;
          const hasTP = py.tux.some(c => {
            const decoded = this.libGroup.tl.decodeTux(c);
            return decoded && decoded.type === TuxType.TP;
          });
          if (!hasTP) {
            const select = await this.asyncInput(ut, '#是否展示您的手牌？##是##否,Y2', 'SJH02', '0');
            if (select === '1') show = true;
          } else {
            await this.asyncInput(ut, '#是否展示您的手牌？##否,Y1', 'SJH02', '0');
          }
          if (show) {
            if (py.tux.length > 0) {
              this.raiseGMessage(`G2FU,0,${ut},0,C,${py.tux.join(',')}`);
            }
            showList.push(ut);
          } else {
            notShowList.push(ut);
          }
        }
        let result = '';
        if (notShowList.length > 0) {
          result += ',' + notShowList.map(p => `${p},1,2`).join(',');
        }
        if (showList.length > 0) {
          result += ',' + showList.map(p => `${p},0,2`).join(',');
        }
        if (result) {
          this.raiseGMessage(`G0DH${result}`);
        }
      },
    };
  }

  private sjh03Effect(): EveEffectRegistration {
    return {
      code: 'SJH03',
      action: async (_rd) => {
        const requires = new Map<number, string>();
        for (const py of this.board.garden.values()) {
          if (py.getEquipCount() > 0) {
            requires.set(py.uid, `#须弃置,Q1(p${py.listOutAllEquips().join('p')})`);
          }
        }
        for (const [uid, hint] of requires) {
          const input = await this.asyncInput(uid, hint, 'SJH03', '0');
          if (!input.startsWith('/')) {
            this.raiseGMessage(`G0QZ,${uid},${input}`);
          }
        }
        requires.clear();
        for (const py of this.board.garden.values()) {
          const equips = py.listOutAllEquips();
          if (equips.length >= 2) {
            requires.set(py.uid, `#须弃置,Q2(p${equips.join('p')})`);
          } else if (equips.length === 1) {
            requires.set(py.uid, `#须弃置,Q1(p${equips.join('p')})`);
          }
        }
        for (const [uid, hint] of requires) {
          const input = await this.asyncInput(uid, hint, 'SJH03', '1');
          if (!input.startsWith('/')) {
            this.raiseGMessage(`G0QZ,${uid},${input}`);
          }
        }
        const hasEscues = [...this.board.garden.values()].filter(p => p.escue.length > 0);
        if (hasEscues.length > 0) {
          const olParts = hasEscues.flatMap(p => p.escue.map(q => `${p.uid},${q}`));
          this.raiseGMessage(`G2OL,${olParts.join(',')}`);
          for (const p of hasEscues) {
            this.raiseGMessage(`G2AB,NMB,${p.escue.join(',')}`);
            p.escue.splice(0);
          }
        }
        for (const py of this.board.garden.values()) {
          if (py.runes.length > 0) {
            this.raiseGMessage(`G0OF,${py.uid},${py.runes.join(',')}`);
          }
        }
      },
    };
  }

  private sjh04Effect(): EveEffectRegistration {
    return {
      code: 'SJH04',
      action: async (rd) => {
        if (this.board.restMonPiles.count === 0) return;
        const pop = this.board.restMonPiles.dequeue() as number;
        this.raiseGMessage('G2FU,0,0,0,NMB');
        this.raiseGMessage(`G0TT,${rd.uid}`);
        const mon = this.board.restMonPiles.count > 0 ? null : null;
        // Decode the monster from NMB pile
        const monCode = pop;
        if (this.board.diceValue + rd.strh > 2) {
          let done = false;
          while (!done) {
            const commer = [...this.board.garden.values()].filter(p =>
              p.isAlive && p.getPetCount() > rd.getPetCount());
            if (commer.length > 0) {
              const selT = await this.asyncInput(rd.uid,
                `#弃置宠物,/T1(p${commer.map(p => p.uid).join('p')})`, 'SJH04', '0');
              if (!selT.startsWith('/')) {
                const who = parseInt(selT, 10);
                const wg = this.board.garden.get(who);
                if (wg && wg.pets.length > 0) {
                  const selM = await this.asyncInput(rd.uid,
                    `#弃置宠物,/M1(p${wg.pets.filter(q => q !== 0).join('p')})`, 'SJH04', '1');
                  if (!selM.startsWith('/')) {
                    this.raiseGMessage(`G2LP,${who},${selM}`);
                    done = true;
                  }
                }
              } else {
                done = true;
              }
            } else {
              done = true;
            }
          }
        } else {
          this.harm(null, rd, rd.getPetCount() + 1);
        }
      },
    };
  }

  private sjh05Effect(): EveEffectRegistration {
    return {
      code: 'SJH05',
      action: async (rd) => {
        if (rd.tux.length > 0) {
          const nx = this.board.getOpponent(rd);
          this.raiseGMessage(`G2FU,0,${nx.uid},0,C,${rd.tux.join(',')}`);
          const select = await this.asyncInput(nx.uid, `C1(p${rd.tux.join('p')})`, 'SJH05', '0');
          if (!select.startsWith('/')) {
            const ut = parseInt(select, 10);
            if (rd.tux.includes(ut)) {
              this.raiseGMessage(`G0QZ,${rd.uid},${ut}`);
            }
          }
        }
        this.raiseGMessage(`G0DH,${rd.uid},0,1`);
      },
    };
  }

  private sjh06Effect(): EveEffectRegistration {
    return {
      code: 'SJH06',
      action: async (rd) => {
        for (const ut of this.board.orderedPlayer(rd.uid)) {
          if (rd.getAllCardsCount() === 0) break;
          const py = this.board.garden.get(ut);
          if (!py || ut === rd.uid || !py.isAlive) continue;
          this.raiseGMessage(`G0TT,${rd.uid}`);
          const second = await this.asyncInput(rd.uid,
            `#交予${py.name}的,Q1(p${rd.listOutAllCards().join('p')})`, 'SJH06', '0');
          const card = parseInt(second, 10);
          if (card === 0) {
            this.raiseGMessage(`G0HQ,0,${ut},${rd.uid},2,1`);
          } else {
            this.raiseGMessage(`G0HQ,0,${ut},${rd.uid},0,1,${card}`);
          }
        }
        const alive = [...this.board.garden.values()].filter(p => p.isAlive && p.uid !== rd.uid);
        const allLowerOrEqual = alive.some(p => p.hp <= rd.hp) &&
          alive.some(p => p.strh <= rd.strh) &&
          alive.some(p => p.dexh <= rd.dexh);
        if (!allLowerOrEqual || alive.length === 0) {
          this.cure(null, rd, this.board.garden.size);
        }
      },
    };
  }

  private sjh07Effect(): EveEffectRegistration {
    return {
      code: 'SJH07',
      action: async (rd) => {
        let count = 0;
        for (const ut of this.board.orderedPlayer(rd.uid)) {
          const py = this.board.garden.get(ut);
          if (!py || ut === rd.uid || !py.isAlive || py.getAllCardsCount() === 0) continue;
          this.raiseGMessage(`G0TT,${rd.uid}`);
          const second = await this.asyncInput(rd.uid,
            `#获得${py.name}的,C1(p${py.listOutAllCardsWithEncrypt().join('p')})`, 'SJH07', '0');
          const card = parseInt(second, 10);
          if (card === 0) {
            this.raiseGMessage(`G0HQ,0,${rd.uid},${ut},2,1`);
          } else {
            this.raiseGMessage(`G0HQ,0,${rd.uid},${ut},0,1,${card}`);
          }
          if (py.team === rd.oppTeam) ++count;
        }
        if (count > 0) {
          this.harm(null, rd, count);
        }
      },
    };
  }

  private sjh10Effect(): EveEffectRegistration {
    return {
      code: 'SJH10',
      action: async (rd) => {
        const possible: number[] = [];
        const name = ['手牌', '装备牌', '标记', '助战NPC'];
        if (rd.tux.length > 0) possible.push(0);
        if (rd.getEquipCount() > 0) possible.push(1);
        if (rd.runes.length > 0) possible.push(2);
        if (rd.escue.length > 0) possible.push(3);
        if (possible.length === 0) return;
        const select = await this.asyncInput(rd.uid,
          `#请选择要全部弃置的牌类型##${possible.map(p => name[p]).join('##')},Y${possible.length}`,
          'SJH10', '0');
        if (select.startsWith('/')) return;
        const pick = possible[parseInt(select, 10) - 1];
        if (pick === 0) {
          this.raiseGMessage(`G0DH,${rd.uid},2,${rd.tux.length}`);
          this.raiseGMessage(`G0DH,${rd.uid},0,1`);
        } else if (pick === 1) {
          const equips = rd.listOutAllEquips();
          this.raiseGMessage(`G0QZ,${rd.uid},${equips.join(',')}`);
          this.raiseGMessage(`G0HQ,2,${rd.uid},0,0,${equips[0]}`);
        } else if (pick === 2) {
          this.raiseGMessage(`G0OF,${rd.uid},${rd.runes.join(',')}`);
          const obtain = await this.asyncInput(rd.uid,
            `#获得标记,F1(p${rd.runes.join('p')})`, 'SJH10', '1');
          if (!obtain.startsWith('/')) {
            this.raiseGMessage(`G0IF,${rd.uid},${obtain}`);
          }
        } else if (pick === 3) {
          const escueParts = rd.escue.map(p => `${rd.uid},${p}`).join(',');
          this.raiseGMessage(`G2OL,${escueParts}`);
          this.raiseGMessage(`G2AB,NMB,${rd.escue.join(',')}`);
          rd.escue.splice(0);
        }
      },
    };
  }

  private sjh11Effect(): EveEffectRegistration {
    return {
      code: 'SJH11',
      action: async (rd) => {
        const excess = [...this.board.garden.values()].filter(p =>
          p.isAlive && p.team === rd.oppTeam && p.tux.length > 3);
        const deficit = [...this.board.garden.values()].filter(p =>
          p.isAlive && p.team === rd.oppTeam && p.tux.length < 3 && p.tux.length > 0);
        if (excess.length > 0) {
          const dict = new Map<number, string>();
          for (const p of excess) {
            dict.set(p.uid, `#交予对方的,Q${p.tux.length - 3}(p${p.tux.join('p')})`);
          }
          for (const [uid, hint] of dict) {
            const ans = await this.asyncInput(uid, hint, 'SJH11', '0');
            if (!ans.startsWith('/')) {
              const cards = ans.split(',').map(Number);
              const tg = this.board.garden.get(uid);
              if (tg) {
                const fac = this.board.facer(tg);
                if (fac && fac.isAlive) {
                  this.raiseGMessage(`G0HQ,0,${fac.uid},${uid},1,${cards.length},${cards.join(',')}`);
                  this.raiseGMessage(`G0DH,${uid},0,${cards.length * 2}`);
                }
              }
            }
          }
        }
        if (deficit.length > 0) {
          const parts = deficit.map(p => `${p.uid},1,${3 - p.tux.length}`).join(',');
          this.raiseGMessage(`G0DH,${parts}`);
        }
      },
    };
  }
}

// FiveElementHelper is already imported at the top
