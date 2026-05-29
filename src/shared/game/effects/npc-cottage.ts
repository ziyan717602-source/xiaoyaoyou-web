/**
 * NPCCottage - Translation of C# PSD.PSDGamepkg.JNS.NPCCottage
 *
 * NPC action effects (NJ series) and NPC debut effects.
 * Uses NpcEffectRegistration for action/valid/input/escue delegates.
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElement } from '@shared/types/enums';
import { HPEvoMask } from '../card/five-element';
import type { NpcEffectRegistration } from './types';
import type { LibGroup } from '../lib-group';
import type { NpcLib } from '../lib/npc-lib';
import { TuxEquip } from '../card/tux-equip';
import { NMBLib } from '../card/nmb';

export class NpcCottage extends JNSBase {
  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    super(board, libGroup, raiseGMessage, innerGMessage, asyncInput);
  }

  /** Register all NPC action effects */
  registerAll(): NpcEffectRegistration[] {
    return [
      this.nj01Effect(),
      this.nj02Effect(),
      this.nj03Effect(),
      this.nj04Effect(),
      this.nj05Effect(),
      this.nj06Effect(),
      this.nj07Effect(),
      this.nj08Effect(),
      this.nj09Effect(),
      this.njt1Effect(),
      this.njt2Effect(),
      this.njh1Effect(),
      this.njh2Effect(),
      this.njh3Effect(),
      this.njh4Effect(),
      this.njh5Effect(),
      this.njh6Effect(),
      this.njh7Effect(),
      this.njh8Effect(),
      this.njh9Effect(),
    ];
  }

  /** NPC effect utilities (with FROM_NMB mask) */
  private npcHarm(py: Player, n: number, five: FiveElement = FiveElement.A, mask: number = 0): void {
    this.harm(null, py, n, five, HPEvoMask.FROM_NMB | mask);
  }

  private npcCure(py: Player, n: number, five: FiveElement = FiveElement.A, mask: number = 0): void {
    this.cure(null, py, n, five, HPEvoMask.FROM_NMB | mask);
  }

  private defaultPutIntoEscue(player: Player, fuse: string, target: Player): void {
    const npcCode = fuse.substring(0, fuse.indexOf(';'));
    const npcIndex = this.libGroup.nl.encode(npcCode);
    if (npcIndex > 0) {
      const ut = NMBLib.codeOfNPC(npcIndex);
      if (!target.escue.includes(ut)) {
        target.escue.push(ut);
        this.raiseGMessage(`G2IL,${target.uid},${ut}`);
      }
    }
  }

  private escueDiscard(player: Player, npcUt: number): void {
    const idx = player.escue.indexOf(npcUt);
    if (idx >= 0) {
      player.escue.splice(idx, 1);
      this.raiseGMessage(`G2OL,${player.uid},${npcUt}`);
    }
  }

  // ═══════════════════════════════════════════════
  // NJ01 - NPC Join (discard hand, become hero)
  // ═══════════════════════════════════════════════

  private nj01Effect(): NpcEffectRegistration {
    return {
      code: 'NJ01',
      action: (player, fuse, args) => {
        const idx = args.indexOf(',');
        const who = parseInt(args.substring(0, idx), 10);
        const wp = this.board.garden.get(who)!;
        const to = parseInt(args.substring(idx + 1), 10);

        const tuxCount = wp.tux.length;
        this.raiseGMessage(`G0DH,${who},2,${tuxCount}`);

        const npcCode = fuse.substring(0, fuse.indexOf(';'));
        let hp = 2 * tuxCount;
        if ((npcCode.startsWith('JP') || npcCode.startsWith('SJ')) && hp > 3) {
          hp = 3;
        }
        this.raiseGMessage(`G0IY,2,${to},0,${hp}`);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          const aliveTeammates = [...this.board.garden.values()]
            .filter(p => p.isAlive && p.team === player.team && p.tux.length > 0)
            .map(p => p.uid);
          return `#弃掉所有手牌的,T1(p${aliveTeammates.join('p')})`;
        } else if (!prev.includes(',')) {
          return `#待加入的,T1(p${[...this.board.garden.values()]
            .filter(p => p.team === player.team)
            .map(p => p.uid).join('p')})`;
        }
        return '';
      },
      valid: (player, fuse) => {
        return [...this.board.garden.values()].some(
          p => p.isAlive && p.team === player.team && p.tux.length > 0,
        );
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ02 - Heal 1 HP
  // ═══════════════════════════════════════════════

  private nj02Effect(): NpcEffectRegistration {
    return {
      code: 'NJ02',
      action: (_player, _fuse, args) => {
        const who = parseInt(args, 10);
        this.npcCure(this.board.garden.get(who)!, 1);
      },
      input: (_player, _fuse, prev) => {
        return prev === '' ? this.anyoneAliveString() : '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ03 - Harm 1 + Draw
  // ═══════════════════════════════════════════════

  private nj03Effect(): NpcEffectRegistration {
    return {
      code: 'NJ03',
      action: (player, _fuse, args) => {
        const who = parseInt(args, 10);
        this.npcHarm(player, 1);
        this.raiseGMessage(`G0DH,${who},0,1`);
      },
      input: (_player, _fuse, prev) => {
        return prev === '' ? this.anyoneAliveString() : '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ04 - Self draw
  // ═══════════════════════════════════════════════

  private nj04Effect(): NpcEffectRegistration {
    return {
      code: 'NJ04',
      action: (player, _fuse, _args) => {
        this.raiseGMessage(`G0DH,${player.uid},0,1`);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ05 - Target harm 1
  // ═══════════════════════════════════════════════

  private nj05Effect(): NpcEffectRegistration {
    return {
      code: 'NJ05',
      action: (_player, _fuse, args) => {
        const who = parseInt(args, 10);
        this.npcHarm(this.board.garden.get(who)!, 1);
      },
      input: (_player, _fuse, prev) => {
        return prev === '' ? this.anyoneAliveString() : '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ06 - Give card to teammate
  // ═══════════════════════════════════════════════

  private nj06Effect(): NpcEffectRegistration {
    return {
      code: 'NJ06',
      action: async (_player, _fuse, args) => {
        const idx = args.indexOf(',');
        const from = parseInt(args.substring(0, idx), 10);
        const to = parseInt(args.substring(idx + 1), 10);
        this.targetPlayer(from, to);
        const py = this.board.garden.get(from)!;
        const imc = await this.asyncInput(from, `Q1(p${py.tux.join('p')})`, 'NJ06', '0');
        const card = parseInt(imc, 10);
        this.raiseGMessage(`G0HQ,0,${to},${from},1,1,${card}`);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          return `#交出牌的,T1(p${[...this.board.garden.values()]
            .filter(p => p.isAlive && p.tux.length > 0 &&
              [...this.board.garden.values()].some(q => q.isAlive && q.uid !== p.uid && q.team === p.team))
            .map(p => p.uid).join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return [...this.board.garden.values()].some(p => p.isAlive && p.tux.length > 0 &&
          [...this.board.garden.values()].some(q => q.isAlive && q.uid !== p.uid && q.team === p.team));
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ07 - Give pet
  // ═══════════════════════════════════════════════

  private nj07Effect(): NpcEffectRegistration {
    return {
      code: 'NJ07',
      action: (_player, _fuse, args) => {
        const parts = args.split(',');
        const from = parseInt(parts[0], 10);
        const to = parseInt(parts[1], 10);
        const pet = parseInt(parts[2], 10);
        this.targetPlayer(from, to);
        this.raiseGMessage(`G2HP,${to},${from},${pet}`);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          return `#交出宠物的,T1(p${[...this.board.garden.values()]
            .filter(p => p.isAlive && p.getPetCount() > 0 &&
              [...this.board.garden.values()].some(q => q.isAlive && q.uid !== p.uid && q.team === p.team))
            .map(p => p.uid).join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return [...this.board.garden.values()].some(p => p.isAlive && p.getPetCount() > 0 &&
          [...this.board.garden.values()].some(q => q.isAlive && q.uid !== p.uid && q.team === p.team));
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ08 - Discard target hand
  // ═══════════════════════════════════════════════

  private nj08Effect(): NpcEffectRegistration {
    return {
      code: 'NJ08',
      action: async (_player, _fuse, args) => {
        const who = parseInt(args, 10);
        await this.asyncInput(
          _player.uid,
          `#弃置的,C1(${this.board.garden.get(who)!.tux.map(() => 'p0').join('')})`,
          'NJ08',
          '0',
        );
        this.raiseGMessage(`G0DH,${who},2,1`);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          return `T1(p${[...this.board.garden.values()]
            .filter(p => p.isAlive && p.tux.length > 0)
            .map(p => p.uid).join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return [...this.board.garden.values()].some(p => p.isAlive && p.tux.length > 0);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJ09 - Put into escue
  // ═══════════════════════════════════════════════

  private nj09Effect(): NpcEffectRegistration {
    return {
      code: 'NJ09',
      action: (player, fuse, _args) => {
        this.defaultPutIntoEscue(player, fuse, player);
      },
      escueAction: (player, npcUt, _type, _fuse, args) => {
        const side = parseInt(args, 10);
        this.escueDiscard(player, npcUt);
        this.raiseGMessage(`G0IP,${side},1`);
      },
      escueInput: (_player, _npcUt, _type, _fuse, prev) => {
        return prev === '' ? 'S' : '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJT1 - NPC Trial: view monster
  // ═══════════════════════════════════════════════

  private njt1Effect(): NpcEffectRegistration {
    return {
      code: 'NJT1',
      action: async (player, _fuse, _args) => {
        this.raiseGMessage(`G0XZ,${player.uid},2,0,1`);
        const yes = await this.asyncInput(
          player.uid,
          '#请选择是否保留？##是##否,Y2',
          'NJT1',
          '0',
        );
        if (yes === '2') {
          if (this.board.monPiles.count > 0) {
            this.board.monPiles.dequeue();
            this.raiseGMessage('G2IN,1,1');
          }
        }
      },
      valid: (player, _fuse) => {
        return this.board.monPiles.count > 0;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJT2 - NPC Trial: equip rune
  // ═══════════════════════════════════════════════

  private njt2Effect(): NpcEffectRegistration {
    return {
      code: 'NJT2',
      action: async (player, _fuse, _args) => {
        const sel = await this.asyncInput(
          player.uid,
          `T1${this.aAllTareds(player)}`,
          'NJT2',
          '0',
        );
        if (sel && !sel.startsWith('/')) {
          this.raiseGMessage(`G0IF,${sel}`);
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH1 - NPC Hero: discard + escue
  // ═══════════════════════════════════════════════

  private njh1Effect(): NpcEffectRegistration {
    return {
      code: 'NJH1',
      action: (player, fuse, args) => {
        const who = parseInt(args, 10);
        const py = this.board.garden.get(who)!;
        if (py.tux.length > 0) {
          this.raiseGMessage(`G0DH,${who},2,${py.tux.length}`);
        }
        this.defaultPutIntoEscue(player, fuse, player);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          return `#弃掉所有手牌的,T1(p${[...this.board.garden.values()]
            .filter(p => p.isAlive && p.team === player.team && p.tux.length > 0)
            .map(p => p.uid).join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return [...this.board.garden.values()].some(
          p => p.isAlive && p.team === player.team && p.tux.length > 0,
        );
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH2 - NPC Hero: draw 7
  // ═══════════════════════════════════════════════

  private njh2Effect(): NpcEffectRegistration {
    return {
      code: 'NJH2',
      action: async (player, _fuse, _args) => {
        if (this.board.tuxPiles.count >= 7) {
          const pops: number[] = [];
          for (let i = 0; i < 7; i++) {
            pops.push(this.board.tuxPiles.dequeue() as number);
          }
          this.raiseGMessage('G2IN,0,7');
          // Distribute to players
          const ordered = this.board.orderedPlayer(player.uid);
          for (const ut of ordered) {
            if (pops.length <= 0) break;
            const py = this.board.garden.get(ut)!;
            if (!py.isAlive) continue;
            this.raiseGMessage(`G2FU,0,${ut},0,C,${this.board.pZone.join(',')}`);
            const input = await this.asyncInput(ut, `Z1(p${this.board.pZone.join('p')})`, 'NJH2', '0');
            const cd = parseInt(input, 10);
            if (!isNaN(cd) && this.board.pZone.includes(cd)) {
              this.raiseGMessage(`G1OU,${cd}`);
              this.raiseGMessage(`G2QU,0,C,0,${cd}`);
              this.raiseGMessage(`G0HQ,2,${ut},0,0,${cd}`);
              pops.splice(pops.indexOf(cd), 1);
            }
            this.raiseGMessage('G2FU,3');
          }
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH3 - NPC Hero: harm + escue
  // ═══════════════════════════════════════════════

  private njh3Effect(): NpcEffectRegistration {
    return {
      code: 'NJH3',
      action: (player, fuse, args) => {
        const tar = parseInt(args, 10);
        this.targetPlayer(player.uid, tar);
        this.npcHarm(player, 1);
        this.defaultPutIntoEscue(player, fuse, this.board.garden.get(tar)!);
      },
      input: (_player, _fuse, prev) => {
        return prev === '' ? this.anyoneAliveString() : '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH4 - NPC Hero: escue action
  // ═══════════════════════════════════════════════

  private njh4Effect(): NpcEffectRegistration {
    return {
      code: 'NJH4',
      action: (player, fuse, args) => {
        const tar = parseInt(args, 10);
        this.targetPlayer(player.uid, tar);
        this.defaultPutIntoEscue(player, fuse, this.board.garden.get(tar)!);
      },
      input: (_player, _fuse, prev) => {
        return prev === '' ? this.anyoneAliveString() : '';
      },
      escueAction: (player, npcUt, _type, _fuse, _argst) => {
        this.raiseGMessage(`G0DS,${player.uid},0,1`);
        this.escueDiscard(player, npcUt);
        this.raiseGMessage(`G0IA,${player.uid},1,1`);
        this.raiseGMessage(`G0IX,${player.uid},1,1`);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH5 - NPC Hero: harm immune
  // ═══════════════════════════════════════════════

  private njh5Effect(): NpcEffectRegistration {
    return {
      code: 'NJH5',
      action: (player, fuse, args) => {
        const tar = parseInt(args, 10);
        this.targetPlayer(player.uid, tar);
        this.defaultPutIntoEscue(player, fuse, this.board.garden.get(tar)!);
      },
      input: (_player, _fuse, prev) => {
        return prev === '' ? this.anyoneAliveString() : '';
      },
      escueAction: (player, npcUt, type, _fuse, _argst) => {
        if (type === 0) {
          this.npcHarm(player, 1, FiveElement.A, HPEvoMask.TUX_INAVO);
        } else if (type === 1) {
          this.escueDiscard(player, npcUt);
        }
      },
      escueValid: (_player, _npcUt, type, _fuse) => {
        return type === 0 || type === 1;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH6 - NPC Hero: discard equipment
  // ═══════════════════════════════════════════════

  private njh6Effect(): NpcEffectRegistration {
    return {
      code: 'NJH6',
      action: (_player, _fuse, args) => {
        const parts = args.split(',');
        const who = parseInt(parts[0], 10);
        const ut = parseInt(parts[1], 10);
        this.raiseGMessage(`G0QZ,${who},${ut}`);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          return `T1(p${[...this.board.garden.values()]
            .filter(p => p.isAlive && p.getEquipCount() > 0)
            .map(p => p.uid).join('p')})`;
        } else if (!prev.includes(',')) {
          const ut = parseInt(prev, 10);
          const py = this.board.garden.get(ut)!;
          return `C1(p${py.listOutAllEquips().join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return [...this.board.garden.values()].some(p => p.isAlive && p.getEquipCount() > 0);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH7 - NPC Hero: obtain weapon
  // ═══════════════════════════════════════════════

  private njh7Effect(): NpcEffectRegistration {
    return {
      code: 'NJH7',
      action: async (player, _fuse, _args) => {
        // CardHunter: search tux pile for weapon cards
        const accepts: number[] = [];
        const rejects: number[] = [];
        let equipCount = 0;

        while (!this.board.tuxPiles.isEmpty && equipCount < 2) {
          const ut = this.board.tuxPiles.dequeue() as number;
          const tux = this.libGroup.tl.decodeTux(ut);
          if (tux && tux.type === 'WQ') {
            accepts.push(ut);
          } else {
            rejects.push(ut);
          }
          if (tux && tux.isTuxEquip()) {
            equipCount++;
          }
          this.raiseGMessage(`G2ZZ,0`);
        }

        // Abandon rejects (return to pile)
        for (const r of rejects) {
          this.board.tuxPiles.pushBack(r);
        }

        // Give accepted weapons to player
        if (accepts.length > 0) {
          this.raiseGMessage(`G0HQ,2,${player.uid},0,0,${accepts.join(',')}`);
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH8 - NPC Hero: burst pet
  // ═══════════════════════════════════════════════

  private njh8Effect(): NpcEffectRegistration {
    return {
      code: 'NJH8',
      action: (player, fuse, _args) => {
        this.defaultPutIntoEscue(player, fuse, player);
      },
      escueValid: (player, _npcUt, _type, _fuse) => {
        return [...this.board.garden.values()].some(
          p => p.isAlive && p.team === player.team && p.getPetCount() > 0,
        );
      },
      escueAction: (player, _npcUt, _type, _fuse, argst) => {
        const args = argst.split(',');
        const petOwner = parseInt(args[0], 10);
        const pet = parseInt(args[1], 10);
        const caller = parseInt(args[2], 10);
        this.escueDiscard(player, _npcUt);
        this.raiseGMessage(`G0HI,${petOwner},${pet}`);
        this.targetPlayer(petOwner, caller);
        this.raiseGMessage(`G0IA,${caller},1,3`);
      },
      escueInput: (player, _npcUt, _type, _fuse, prev) => {
        if (prev === '') {
          return `#要爆发宠物,/T1${this.formatPlayers(p => p.isAlive && p.getPetCount() > 0 && p.team === player.team)}`;
        }
        return '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NJH9 - NPC Hero: cure zeros
  // ═══════════════════════════════════════════════

  private njh9Effect(): NpcEffectRegistration {
    return {
      code: 'NJH9',
      action: (player, fuse, _args) => {
        this.defaultPutIntoEscue(player, fuse, player);
      },
      escueValid: (player, _npcUt, _type, _fuse) => {
        return [...this.board.garden.values()].some(
          p => p.team === player.team && p.isAlive && p.hp === 0,
        );
      },
      escueAction: (player, npcUt, _type, _fuse, _argst) => {
        this.escueDiscard(player, npcUt);
        const zeros = [...this.board.garden.values()]
          .filter(p => p.team === player.team && p.hp === 0);
        if (zeros.length > 0) {
          this.cureMultiple(null, zeros, 2, FiveElement.A, HPEvoMask.FROM_NMB);
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // NPC Debut Handlers (C# NC303.cs)
  // ═══════════════════════════════════════════════

  private njDebutEffects(): NpcEffectRegistration[] {
    return [
      this.nct27DebutEffect(),
      this.nct32DebutEffect(),
      this.nct33DebutEffect(),
      this.nct42DebutEffect(),
      this.nch05DebutEffect(),
      this.nch07DebutEffect(),
      this.nch10DebutEffect(),
    ];
  }

  // NCT27 - Replace self with NPC from discard pile
  private nct27DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCT27',
      debut: async (trigger) => {
        const restNpc = this.board.monDises.filter(c => {
          const npc = this.libGroup.nl.decode(c);
          return npc !== null;
        });
        if (restNpc.length > 0) {
          const pick = await this.asyncInput(
            trigger.uid,
            `#替换,/M1(p${restNpc.join('p')})`,
            'NCT27Debut',
            '0',
          );
          if (!pick.startsWith('/')) {
            const substitute = parseInt(pick, 10);
            // Remove substitute from discard, add current NPC to discard
            const subIdx = this.board.monDises.indexOf(substitute);
            if (subIdx >= 0) this.board.monDises.splice(subIdx, 1);
            this.raiseGMessage('G2CN,1,1');
            this.board.monDises.push(substitute);
          }
        }
      },
    };
  }

  // NCT32 - During campaign, increment rounder's RestZP
  private nct32DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCT32',
      debut: (_trigger) => {
        if (this.board.inCampaign) {
          this.board.rounder.restZP++;
        }
      },
    };
  }

  // NCT33 - If rounder has < 5 cards, draw up to 5
  private nct33DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCT33',
      debut: (_trigger) => {
        const tval = this.board.rounder.tux.length;
        if (tval < 5) {
          this.raiseGMessage(`G0IB,0,${5 - tval}`);
        }
      },
    };
  }

  // NCT42 - Draw cards equal to (max enemy hand count - 1)
  private nct42DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCT42',
      debut: (trigger) => {
        const enemies = [...this.board.garden.values()]
          .filter(p => p.isAlive && p.team === trigger.oppTeam);
        if (enemies.length > 0) {
          const maxCards = Math.max(...enemies.map(p => p.tux.length));
          const incr = maxCards - 1;
          if (incr >= 0) {
            this.raiseGMessage(`G0IB,0,${incr}`);
          }
        }
      },
    };
  }

  // NCH05 - All alive players with != 3 cards discard 1
  private nch05DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCH05',
      debut: (_trigger) => {
        for (const p of this.board.garden.values()) {
          if (p.isAlive && p.tux.length !== 3) {
            this.raiseGMessage(`G0DS,${p.uid},0,1`);
          }
        }
      },
    };
  }

  // NCH07 - Draw 2 NPC + 2 Monster, add to monster pile face-down, reshuffle
  private nch07DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCH07',
      debut: (_trigger) => {
        const nmbs: number[] = [];
        for (let i = 0; i < 2 && this.board.restNpcPiles.count > 0; i++) {
          nmbs.push(this.board.restNpcPiles.dequeue() as number);
        }
        for (let i = 0; i < 2 && this.board.restMonPiles.count > 0; i++) {
          nmbs.push(this.board.restMonPiles.dequeue() as number);
        }
        if (nmbs.length > 0) {
          for (const c of nmbs) {
            this.board.monPiles.enqueue(c);
          }
          this.board.monPiles.shuffle();
          this.raiseGMessage('G2CN,1,1');
        }
      },
    };
  }

  // NCH10 - Force player to burst weapon, gain ATK = weapon STR + 1
  private nch10DebutEffect(): NpcEffectRegistration {
    return {
      code: 'NCH10',
      debut: async (trigger) => {
        const hasWqs = [...this.board.garden.values()]
          .filter(p => p.isAlive && (p.weapon !== 0 || (p.exEquip !== 0)))
          .map(p => p.uid);
        if (hasWqs.length > 0) {
          const whoSel = await this.asyncInput(
            trigger.uid,
            `#爆发武器,T1(p${hasWqs.join('p')})`,
            'NCH10Debut',
            '0',
          );
          const who = parseInt(whoSel, 10);
          const py = this.board.garden.get(who);
          if (py) {
            const wqs: number[] = [];
            if (py.weapon !== 0) wqs.push(py.weapon);
            if (py.exEquip !== 0) wqs.push(py.exEquip);
            if (wqs.length > 0) {
              const tuxSel = await this.asyncInput(
                trigger.uid,
                `#爆发,${trigger.uid === who ? 'Q' : 'C'}1(p${wqs.join('p')})`,
                'NCH10Debut',
                '1',
              );
              const ut = parseInt(tuxSel, 10);
              this.raiseGMessage(`G0ZI,${who},${ut}`);
              const tux = this.libGroup.tl.decodeTux(ut);
              const atkBonus = tux instanceof TuxEquip ? tux.incrOfSTR : 1;
              this.raiseGMessage(`G0IB,0,${atkBonus}`);
            }
          }
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Register NPC Debut Delegates
  // ═══════════════════════════════════════════════

  /**
   * Wire debut delegates onto all Npc objects in the library.
   * Matches C# NPCCottage reflection-based registration.
   */
  registerNpcDelegates(npcLib: NpcLib): void {
    const debutEffects = this.njDebutEffects();
    const debutMap = new Map<string, (trigger: Player) => void>();
    for (const eff of debutEffects) {
      if (eff.debut) debutMap.set(eff.code, eff.debut);
    }
    for (const npc of npcLib.first) {
      const handler = debutMap.get(npc.code);
      if (handler) {
        npc.debut = handler;
      }
    }
  }
}
