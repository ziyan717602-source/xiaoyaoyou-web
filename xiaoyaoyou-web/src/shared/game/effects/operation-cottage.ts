/**
 * OperationCottage - Translation of C# PSD.PSDGamepkg.JNS.OperationCottage
 *
 * Operation effects: CZ01 (buy), CZ02 (melee), CZ03 (NPC rescue),
 * CZ04 (illusion), CZ05 (fake equip).
 *
 * NOTE: OperationCottage does NOT extend JNSBase (matches C#).
 */
import { Player } from '../player';
import { Board } from '../board';
import type { OpEffectRegistration } from './types';
import type { LibGroup } from '../lib-group';

export class OperationCottage {
  private board: Board;
  private libGroup: LibGroup;
  private raiseGMessage: (msg: string) => void;
  private asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>;

  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    this.board = board;
    this.libGroup = libGroup;
    this.raiseGMessage = raiseGMessage;
    this.asyncInput = asyncInput;
  }

  /** Register all operation effects */
  registerAll(): OpEffectRegistration[] {
    return [
      this.cz01Effect(),
      this.cz02Effect(),
      this.cz03Effect(),
      this.cz04Effect(),
      this.cz05Effect(),
    ];
  }

  // ═══════════════════════════════════════════════
  // CZ01 - GouMai (Buy)
  // ═══════════════════════════════════════════════

  private cz01Effect(): OpEffectRegistration {
    return {
      code: 'CZ01',
      action: (player, _fuse, args) => {
        const card = parseInt(args, 10);
        const tux = this.libGroup.tl.decodeTux(card);
        const price = player.getPrice(tux ? tux.code : '', false);
        this.raiseGMessage(`G0QZ,${player.uid},${card}`);
        if (price > 0) {
          this.raiseGMessage(`G0DH,${player.uid},0,${price}`);
        }
      },
      input: (player, _fuse, prev) => {
        if (prev !== '') return '';
        const goods: number[] = [];
        goods.push(...player.tux.filter(p => {
          const tux = this.libGroup.tl.decodeTux(p);
          return tux && player.getPrice(tux.code, false) > 0;
        }));
        if (!player.weaponDisabled) {
          goods.push(...player.listOutAllEquips().filter(p => {
            const tux = this.libGroup.tl.decodeTux(p);
            return tux && player.getPrice(tux.code, true) > 0;
          }));
        }
        return `/Q1(p${goods.join('p')})`;
      },
      valid: (player, fuse) => {
        const idx = fuse.indexOf('R');
        const who = fuse.charCodeAt(idx + 1) - 48; // '0' = 48
        return player.uid === who && (
          player.tux.some(p => {
            const tux = this.libGroup.tl.decodeTux(p);
            return tux && player.getPrice(tux.code, false) > 0;
          }) ||
          player.listOutAllEquips().some(p => {
            const tux = this.libGroup.tl.decodeTux(p);
            return tux && player.getPrice(tux.code, true) > 0;
          })
        );
      },
    };
  }

  // ═══════════════════════════════════════════════
  // CZ02 - HunZhan (Melee)
  // ═══════════════════════════════════════════════

  private cz02Effect(): OpEffectRegistration {
    return {
      code: 'CZ02',
      action: async (player, _fuse, _args) => {
        this.raiseGMessage('G1SG,0');
        const yes = await this.asyncInput(
          player.uid,
          '#是否发动混战？##不发动##发动,Y2',
          'CZ02',
          '0',
        );
        if (yes === '2') {
          const mons = this.board.monPiles.dequeue();
          this.raiseGMessage('G2IN,1,1');
          this.raiseGMessage(`G0HZ,${player.uid},${mons}`);
        } else {
          this.raiseGMessage(`G0HZ,${player.uid},0`);
        }
      },
      valid: (player, fuse) => {
        const idx = fuse.indexOf('R');
        const who = fuse.charCodeAt(idx + 1) - 48;
        if (player.uid === who) {
          return !this.board.fightTangled && this.board.monPiles.count > 0;
        }
        return false;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // CZ03 - NPC Rescue
  // ═══════════════════════════════════════════════

  private cz03Effect(): OpEffectRegistration {
    return {
      code: 'CZ03',
      action: async (player, _fuse, args) => {
        const which = parseInt(args, 10);
        if (player.escue.includes(which)) {
          player.escue.splice(player.escue.indexOf(which), 1);
          this.raiseGMessage(`G2OL,${player.uid},${which}`);
          const side = parseInt(await this.asyncInput(player.uid, 'S', 'CZ03', '0'), 10);
          this.raiseGMessage(`G0IP,${side},1`);
        }
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          return `/M1(p${player.escue.join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return player.escue.length > 0;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // CZ04 - HuanHua (Illusion)
  // ═══════════════════════════════════════════════

  private cz04Effect(): OpEffectRegistration {
    return {
      code: 'CZ04',
      action: (player, _fuse, argst) => {
        const parts = argst.split(',');
        const trove = parseInt(parts[0], 10);
        const asDbSerial = parseInt(parts[1], 10);
        const callUt = parseInt(parts[2], 10);
        this.raiseGMessage(`G0QZ,${player.uid},${callUt}`);
        this.raiseGMessage(`G2UL,${player.uid},${trove},${asDbSerial}`);
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          const troves: number[] = [];
          if (player.trove !== 0) troves.push(player.trove);
          if (player.exEquip !== 0 && (player.exMask & 0x4) !== 0) troves.push(player.exEquip);
          return `#执行幻化,/Q1(p${troves.join('p')})`;
        } else if (!prev.includes(',')) {
          const trove = parseInt(prev, 10);
          return `#幻化弃置,/Q1(p${player.tux.join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        if (player.troveDisabled) return false;
        if (player.tux.length <= 0) return false;
        // Check for valid illusions
        if (player.trove !== 0) return true;
        if (player.exEquip !== 0 && (player.exMask & 0x4) !== 0) return true;
        return false;
      },
    };
  }

  // ═══════════════════════════════════════════════
  // CZ05 - ZhuangBei CaoZuo (Fake Equip Operation)
  // ═══════════════════════════════════════════════

  private cz05Effect(): OpEffectRegistration {
    return {
      code: 'CZ05',
      action: async (player, _fuse, args) => {
        const card = parseInt(args, 10);
        if (this.board.csEquips.includes(`${player.uid},${card}`)) return;
        if (player.fakeq.has(card)) {
          const fakeqCode = player.fakeq.get(card);
          if (fakeqCode === 'TPT2' || (fakeqCode === '0' && true)) {
            this.raiseGMessage(`G0QZ,${player.uid},${card}`);
            const side = parseInt(
              await this.asyncInput(player.uid, '#战力增加,S', 'CZ05', '0'),
              10,
            );
            this.raiseGMessage(`G0IP,${side},2`);
          }
        }
      },
      input: (player, _fuse, prev) => {
        if (prev === '') {
          const uts = [...player.fakeq.keys()].filter(
            p => !this.board.csEquips.includes(`${player.uid},${p}`),
          );
          return `/C1(p${uts.join('p')})`;
        }
        return '';
      },
      valid: (player, _fuse) => {
        return [...player.fakeq.keys()].some(
          p => !this.board.csEquips.includes(`${player.uid},${p}`),
        );
      },
    };
  }
}
