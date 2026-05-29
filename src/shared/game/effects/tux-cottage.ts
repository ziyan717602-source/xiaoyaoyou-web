/**
 * TuxCottage - Translation of C# PSD.PSDGamepkg.JNS.TuxCottage
 *
 * Hand card effects: JP (technique), TP (special), WQ (weapon),
 * FJ (armor), ZP (combat), and expansion pack cards.
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElement } from '@shared/types/enums';
import { FiveElementHelper, HPEvoMask } from '../card/five-element';
import type { EffectRegistration } from './types';
import type { LibGroup } from '../lib-group';

export class TuxCottage extends JNSBase {
  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    super(board, libGroup, raiseGMessage, innerGMessage, asyncInput);
  }

  /**
   * Register all hand card effects.
   * Returns EffectRegistration[] for the CardEffectRegistry.
   */
  registerAll(): EffectRegistration[] {
    return [
      this.jp01Effect(),
      this.jp02Effect(),
      this.jp03Effect(),
      this.jp04Effect(),
      this.jp05Effect(),
      this.jp06Effect(),
      this.tp01Effect(),
      this.tp02Effect(),
      this.tp03Effect(),
      this.tp04Effect(),
      this.wq02Effect(),
      this.wq04Effect(),
      this.fj01Effect(),
      this.fj02Effect(),
      this.fj03Effect(),
      this.fj04Effect(),
      this.fj05Effect(),
      this.zp01Effect(),
      this.zp02Effect(),
      this.zp03Effect(),
      this.zp04Effect(),
      // Package of 4
      this.jpt1Effect(),
      this.jpt2Effect(),
      this.zpt1Effect(),
      this.tpt1Effect(),
      this.tpt2Effect(),
      this.wqt1Effect(),
      this.wqt2Effect(),
      this.fjt1Effect(),
      this.fjt2Effect(),
      // Package of 5
      this.jpt3Effect(),
      this.jpt4Effect(),
      this.jpt5Effect(),
      this.zpt2Effect(),
      this.zpt3Effect(),
      this.tpt3Effect(),
      this.xbt1Effect(),
      this.xbt2Effect(),
      this.xbt3Effect(),
    ];
  }

  // ═══════════════════════════════════════════════
  // JP - Technique Cards
  // ═══════════════════════════════════════════════

  /** JP01 - TouDao (Steal) */
  private jp01Effect(): EffectRegistration {
    return {
      code: 'JP01',
      action: async (player, _type, _fuse, _argst) => {
        const invs = [...this.board.garden.values()]
          .filter(p => p.uid !== player.uid && p.isTared && p.tux.length > 0)
          .map(p => p.uid);
        const inputFormat = invs.length > 0
          ? `#获得其手牌,T1(p${invs.join('p')})`
          : '/';
        const ai = await this.asyncInput(player.uid, inputFormat, 'JP01', '0');
        if (!ai.startsWith('/')) {
          const from = parseInt(ai, 10);
          this.targetPlayer(player.uid, from);
          await this.asyncInput(
            player.uid,
            `#获得的,C1(${this.board.garden.get(from)!.tux.map(() => 'p0').join('')})`,
            'JP01',
            '0',
          );
          this.raiseGMessage(`G0HQ,0,${player.uid},${from},2,1`);
        }
      },
      valid: (player, _type, _fuse) => {
        return [...this.board.garden.values()].some(
          p => p !== player && p.isTared && p.tux.length > 0,
        );
      },
    };
  }

  /** JP02 - KuiCeTianJi (Divination) */
  private jp02Effect(): EffectRegistration {
    return {
      code: 'JP02',
      action: (player, _type, _fuse, _argst) => {
        if (this.board.monPiles.count >= 2) {
          this.raiseGMessage(`G0XZ,${player.uid},2,1,2`);
        } else {
          this.raiseGMessage(`G0XZ,${player.uid},2,0,1`);
        }
      },
      valid: (_player, _type, _fuse) => {
        return this.board.monPiles.count > 0;
      },
    };
  }

  /** JP03 - WuQiChaoYuan (Heal Team) */
  private jp03Effect(): EffectRegistration {
    return {
      code: 'JP03',
      action: (player, _type, _fuse, _argst) => {
        const friends = [...this.board.garden.values()].filter(
          p => p.isAlive && p.team === player.team,
        );
        this.targetPlayers(player.uid, friends.map(p => p.uid));
        this.cureMultiple(player, friends, 1, FiveElement.AQUA, HPEvoMask.FROM_JP);
      },
    };
  }

  /** JP04 - ShuErGuo (Draw for target) */
  private jp04Effect(): EffectRegistration {
    return {
      code: 'JP04',
      action: async (player, _type, _fuse, _argst) => {
        const to = parseInt(
          await this.asyncInput(
            player.uid,
            `#获得2张补牌,T1${this.formatPlayers(p => p.isTared)}`,
            'JP04',
            '0',
          ),
          10,
        );
        this.targetPlayer(player.uid, to);
        this.raiseGMessage(`G0DH,${to},0,2`);
      },
    };
  }

  /** JP05 - TianLeiPo (Thunder Attack) */
  private jp05Effect(): EffectRegistration {
    return {
      code: 'JP05',
      action: async (player, type, fuse, _argst) => {
        if (type === 0) {
          const to = parseInt(
            await this.asyncInput(
              player.uid,
              `#攻击,T1${this.formatPlayers(p => p.isTared)}`,
              'JP05',
              '0',
            ),
            10,
          );
          this.targetPlayer(player.uid, to);
          this.harm(player, this.board.garden.get(to)!, 2, FiveElement.THUNDER, HPEvoMask.FROM_JP);
        } else if (type === 1) {
          const to = parseInt(fuse.substring('R#EV,'.length), 10);
          this.targetPlayer(player.uid, to);
          this.harm(player, this.board.garden.get(to)!, 2, FiveElement.THUNDER, HPEvoMask.FROM_JP);
        }
      },
    };
  }

  /** JP06 - TongQianBiao (Copper Coin Dart) */
  private jp06Effect(): EffectRegistration {
    return {
      code: 'JP06',
      action: async (player, _type, _fuse, _argst) => {
        const targets = [...this.board.garden.values()]
          .filter(p => p.isTared && p.listOutAllCards().some(c => !this.board.protectedTux.includes(c)))
          .map(p => p.uid);
        const first = await this.asyncInput(
          player.uid,
          targets.length > 0
            ? `#弃置,T1(p${targets.join('p')})`
            : '/',
          'JP06',
          '0',
        );
        let valid = false;
        if (!first.startsWith('/')) {
          const owner = parseInt(first, 10);
          const py = this.board.garden.get(owner)!;
          const secondFormat = py.listOutAllCardsWithEncrypt()
            .filter(c => !this.board.protectedTux.includes(c));
          const secondStr = secondFormat.length > 0
            ? `#弃置的,C1(p${secondFormat.join('p')})`
            : '/';
          const second = await this.asyncInput(player.uid, secondStr, `JP06,${first}`, '0');
          if (!second.startsWith('/')) {
            const card = parseInt(second, 10);
            this.targetPlayer(player.uid, owner);
            if (card === 0) {
              this.raiseGMessage(`G0DH,${owner},2,1`);
            } else {
              this.raiseGMessage(`G0QZ,${owner},${card}`);
            }
            valid = true;
          }
        }
        if (!valid) {
          // Invalid JP06 usage - no output needed
        }
      },
      valid: (player, _type, _fuse) => {
        if ([...this.board.garden.values()].some(
          p => p !== player && p.isTared && p.hasAnyCards(),
        )) {
          return true;
        }
        return player.tux.length > 0 || player.hasAnyEquips();
      },
    };
  }

  // ═══════════════════════════════════════════════
  // TP - Special Cards
  // ═══════════════════════════════════════════════

  /** TP01 - BingXinJue (Cancel Card) */
  private tp01Effect(): EffectRegistration {
    return {
      code: 'TP01',
      action: (player, _type, fuse, _args) => {
        const idx1 = 'G0CD'.length;
        const idx2 = fuse.indexOf(',', idx1 + 1);
        const idx3 = fuse.indexOf(',', idx2 + 1);
        const jdx = fuse.indexOf(';');
        this.raiseGMessage(
          `G2CL,${fuse.substring(idx1 + 1, idx2)},${fuse.substring(idx3 + 1, jdx)}`,
        );
        const kdx = fuse.indexOf(',', jdx);
        if (kdx >= 0) {
          const origin = fuse.substring(kdx + 1);
          if (origin.startsWith('G0CD')) {
            this.innerGMessage(origin, 1);
          } else if (origin.startsWith('G')) {
            const hdx = fuse.indexOf(';');
            const argv = fuse.substring(0, hdx).split(',');
            // argv[3] is the card code
            const inType = parseInt(fuse.substring(hdx + 1, fuse.indexOf(',', hdx)), 10);
            // Card priorities and termini would be looked up from the library
            // For now, forward the inner message
            if (argv.length > 4) {
              const isTermini = argv[4] === '1';
              if (isTermini) {
                this.innerGMessage(origin, 1);
              }
            }
          }
        }
      },
      valid: (player, _type, fuse) => {
        const blocks = fuse.split(',');
        const cardValid = blocks[2] !== '1';
        const teammate = this.board.garden.get(parseInt(blocks[1], 10))?.team === player.team;
        return cardValid && (!player.isTPOpt || !teammate);
      },
    };
  }

  /** TP02 - LingHuXianDan (Spirit Gourd Pill) */
  private tp02Effect(): EffectRegistration {
    return {
      code: 'TP02',
      action: async (player, type, _fuse, _args) => {
        if (type === 0) {
          this.cure(player, player, 2);
        } else if (type === 1) {
          const invs = [...this.board.garden.values()]
            .filter(p => p.isTared && p.hp === 0)
            .map(p => p.uid);
          const ic = invs.length > 0 ? `T1(p${invs.join('p')})` : '/';
          const tg = parseInt(await this.asyncInput(player.uid, ic, 'TP02', '0'), 10);
          if (invs.includes(tg)) {
            this.targetPlayer(player.uid, tg);
            this.cure(player, this.board.garden.get(tg)!, 2);
          }
          this.innerGMessage('G0ZH,0', 0);
        }
      },
      valid: (player, type, _fuse) => {
        if (type === 0) return true;
        if (type === 1) return [...this.board.garden.values()].some(p => p.isTared && p.hp === 0);
        return false;
      },
      bribe: (player, type, _fuse) => {
        if (type === 0) {
          const r = this.board.rounder;
          return r !== null && r.uid === player.uid && !r.tpDisabled;
        }
        return !player.tpDisabled;
      },
    };
  }

  /** TP03 - YinGu (Hidden Gu) */
  private tp03Effect(): EffectRegistration {
    return {
      code: 'TP03',
      action: (player, _type, fuse, _args) => {
        // Parse harms from fuse, remove self-damage that isn't immune
        const parts = fuse.split(';');
        const remaining: string[] = [];
        for (const part of parts) {
          if (part === '') continue;
          // Each harm entry: who,source,element,n,mask
          const harmParts = part.split(',');
          const who = parseInt(harmParts[0], 10);
          const n = parseInt(harmParts[3], 10);
          const mask = parseInt(harmParts[4], 10) || 0;
          if (who === player.uid && n > 0 && !FiveElementHelper.isSet(mask, HPEvoMask.TUX_INAVO)) {
            // Skip this harm
          } else {
            remaining.push(part);
          }
        }
        if (remaining.length > 0) {
          this.innerGMessage(remaining.join(';'), 0);
        }
      },
      valid: (player, _type, fuse) => {
        const parts = fuse.split(';');
        for (const part of parts) {
          if (part === '') continue;
          const harmParts = part.split(',');
          const who = parseInt(harmParts[0], 10);
          const n = parseInt(harmParts[3], 10);
          const mask = parseInt(harmParts[4], 10) || 0;
          if (who === player.uid && n > 0 && !FiveElementHelper.isSet(mask, HPEvoMask.TUX_INAVO)) {
            return true;
          }
        }
        return false;
      },
    };
  }

  /** TP04 - Draw for teammate */
  private tp04Effect(): EffectRegistration {
    return {
      code: 'TP04',
      action: async (player, _type, _fuse, _argst) => {
        const gamer = parseInt(
          await this.asyncInput(
            player.uid,
            `T1${this.aTeammatesTared(player)}`,
            'TP04',
            '0',
          ),
          10,
        );
        this.targetPlayer(player.uid, gamer);
        this.raiseGMessage(`G0XZ,${gamer},2,0,1`);
      },
      valid: (_player, _type, _fuse) => {
        return this.board.monPiles.count > 0;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // WQ - Weapon Equipment
  // ═══════════════════════════════════════════════

  /** WQ02 - Consume: +1 HP healing */
  private wq02Effect(): EffectRegistration {
    return {
      code: 'WQ02',
      consumeValid: (player, consumeType, _type, fuse) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 && !FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT)) {
              return true;
            }
          }
        }
        return false;
      },
      consumeAction: (player, consumeType, _type, fuse, _argst) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          const modified: string[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            let n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 && !FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT)) {
              n++;
              pParts[3] = n.toString();
            }
            modified.push(pParts.join(','));
          }
          this.innerGMessage(modified.join(';'), 11);
        }
      },
    };
  }

  /** WQ04 - MoJian (Magic Sword) 典当: Discard to draw 2 cards */
  private wq04Effect(): EffectRegistration {
    // WQ04 numeric ID is 50 (from tux.json Range: [50, 50])
    const WQ04_ID = 50;
    return {
      code: 'WQ04',
      valid: (player, _type, _fuse) => {
        // 典当 is valid if player has WQ04 in hand or as equipped weapon
        return player.tux.includes(WQ04_ID) || player.weapon === WQ04_ID;
      },
      action: async (player, _type, _fuse, _argst) => {
        // Discard WQ04 from hand (priority) or weapon slot
        if (player.tux.includes(WQ04_ID)) {
          const idx = player.tux.indexOf(WQ04_ID);
          player.tux.splice(idx, 1);
          this.raiseGMessage(`G0QZ,${player.uid},${WQ04_ID}`);
        } else if (player.weapon === WQ04_ID) {
          player.weapon = 0;
          this.raiseGMessage(`G0QZ,${player.uid},${WQ04_ID}`);
        }
        // Draw 2 cards
        this.raiseGMessage(`G0DH,${player.uid},0,2`);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // FJ - Armor Equipment
  // ═══════════════════════════════════════════════

  /** FJ01 - Consume: revive with 2 HP when at 0 HP */
  private fj01Effect(): EffectRegistration {
    return {
      code: 'FJ01',
      consumeValid: (player, consumeType, _type, _fuse) => {
        return consumeType === 1 && player.isAlive && player.hp === 0;
      },
      consumeAction: (player, consumeType, _type, _fuse, _argst) => {
        if (consumeType === 1) {
          this.cure(player, player, 2);
          const zeros = [...this.board.garden.values()].filter(p => p.isAlive && p.hp === 0);
          if (zeros.length > 0) {
            this.innerGMessage('G0ZH,0', 0);
          }
        }
      },
    };
  }

  /** FJ02 - Consume Holder: discard to prevent damage (like TP03) */
  private fj02Effect(): EffectRegistration {
    return {
      code: 'FJ02',
      consumeValidHolder: (provider, _user, consumeType, _type, fuse) => {
        if (consumeType === 0 && provider.tux.length > 0) {
          const lfidx = fuse.indexOf(':');
          const pureFuse = fuse.substring(lfidx + 1);
          // Check if TP03 would be valid with this fuse
          const parts = pureFuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (n > 0 && !FiveElementHelper.isSet(mask, HPEvoMask.TUX_INAVO)) {
              return true;
            }
          }
        }
        return false;
      },
      consumeActionHolder: (provider, _user, consumeType, _type, fuse, argst) => {
        if (consumeType === 0) {
          const card = parseInt(argst, 10);
          const lfidx = fuse.indexOf(':');
          const pureFuse = fuse.substring(lfidx + 1);
          if (card !== 0) {
            this.raiseGMessage(
              `G0CC,${provider.uid},0,${_user.uid},TP03,${card};0,${pureFuse}`,
            );
          }
        }
      },
      consumeInputHolder: (provider, _user, _consumeType, _type, _fuse, prev) => {
        if (prev === '') {
          return `/Q1(p${provider.tux.join('p')})`;
        }
        return '';
      },
    };
  }

  /** FJ03 - Consume: reduce damage by 1 */
  private fj03Effect(): EffectRegistration {
    return {
      code: 'FJ03',
      consumeValid: (player, consumeType, _type, fuse) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
              return true;
            }
          }
        }
        return false;
      },
      consumeAction: (player, consumeType, _type, fuse, _argst) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          const remaining: string[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            let n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
              n--;
              pParts[3] = n.toString();
            }
            if (n > 0) remaining.push(pParts.join(','));
          }
          if (remaining.length > 0) {
            this.innerGMessage(remaining.join(';'), -9);
          }
        }
      },
    };
  }

  /** FJ04 - Consume: remove JP damage */
  private fj04Effect(): EffectRegistration {
    return {
      code: 'FJ04',
      consumeValid: (player, consumeType, _type, fuse) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              FiveElementHelper.isSet(mask, HPEvoMask.FROM_JP) && !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO)) {
              return true;
            }
          }
        }
        return false;
      },
      consumeAction: (player, consumeType, _type, fuse, _argst) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          const remaining: string[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              FiveElementHelper.isSet(mask, HPEvoMask.FROM_JP) && !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO)) {
              continue; // Remove this harm
            }
            remaining.push(pParts.join(','));
          }
          if (remaining.length > 0) {
            this.innerGMessage(remaining.join(';'), -49);
          }
        }
      },
    };
  }

  /** FJ05 - Consume: absorb damage and heal 1 HP */
  private fj05Effect(): EffectRegistration {
    return {
      code: 'FJ05',
      consumeValid: (player, consumeType, _type, fuse) => {
        if (consumeType === 1) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO)) {
              return true;
            }
          }
        }
        return false;
      },
      consumeAction: (player, consumeType, _type, fuse, _argst) => {
        if (consumeType === 1) {
          const parts = fuse.split(';');
          const remaining: string[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO)) {
              continue; // Absorb this harm
            }
            remaining.push(pParts.join(','));
          }
          this.cure(player, player, 1);
          if (remaining.length > 0) {
            this.innerGMessage(remaining.join(';'), 0);
          }
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // ZP - Combat Cards
  // ═══════════════════════════════════════════════

  /** ZP01 - End Battle */
  private zp01Effect(): EffectRegistration {
    return {
      code: 'ZP01',
      action: (player, _type, _fuse, _argst) => {
        this.raiseGMessage(`G2GOTO,R${this.board.rounder.uid}Z2`);
      },
      valid: (player, _type, _fuse) => {
        return this.board.isAttendWar(player);
      },
    };
  }

  /** ZP02 - TianGangZhanQi: gain STRa as bonus */
  private zp02Effect(): EffectRegistration {
    return {
      code: 'ZP02',
      action: (player, _type, _fuse, _argst) => {
        if (player.strA > 0) {
          this.raiseGMessage(`G0IA,${player.uid},1,${player.strA}`);
        }
      },
      valid: (player, _type, _fuse) => {
        return this.board.isAttendWarSucc(player);
      },
    };
  }

  /** ZP03 - JinCanWang: +3 STR */
  private zp03Effect(): EffectRegistration {
    return {
      code: 'ZP03',
      action: (player, _type, _fuse, _argst) => {
        this.raiseGMessage(`G0IA,${player.uid},1,3`);
      },
      valid: (player, _type, _fuse) => {
        return this.board.isAttendWarSucc(player);
      },
    };
  }

  /** ZP04 - TianXuanWuYin: choose side, +2 power */
  private zp04Effect(): EffectRegistration {
    return {
      code: 'ZP04',
      action: async (player, _type, _fuse, _argst) => {
        const side = parseInt(await this.asyncInput(player.uid, 'S', 'ZP04', '0'), 10);
        this.raiseGMessage(`G0IP,${side},2`);
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Package of 4
  // ═══════════════════════════════════════════════

  /** JPT1 - XunHua (Tame) */
  private jpt1Effect(): EffectRegistration {
    return {
      code: 'JPT1',
      action: async (player, type, _fuse, _argst) => {
        const domestOnly = type === 1;
        const b1 = [...this.board.garden.values()].some(p => p.isAlive && p.getPetCount() > 0) && !domestOnly;
        const b2 = (player.tux.length > 0 || !_argst.startsWith('0')) &&
          [...this.board.garden.values()].some(p =>
            p.isAlive && p.getPetCount() > 0 &&
            [...this.board.garden.values()].some(q => q.isTared && q.team === p.team && p.uid !== q.uid),
          );

        let costr = '';
        if (b1 && b2) costr = '#请选择【驯化】执行项。##开牌##驯化,Y2';
        else if (b1) costr = '#请选择【驯化】执行项。##开牌,Y1';
        else if (b2) costr = '#请选择【驯化】执行项。##驯化,Y1';
        if (costr !== '') {
          const choice = await this.asyncInput(player.uid, costr, 'JPT1', '0');
          if (choice === '2' || (choice === '1' && b2 && !b1)) {
            // Tame mode: transfer pet
            if (player.tux.length > 0) {
              const qzStr = await this.asyncInput(
                player.uid,
                `#弃置的,Q1(p${player.tux.join('p')})`,
                'JPT1',
                '0',
              );
              const ut = parseInt(qzStr, 10);
              this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
            }
          }
        }
      },
      valid: (player, type, _fuse) => {
        const b1 = [...this.board.garden.values()].some(p => p.isAlive && p.getPetCount() > 0);
        const b2 = player.tux.length > 1 && [...this.board.garden.values()].some(p =>
          p.isAlive && p.getPetCount() > 0 &&
          [...this.board.garden.values()].some(q => q.isTared && q.team === p.team && p.uid !== q.uid),
        );
        return (type === 0 && b1) || b2;
      },
    };
  }

  /** JPT2 - Draw for teammates */
  private jpt2Effect(): EffectRegistration {
    return {
      code: 'JPT2',
      action: (player, _type, _fuse, _argst) => {
        const list = this.board.orderedPlayer();
        const pys = list
          .map(p => this.board.garden.get(p)!)
          .filter(p => p != null && p.isAlive && p.team === player.team);
        if (pys.length > 0) {
          this.targetPlayers(player.uid, pys.map(p => p.uid));
          this.raiseGMessage(
            `G0DH,${pys.map(p => `${p.uid},0,1`).join(',')}`,
          );
        }
      },
    };
  }

  /** ZPT1 - Choose side for combat bonus */
  private zpt1Effect(): EffectRegistration {
    return {
      code: 'ZPT1',
      action: async (player, _type, _fuse, _argst) => {
        const val = (this.board.isAttendWarSucc(player) || !this.board.isAttendWar(player)) ? 1 : 4;
        const side = parseInt(await this.asyncInput(player.uid, 'S', 'ZPT1', '0'), 10);
        this.raiseGMessage(`G0IP,${side},${val}`);
      },
    };
  }

  /** TPT1 - Steal pet or reduce damage */
  private tpt1Effect(): EffectRegistration {
    return {
      code: 'TPT1',
      action: async (player, type, fuse, _argst) => {
        if (type === 0) {
          // Steal pet mode
          const targets = [...this.board.garden.values()]
            .filter(p => p.isTared && p.team === player.oppTeam && p.getPetCount() > 0)
            .filter(p => !this.board.petProtectedPlayer.includes(p.uid))
            .map(p => p.uid);
          if (targets.length > 0) {
            const whoStr = await this.asyncInput(
              player.uid,
              `#夺宠,T1(p${targets.join('p')})`,
              'TPT1',
              '0',
            );
            this.raiseGMessage(`G1XR,${whoStr}`);
          }
        } else if (type === 1) {
          // Reduce multi-damage to 1
          const parts = fuse.split(';');
          const invs = new Set<number>();
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (n > 1 && this.board.garden.has(who) &&
              this.board.garden.get(who)!.isTared &&
              !FiveElementHelper.isSet(mask, HPEvoMask.TUX_INAVO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
              invs.add(who);
            }
          }
          if (invs.size > 0) {
            const who = parseInt(
              await this.asyncInput(
                player.uid,
                `T1(p${[...invs].join('p')})`,
                'TPT1',
                '0',
              ),
              10,
            );
            this.targetPlayer(player.uid, who);
            // Reduce damages for the chosen player
            const modified: string[] = [];
            for (const part of parts) {
              if (part === '') continue;
              const pParts = part.split(',');
              const whoP = parseInt(pParts[0], 10);
              let n = parseInt(pParts[3], 10);
              const mask = parseInt(pParts[4], 10) || 0;
              if (whoP === who && n > 1 &&
                !FiveElementHelper.isSet(mask, HPEvoMask.TUX_INAVO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
                n = 1;
                pParts[3] = '1';
                if (FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT)) {
                  const newMask = mask & ~HPEvoMask.FINAL_MASK;
                  pParts[4] = newMask.toString();
                }
              }
              modified.push(pParts.join(','));
            }
            if (modified.length > 0) {
              this.innerGMessage(modified.join(';'), 85);
            }
          }
        }
      },
      valid: (player, type, fuse) => {
        if (type === 0) {
          return [...this.board.garden.values()].some(p =>
            p.isTared && p.team === player.oppTeam && p.getPetCount() > 0,
          );
        } else if (type === 1) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (n > 1) {
              const who = parseInt(pParts[0], 10);
              const py = this.board.garden.get(who);
              if (py && py.isTared && !FiveElementHelper.isSet(mask, HPEvoMask.TUX_INAVO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
                return true;
              }
            }
          }
        }
        return false;
      },
    };
  }

  /** TPT2 - Lingering effect / fake equip / draw */
  private tpt2Effect(): EffectRegistration {
    return {
      code: 'TPT2',
      action: async (player, type, _fuse, _argst) => {
        if (type === 1) {
          const who = parseInt(
            await this.asyncInput(
              player.uid,
              `#获得补牌的,T1${this.aAllTareds(player)}`,
              'TPT2Action',
              '0',
            ),
            10,
          );
          this.raiseGMessage(`G0DH,${who},0,1`);
        }
      },
      valid: (_player, _type, _fuse) => {
        return [...this.board.garden.values()].some(p => p.isTared);
      },
      bribe: (player, type, _fuse) => {
        if (type === 0) {
          const r = this.board.rounder;
          return r !== null && r.uid === player.uid && !r.tpDisabled;
        }
        return !player.tpDisabled;
      },
    };
  }

  /** WQT1 - Consume: force hit */
  private wqt1Effect(): EffectRegistration {
    return {
      code: 'WQT1',
      consumeValid: (player, consumeType, _type, _fuse) => {
        return consumeType === 1 && this.board.isAttendWar(player) && player.strA > 0;
      },
      consumeAction: (player, consumeType, _type, _fuse, _argst) => {
        if (consumeType === 1) {
          this.raiseGMessage(`G0IX,${player.uid},2`);
        }
      },
    };
  }

  /** WQT2 - Consume: double STR */
  private wqt2Effect(): EffectRegistration {
    return {
      code: 'WQT2',
      consumeValid: (player, consumeType, _type, _fuse) => {
        return consumeType === 1 && this.board.isAttendWar(player) && player.strA > 0;
      },
      consumeAction: (player, consumeType, _type, _fuse, _argst) => {
        if (consumeType === 1) {
          this.raiseGMessage(`G0IA,${player.uid},1,${player.strA}`);
        }
      },
    };
  }

  /** FJT1 - Consume: redirect damage */
  private fjt1Effect(): EffectRegistration {
    return {
      code: 'FJT1',
      consumeValid: (player, consumeType, _type, fuse) => {
        if (consumeType === 0) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
              return player.tux.length > 0 && [...this.board.garden.values()].some(
                p => p.team === player.oppTeam && p.isTared,
              );
            }
          }
        }
        return false;
      },
      consumeAction: (player, consumeType, _type, fuse, argst) => {
        if (consumeType === 0) {
          const idx = argst.indexOf(',');
          const ut = parseInt(argst.substring(0, idx), 10);
          const to = parseInt(argst.substring(idx + 1), 10);
          this.raiseGMessage(`G0HQ,0,${to},${player.uid},1,1,${ut}`);
          // Forward modified harm
          this.innerGMessage(fuse, -109);
        }
      },
      consumeInput: (player, _consumeType, _type, _fuse, prev) => {
        if (prev === '') {
          return `#交给对方,/Q1(p${player.tux.join('p')}),#交给的,/T1${this.aEnemyTared(player)}`;
        }
        return '';
      },
    };
  }

  /** FJT2 - Consume: absorb damage to 1, draw 1 card */
  private fjt2Effect(): EffectRegistration {
    return {
      code: 'FJT2',
      consumeValid: (player, consumeType, _type, fuse) => {
        if (consumeType === 1) {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
              return true;
            }
          }
        }
        return false;
      },
      consumeAction: (player, consumeType, _type, fuse, _argst) => {
        if (consumeType === 1) {
          const parts = fuse.split(';');
          const modified: string[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            let n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO)) {
              n = 1;
              pParts[3] = '1';
              if (FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT)) {
                const newMask = mask & ~HPEvoMask.FINAL_MASK;
                pParts[4] = newMask.toString();
              }
            }
            modified.push(pParts.join(','));
          }
          if (modified.length > 0) {
            this.innerGMessage(modified.join(';'), 85);
          }
          if (player.isAlive) {
            this.raiseGMessage(`G0DH,${player.uid},0,1`);
          }
        }
      },
    };
  }

  // ═══════════════════════════════════════════════
  // Package of 5
  // ═══════════════════════════════════════════════

  /** JPT3 - Exchange cards or pets */
  private jpt3Effect(): EffectRegistration {
    return {
      code: 'JPT3',
      action: async (player, _type, _fuse, _argst) => {
        const g = this.board.garden;
        const xgTuxValid = [...g.values()].filter(
          p => p.isTared && p.team === player.team && p.tux.length > 0,
        ).length >= 2;
        const xgPetValid = [...g.values()].filter(
          p => p.isTared && p.team === player.team && p.getPetCount() > 0,
        ).length >= 2;
        let hint = '#请选择执行项##触发事件';
        if (xgTuxValid) hint += '##交换手牌';
        if (xgPetValid) hint += '##交换宠物';
        const cnt = 1 + (xgTuxValid ? 1 : 0) + (xgPetValid ? 1 : 0);
        const input = await this.asyncInput(player.uid, hint + ',Y' + cnt, 'JPT3', '0');
        if (input === '2' && xgTuxValid) {
          const targets = await this.asyncInput(
            player.uid,
            `#交换手牌,T2(p${[...g.values()].filter(
              p => p.isTared && p.team === player.team && p.tux.length > 0,
            ).map(p => p.uid).join('p')})`,
            'JPT3',
            '1',
          );
          const cmidx = targets.indexOf(',');
          const iv = parseInt(targets.substring(0, cmidx), 10);
          const jv = parseInt(targets.substring(cmidx + 1), 10);
          const mn = Math.min(3, Math.min(g.get(iv)!.tux.length, g.get(jv)!.tux.length));
          this.targetPlayers(player.uid, [iv, jv]);
          this.raiseGMessage(`G1XR,2,${iv},${jv},0,${mn}`);
        } else if (input === '2' || input === '3') {
          // Exchange pets
        } else {
          // Trigger event
          this.raiseGMessage(`G1EV,${player.uid},1`);
        }
      },
    };
  }

  /** JPT4 - Damage based on pet count */
  private jpt4Effect(): EffectRegistration {
    return {
      code: 'JPT4',
      action: async (player, _type, _fuse, _argst) => {
        const to = parseInt(
          await this.asyncInput(
            player.uid,
            `T1${this.formatPlayers(p => p.isTared)}`,
            'JPT4',
            '0',
          ),
          10,
        );
        this.targetPlayer(player.uid, to);
        const py = this.board.garden.get(to)!;
        this.harm(player, py, Math.max(py.getPetCount(), 1), FiveElement.A, HPEvoMask.FROM_JP);
      },
    };
  }

  /** JPT5 - NPC interaction */
  private jpt5Effect(): EffectRegistration {
    return {
      code: 'JPT5',
      action: async (player, _type, _fuse, _argst) => {
        const to = parseInt(
          await this.asyncInput(
            player.uid,
            `#【JPT5】作用,T1${this.aAllTareds(player)}`,
            'JPT5',
            '0',
          ),
          10,
        );
        if (this.board.restNpcPiles.count > 0) {
          const pop = this.board.restNpcPiles.dequeue();
          this.raiseGMessage(`G1IM,${pop}`);
        }
      },
    };
  }

  /** ZPT2 - Choose hit+3 or STR+2 */
  private zpt2Effect(): EffectRegistration {
    return {
      code: 'ZPT2',
      action: async (player, _type, _fuse, _argst) => {
        const input = await this.asyncInput(
          player.uid,
          '#请选择执行项##命中+3##战力+2,Y2',
          'ZPT2',
          '0',
        );
        if (input === '1') {
          this.raiseGMessage(`G0IX,${player.uid},1,3`);
        } else {
          this.raiseGMessage(`G0IA,${player.uid},1,2`);
        }
      },
      valid: (player, _type, _fuse) => {
        return this.board.isAttendWar(player);
      },
    };
  }

  /** ZPT3 - Choose various combat bonuses */
  private zpt3Effect(): EffectRegistration {
    return {
      code: 'ZPT3',
      action: async (player, _type, _fuse, _argst) => {
        const input = await this.asyncInput(
          player.uid,
          '#请选择执行项##任意命中+1##自战力加成##自命中加成,Y3',
          'ZPT3',
          '0',
        );
        if (input === '1') {
          const target = await this.asyncInput(
            player.uid,
            `T1${this.aAllTareds(player)}`,
            'ZPT3',
            '1',
          );
          this.raiseGMessage(`G0IX,${target},1,1`);
        } else if (input === '2') {
          if (player.dexA > 0) {
            this.raiseGMessage(`G0IA,${player.uid},1,${player.dexA}`);
          }
        } else if (input === '3') {
          if (player.strA > 0) {
            this.raiseGMessage(`G0IX,${player.uid},1,${player.strA}`);
          }
        }
      },
    };
  }

  /** TPT3 - Cancel card for opponent */
  private tpt3Effect(): EffectRegistration {
    return {
      code: 'TPT3',
      action: (player, type, fuse, _argst) => {
        if (type === 1) {
          // Same as TP01Action
          const idx1 = 'G0CD'.length;
          const idx2 = fuse.indexOf(',', idx1 + 1);
          const idx3 = fuse.indexOf(',', idx2 + 1);
          const jdx = fuse.indexOf(';');
          this.raiseGMessage(
            `G2CL,${fuse.substring(idx1 + 1, idx2)},${fuse.substring(idx3 + 1, jdx)}`,
          );
        }
      },
      valid: (player, type, fuse) => {
        if (type === 0 || type === 1) {
          const idx = fuse.indexOf(';');
          const blocks = fuse.substring(0, idx).split(',');
          const py = this.board.garden.get(parseInt(blocks[1], 10));
          const typeMatch = blocks[2] !== '1';
          return py != null && py.team === player.oppTeam && typeMatch;
        }
        return false;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // XBT - Luggage
  // ═══════════════════════════════════════════════

  /** XBT1 - InsAction: draw 1 card */
  private xbt1Effect(): EffectRegistration {
    return {
      code: 'XBT1',
      insAction: (player) => {
        this.raiseGMessage(`G0DH,${player.uid},0,1`);
      },
    };
  }

  /** XBT2 - InsAction: draw 1 card */
  private xbt2Effect(): EffectRegistration {
    return {
      code: 'XBT2',
      insAction: (player) => {
        this.raiseGMessage(`G0DH,${player.uid},0,1`);
      },
    };
  }

  /** XBT3 - InsAction: draw 1 card */
  private xbt3Effect(): EffectRegistration {
    return {
      code: 'XBT3',
      insAction: (player) => {
        this.raiseGMessage(`G0DH,${player.uid},0,1`);
      },
    };
  }
}
