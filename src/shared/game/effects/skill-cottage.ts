/**
 * SkillCottage - Translation of C# PSD.PSDGamepkg.JNS.SkillCottage
 *
 * Hero skill effects for standard edition (26) + Fengming Yushi expansion (8).
 * Each hero's skills are Action/Valid/Input delegate triplets.
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElement } from '@shared/types/enums';
import { FiveElementHelper, HPEvoMask } from '../card/five-element';
import type { EffectRegistration } from './types';

export class SkillCottage extends JNSBase {
  constructor(
    board: Board,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => string,
  ) {
    super(board, raiseGMessage, innerGMessage, asyncInput);
  }

  /** Register all hero skill effects */
  registerAll(): EffectRegistration[] {
    return [
      // HL001 - YanFeng
      ...this.registerHL001(),
      // HL002 - YangYue
      ...this.registerHL002(),
      // HL003 - YangTai
      ...this.registerHL003(),
      // XJ101 - LiXiaoyao
      ...this.registerXJ101(),
      // XJ102 - ZhaoLing'er
      ...this.registerXJ102(),
      // XJ103 - Mengshe
      ...this.registerXJ103(),
      // XJ104 - LinYueru
      ...this.registerXJ104(),
      // XJ105 - A'Nu
      ...this.registerXJ105(),
      // XJ201 - WangXiaohu
      ...this.registerXJ201(),
      // XJ202 - SuMei
      ...this.registerXJ202(),
      // XJ405
      ...this.registerXJ405(),
    ];
  }

  // ═══════════════════════════════════════════════
  // HL001 - YanFeng
  // ═══════════════════════════════════════════════

  private registerHL001(): EffectRegistration[] {
    return [
      // JNH0101 - Token gain based on hand diversity
      {
        code: 'JNH0101',
        action: (player, _type, _fuse, _argst) => {
          let cnt = 0;
          const types = new Set<string>();
          for (const ut of player.tux) {
            // Would need libGroup to decode tux types
            // Simplified: count distinct card types
            types.add(String(ut));
          }
          cnt = types.size;
          this.raiseGMessage(`G0DH,${player.uid},2,${player.tux.length}`);
          if (cnt + player.tokenCount > 8) {
            cnt = 8 - player.tokenCount;
          }
          if (cnt > 0) {
            this.raiseGMessage(`G1MI,${player.uid},${cnt}`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && player.tux.length > 0;
        },
      },
      // JNH0102 - Consume tokens for battle bonus
      {
        code: 'JNH0102',
        action: (player, _type, _fuse, _argst) => {
          const cnt = player.tokenCount;
          this.raiseGMessage(`G0DS,${player.uid},0,1`);
          this.raiseGMessage(`G1MD,${player.uid},${cnt}`);
          if (this.board.isAttendWarSucc(player)) {
            this.raiseGMessage(`G0IP,${player.team},${cnt + 3}`);
          } else {
            this.raiseGMessage(`G0IP,${player.team},${cnt}`);
          }
        },
        valid: (player, _type, _fuse) => {
          const b1 = this.board.isAttendWar(player);
          const b4 = player.tokenCount >= 2;
          return b1 && b4;
        },
      },
      // JNH0103 - Self damage when immobilized
      {
        code: 'JNH0103',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G0DS,${player.uid},1`);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0 && player.immobilized) {
            const g0ds = fuse.split(',');
            for (let i = 1; i < g0ds.length;) {
              if (g0ds[i + 1] === '0') {
                if (g0ds[i] === player.uid.toString()) return true;
                i += 3;
              } else {
                i += 2;
              }
            }
          }
          return false;
        },
      },
      // JNH0104 - Swap monsters
      {
        code: 'JNH0104',
        action: (player, _type, fuse, _argst) => {
          const mon2ut = this.board.monster2;
          if (mon2ut !== 0) {
            this.raiseGMessage(`G1SG,${player.uid}`);
          }
        },
        valid: (player, _type, fuse) => {
          const g0hzs = fuse.split(',');
          const who = parseInt(g0hzs[1], 10);
          return who === player.uid && this.board.monster2 !== 0;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL002 - YangYue
  // ═══════════════════════════════════════════════

  private registerHL002(): EffectRegistration[] {
    return [
      // JNH0201 - Token excl/awake management
      {
        code: 'JNH0201',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G1MX,${player.uid},I23,I24`);
            this.raiseGMessage(`G0MA,${player.uid},18`);
            this.raiseGMessage(`G0IS,${player.uid},1,JNH0203,JNH0204`);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) {
            return this.isMathISOS('JNH0201', player, fuse);
          }
          return false;
        },
      },
      // JNH0203 - Redirect and amplify damage
      {
        code: 'JNH0203',
        action: (player, _type, fuse, argst) => {
          const resi = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${resi}`);
          const parts = fuse.split(';');
          const modified: string[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            let n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (!FiveElementHelper.isSet(mask, HPEvoMask.CHAIN_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT)) {
              if (player.hp < 3) { n *= 2; }
              else { n++; }
              pParts[3] = n.toString();
            }
            modified.push(pParts.join(','));
          }
          if (modified.length > 0) {
            this.innerGMessage(modified.join(';'), -189);
          }
        },
        valid: (player, _type, fuse) => {
          if (player.hp < player.hpBase && player.tux.length > 0) {
            const parts = fuse.split(';');
            for (const part of parts) {
              if (part === '') continue;
              const pParts = part.split(',');
              const mask = parseInt(pParts[4], 10) || 0;
              if (!FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT) && !FiveElementHelper.isSet(mask, HPEvoMask.CHAIN_INVAO)) {
                return true;
              }
            }
          }
          return false;
        },
        input: (player, _type, _fuse, prev) => {
          return prev === '' ? `/Q1(p${player.tux.join('p')})` : '';
        },
      },
      // JNH0206 - Peek at enemy card
      {
        code: 'JNH0206',
        action: (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G1MT,${player.uid},${ut}`);
          const tar = this.board.garden.get(ut)!;
          this.targetPlayer(player.uid, tar.uid);
          this.asyncInput(
            player.uid,
            `#展示的,C1(${tar.tux.map(() => 'p0').join('')})`,
            'JNH0206',
            '0',
          );
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && [...this.board.garden.values()].some(
            p => this.board.isAttendWar(p) && p.team === player.oppTeam && p.isTared && p.tux.length > 0,
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            return `/T1(p${[...this.board.garden.values()].filter(
              p => this.board.isAttendWar(p) && p.team === player.oppTeam && p.isTared && p.tux.length > 0,
            ).map(p => p.uid).join('p')})`;
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL003 - YangTai
  // ═══════════════════════════════════════════════

  private registerHL003(): EffectRegistration[] {
    return [
      // JNH0301 - Redirect damage to enemy
      {
        code: 'JNH0301',
        action: (player, _type, fuse, argst) => {
          const parts = fuse.split(';');
          const blocks = argst.split(',');
          const to = parseInt(blocks[0], 10);
          this.targetPlayer(player.uid, to);
          // Forward harm to target
          if (this.board.garden.has(to) && this.board.garden.get(to)!.isAlive) {
            this.raiseGMessage(`G0TT,${to}`);
          }
        },
        valid: (player, _type, fuse) => {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid && n <= player.getAllCardsCount() &&
              !FiveElementHelper.isSet(mask, HPEvoMask.DECR_INVAO) && !FiveElementHelper.isSet(mask, HPEvoMask.TERMIN_AT)) {
              return [...this.board.garden.values()].some(p => p.uid !== player.uid && p.isTared);
            }
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ101 - LiXiaoyao
  // ═══════════════════════════════════════════════

  private registerXJ101(): EffectRegistration[] {
    return [
      // JN10101 - Bonus when rounder is female teammate
      {
        code: 'JN10101',
        action: (player, _type, _fuse, _argst) => {
          this.targetPlayer(this.board.rounder.uid, player.uid);
          this.raiseGMessage(`G0IX,${player.uid},1,1`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.rounder.gender === 'F' && this.board.rounder.team === player.team;
        },
      },
      // JN10102 - Steal from hinder
      {
        code: 'JN10102',
        action: (player, _type, _fuse, _argst) => {
          const hinder = this.board.hinder;
          this.targetPlayer(player.uid, hinder.uid);
          this.asyncInput(player.uid, `#获得的,T1(${hinder.uid})`, 'JN10102', '0');
          this.raiseGMessage(`G0HQ,0,${player.uid},${hinder.uid},2,1`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && this.board.rounder.team === player.team &&
            this.board.hinder.isTared && this.board.hinder.tux.length > 0;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ102 - ZhaoLing'er
  // ═══════════════════════════════════════════════

  private registerXJ102(): EffectRegistration[] {
    return [
      // JN10201 - Weapon slot variation
      {
        code: 'JN10201',
        action: (player, type, _fuse, _argst) => {
          this.raiseGMessage(`G1SV,${player.uid},WQ,${type === 0 ? 1 : 0}`);
        },
        valid: (player, type, fuse) => {
          return this.isMathISOS('JN10201', player, fuse);
        },
      },
      // JN10202 - Transform skill
      {
        code: 'JN10202',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0OY,1,${player.uid}`);
          this.raiseGMessage(`G0OS,${player.uid},0,JN10202`);
          this.raiseGMessage(`G0IY,1,${player.uid},10103`);
          this.raiseGMessage(`G0IS,${player.uid},0,JN10302,JN10303`);
        },
        valid: (player, type, _fuse) => {
          if (player.isAlive && [...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.oppTeam,
          ).reduce((sum, p) => sum + p.getPetCount(), 0) >= 3) {
            return type === 0;
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ103 - Mengshe
  // ═══════════════════════════════════════════════

  private registerXJ103(): EffectRegistration[] {
    return [
      // JN10302 - Transform skill (opposite condition)
      {
        code: 'JN10302',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0OY,1,${player.uid}`);
          this.raiseGMessage(`G0OS,${player.uid},2,JN10302,JN10303`);
          this.raiseGMessage(`G0IY,1,${player.uid},10102`);
          this.raiseGMessage(`G0IS,${player.uid},2,JN10202`);
        },
        valid: (player, type, _fuse) => {
          if (player.isAlive && [...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.oppTeam,
          ).reduce((sum, p) => sum + p.getPetCount(), 0) < 3) {
            return type === 0;
          }
          return false;
        },
      },
      // JN10303 - Pool mode toggle
      {
        code: 'JN10303',
        action: (player, type, _fuse, _argst) => {
          if (type === 0 || type === 1) {
            this.raiseGMessage(`G1WP,${player.team},${player.uid},JN10303,2`);
          } else if (type === 2) {
            this.raiseGMessage(`G1WP,${player.team},${player.uid},JN10303,0`);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) return true;
          if ((type === 1 || type === 2) && this.board.poolEnabled) {
            return this.isMathISOS('JN10303', player, _fuse);
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ104 - LinYueru
  // ═══════════════════════════════════════════════

  private registerXJ104(): EffectRegistration[] {
    return [
      // JN10401 - Weapon equip bonus
      {
        code: 'JN10401',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G0IA,${player.uid},0,1`);
          } else if (type === 1) {
            this.raiseGMessage(`G0OA,${player.uid},0,1`);
          }
        },
        valid: (player, type, _fuse) => {
          return type === 0 || type === 1;
        },
      },
      // JN10402 - Harm opponents on loss
      {
        code: 'JN10402',
        action: (player, _type, _fuse, _argst) => {
          const opps = [...this.board.garden.values()].filter(
            p => p.isAlive && this.board.isAttendWar(p) && p.team === player.oppTeam,
          );
          if (opps.length > 0) {
            this.harmMultiple(player, opps, 1);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && [...this.board.garden.values()].some(
            p => p.isAlive && this.board.isAttendWar(p) && p.team === player.oppTeam,
          );
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ105 - A'Nu
  // ═══════════════════════════════════════════════

  private registerXJ105(): EffectRegistration[] {
    return [
      // JN10501 - Give cards to teammate
      {
        code: 'JN10501',
        action: (player, _type, _fuse, argst) => {
          if (argst !== '0') {
            const idx = argst.lastIndexOf(',');
            const to = parseInt(argst.substring(idx + 1), 10);
            if (to !== 0) {
              const cards = argst.substring(0, idx);
              this.raiseGMessage(`G0HQ,0,${to},${player.uid},1,${cards.split(',').length},${cards}`);
            }
          }
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0 && [...this.board.garden.values()].some(
            p => p !== player && p.team === player.team && p.isTared,
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            return (player.tux.length > 1 ? `/+Q1~${player.tux.length}` : '/+Q1') +
              `(p${player.tux.join('p')}),/T1${this.formatPlayers(p => p !== player && p.isTared && p.team === player.team)}`;
          }
          return '';
        },
      },
      // JN10502 - No hand bonus
      {
        code: 'JN10502',
        action: (player, _type, _fuse, _argst) => {
          const msg = this.affichePlayers(
            p => p.isAlive && p.team === player.team,
            p => `${p.uid},0,1`,
          );
          if (msg) this.raiseGMessage(`G0DH,${msg}`);
          this.harmMultiple(
            player,
            [...this.board.garden.values()].filter(p => p.isAlive && p !== player),
            1,
          );
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length === 0;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ201 - WangXiaohu
  // ═══════════════════════════════════════════════

  private registerXJ201(): EffectRegistration[] {
    return [
      // JN20101 - Dice roll for STR
      {
        code: 'JN20101',
        action: (player, _type, _fuse, _args) => {
          this.raiseGMessage(`G0TT,${player.uid}`);
          // Dice value will be set by the game loop
          // value == 1 or 6 -> 0 bonus, otherwise bonus = value
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player);
        },
      },
      // JN20102 - Discard for dice roll
      {
        code: 'JN20102',
        action: (player, _type, fuse, args) => {
          const card = parseInt(args, 10);
          if (player.tux.includes(card)) {
            this.raiseGMessage(`G0QZ,${player.uid},${card}`);
            this.raiseGMessage(`G0TT,${player.uid}`);
          }
        },
        valid: (player, _type, fuse) => {
          const who = parseInt(fuse.substring(fuse.indexOf(',') + 1), 10);
          return player.tux.length > 0 && player.uid === who;
        },
        input: (player, _type, _fuse, prev) => {
          return prev === '' ? `/Q1(p${player.tux.join('p')})` : '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ202 - SuMei
  // ═══════════════════════════════════════════════

  private registerXJ202(): EffectRegistration[] {
    return [
      // JN20201 - Reroll monster
      {
        code: 'JN20201',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage('G1SG,0');
          const yes = this.asyncInput(
            player.uid,
            '#是否放弃此怪，翻出新怪？##不翻出##翻出,Y2',
            'JN20201',
            '0',
          );
          if (yes === '2') {
            if (this.board.mon1From === 0) {
              this.raiseGMessage(`G2AB,NMB,${this.board.monster1}`);
            } else {
              this.board.mon1From = 0;
            }
            this.board.monster1 = 0;
            this.board.battler = null;
            this.raiseGMessage(`G2GOTO,R${player.uid}ZM`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.monPiles.count > 0;
        },
      },
      // JN20202 - Use TP01 as skill
      {
        code: 'JN20202',
        action: (player, _type, fuse, argst) => {
          const card = parseInt(argst, 10);
          this.raiseGMessage(`G0CC,${player.uid},0,${player.uid},TP01,${card};0,${fuse}`);
        },
        valid: (player, _type, fuse) => {
          return player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const cands = player.tux; // Would filter by TP type
            return cands.length > 0 ? `#当作【冰心诀】,/Q1(p${cands.join('p')})` : '/';
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ405 - Additional Skills
  // ═══════════════════════════════════════════════

  private registerXJ405(): EffectRegistration[] {
    return [
      // Placeholder for XJ405 skills - to be expanded
      {
        code: 'JNX40501',
        action: (player, _type, _fuse, _argst) => {
          // Default no-op
        },
        valid: () => false,
      },
    ];
  }
}
