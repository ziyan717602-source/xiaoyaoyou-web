/**
 * RuneCottage - Translation of C# PSD.PSDGamepkg.JNS.RuneCottage
 *
 * Rune effects: SF01-SF07 series.
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElement } from '@shared/types/enums';
import { FiveElementHelper, HPEvoMask } from '../card/five-element';
import type { RuneEffectRegistration } from './types';
import type { LibGroup } from '../lib-group';

export class RuneCottage extends JNSBase {
  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => string,
  ) {
    super(board, libGroup, raiseGMessage, innerGMessage, asyncInput);
  }

  /** Register all rune effects */
  registerAll(): RuneEffectRegistration[] {
    return [
      this.sf01Effect(),
      this.sf02Effect(),
      this.sf03Effect(),
      this.sf04Effect(),
      this.sf05Effect(),
      this.sf06Effect(),
      this.sf07Effect(),
    ];
  }

  // ═══════════════════════════════════════════════
  // SF01 - Battle Side Selection
  // ═══════════════════════════════════════════════

  private sf01Effect(): RuneEffectRegistration {
    return {
      code: 'SF01',
      action: (player, _fuse, args) => {
        const side = parseInt(args, 10);
        this.raiseGMessage(`G0IP,${side},2`);
      },
      valid: (player, _fuse) => {
        return this.board.isAttendWar(player);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') return 'S';
        return '';
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SF02 - Hit +2
  // ═══════════════════════════════════════════════

  private sf02Effect(): RuneEffectRegistration {
    return {
      code: 'SF02',
      action: (player, _fuse, _args) => {
        this.raiseGMessage(`G0IX,${player.uid},1,2`);
      },
      valid: (player, _fuse) => {
        return this.board.isAttendWar(player);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SF03 - Remove Elemental Damage
  // ═══════════════════════════════════════════════

  private sf03Effect(): RuneEffectRegistration {
    return {
      code: 'SF03',
      action: (player, fuse, _args) => {
        const parts = fuse.split(';');
        const remaining: string[] = [];
        for (const part of parts) {
          if (part === '') continue;
          const pParts = part.split(',');
          const who = parseInt(pParts[0], 10);
          const n = parseInt(pParts[3], 10);
          const elem = parseInt(pParts[2], 10);
          const mask = parseInt(pParts[4], 10) || 0;
          if (who === player.uid && n > 0 &&
            FiveElementHelper.isPropedElement(FiveElementHelper.int2Elem(elem)) &&
            !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
            continue;
          }
          remaining.push(part);
        }
        if (remaining.length > 0) {
          this.innerGMessage(remaining.join(';'), -18);
        }
      },
      valid: (player, fuse) => {
        const parts = fuse.split(';');
        for (const part of parts) {
          if (part === '') continue;
          const pParts = part.split(',');
          const who = parseInt(pParts[0], 10);
          const n = parseInt(pParts[3], 10);
          const elem = parseInt(pParts[2], 10);
          const mask = parseInt(pParts[4], 10) || 0;
          if (who === player.uid && n > 0 &&
            FiveElementHelper.isPropedElement(FiveElementHelper.int2Elem(elem)) &&
            !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
            return true;
          }
        }
        return false;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SF04 - Resist Non-Self Damage
  // ═══════════════════════════════════════════════

  private sf04Effect(): RuneEffectRegistration {
    return {
      code: 'SF04',
      action: (player, fuse, _args) => {
        const parts = fuse.split(';');
        let isAvoid = false;
        for (const part of parts) {
          if (part === '') continue;
          const pParts = part.split(',');
          const who = parseInt(pParts[0], 10);
          const n = parseInt(pParts[3], 10);
          const source = parseInt(pParts[1], 10);
          const elem = parseInt(pParts[2], 10);
          const mask = parseInt(pParts[4], 10) || 0;
          if (who === player.uid && n > 0 && source !== player.uid &&
            elem === FiveElementHelper.elem2Int(FiveElement.A) &&
            !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
            const select = this.asyncInput(
              player.uid,
              '#是否抵御此伤害？##是##否,Y2',
              'SF04',
              '0',
            );
            if (select === '1') isAvoid = true;
            break;
          }
        }
        const remaining: string[] = [];
        for (const part of parts) {
          if (part === '') continue;
          const pParts = part.split(',');
          const who = parseInt(pParts[0], 10);
          const n = parseInt(pParts[3], 10);
          const source = parseInt(pParts[1], 10);
          const elem = parseInt(pParts[2], 10);
          if (isAvoid && who === player.uid && n > 0 && source !== player.uid &&
            elem === FiveElementHelper.elem2Int(FiveElement.A)) {
            continue;
          }
          remaining.push(part);
        }
        if (remaining.length > 0) {
          this.innerGMessage(remaining.join(';'), -150);
        }
        if (player.isAlive) {
          this.cure(player, player, 1);
        }
      },
      valid: (player, fuse) => {
        const parts = fuse.split(';');
        for (const part of parts) {
          if (part === '') continue;
          const pParts = part.split(',');
          const who = parseInt(pParts[0], 10);
          const n = parseInt(pParts[3], 10);
          const source = parseInt(pParts[1], 10);
          if (who === player.uid && n > 0 && source !== player.uid &&
            !FiveElementHelper.isSet(parseInt(pParts[4], 10) || 0, HPEvoMask.TUX_INAVO)) {
            return true;
          }
        }
        return false;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SF05 - DEX -2
  // ═══════════════════════════════════════════════

  private sf05Effect(): RuneEffectRegistration {
    return {
      code: 'SF05',
      action: (player, _fuse, _args) => {
        this.raiseGMessage(`G0OA,${player.uid},1,2`);
      },
      valid: (player, _fuse) => {
        return this.board.isAttendWar(player);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SF06 - Self Harm + Chain
  // ═══════════════════════════════════════════════

  private sf06Effect(): RuneEffectRegistration {
    return {
      code: 'SF06',
      action: (player, _fuse, _args) => {
        this.harm(player, player, 1);
        this.raiseGMessage(`G1CK,${player.uid},SF06,0`);
      },
      valid: (player, fuse) => {
        const parts = fuse.split(';');
        return player.isAlive && parts.some(part => {
          if (part === '') return false;
          const pParts = part.split(',');
          const who = parseInt(pParts[0], 10);
          const n = parseInt(pParts[3], 10);
          const mask = parseInt(pParts[4], 10) || 0;
          return who === player.uid && n > 0 && !FiveElementHelper.isSet(mask, HPEvoMask.CHAIN_INVAO);
        });
      },
    };
  }

  // ═══════════════════════════════════════════════
  // SF07 - Adjust Dice
  // ═══════════════════════════════════════════════

  private sf07Effect(): RuneEffectRegistration {
    return {
      code: 'SF07',
      action: (player, _fuse, args) => {
        const dv = this.board.diceValue;
        const vals = [-2, -1, 1, 2].filter(p => dv + p >= 1 && dv + p <= 6);
        const idx = parseInt(args, 10) - 1;
        this.raiseGMessage(`G0T7,${player.uid},${dv},${dv + vals[idx]}`);
        this.innerGMessage(`G0TT${_fuse.substring(_fuse.indexOf(','))}`, 130);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          const dv = this.board.diceValue;
          const vals = [-2, -1, 1, 2].filter(p => dv + p >= 1 && dv + p <= 6);
          return '#请选择调整的数值##' +
            vals.map(p => p > 0 ? `+${p}` : String(p)).join('##') +
            `,/Y${vals.length}`;
        }
        return '';
      },
    };
  }
}
