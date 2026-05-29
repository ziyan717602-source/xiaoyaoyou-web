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

export class NpcCottage extends JNSBase {
  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => string,
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
    // Would need NMBLib to get the NPC unit code
    // Simplified: add to escue
    if (target.escue.length === 0) {
      this.raiseGMessage(`G2IL,${target.uid}`);
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
      action: (_player, _fuse, args) => {
        const idx = args.indexOf(',');
        const from = parseInt(args.substring(0, idx), 10);
        const to = parseInt(args.substring(idx + 1), 10);
        this.targetPlayer(from, to);
        const py = this.board.garden.get(from)!;
        const imc = this.asyncInput(from, `Q1(p${py.tux.join('p')})`, 'NJ06', '0');
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
      action: (_player, _fuse, args) => {
        const who = parseInt(args, 10);
        this.asyncInput(
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
      action: (player, _fuse, _args) => {
        this.raiseGMessage(`G0XZ,${player.uid},2,0,1`);
        const yes = this.asyncInput(
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
      action: (player, _fuse, _args) => {
        const sel = this.asyncInput(
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
      action: (player, _fuse, _args) => {
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
            const input = this.asyncInput(ut, `Z1(p${this.board.pZone.join('p')})`, 'NJH2', '0');
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
      action: (player, _fuse, _args) => {
        // Would need CardHunter - simplified
        this.raiseGMessage(`G0HQ,2,${player.uid},0,0`);
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
}
