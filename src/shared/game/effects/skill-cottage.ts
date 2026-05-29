/**
 * SkillCottage - Translation of C# PSD.PSDGamepkg.JNS.SkillCottage
 *
 * Hero skill effects for standard edition (26) + Fengming Yushi expansion (8).
 * Each hero's skills are Action/Valid/Input delegate triplets.
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElement, TuxType } from '@shared/types/enums';
import { FiveElementHelper, HPEvoMask } from '../card/five-element';
import { NMBLib } from '../card/nmb';
import type { Monster } from '../card/monster';
import type { EffectRegistration } from './types';
import type { LibGroup } from '../lib-group';

export class SkillCottage extends JNSBase {
  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    super(board, libGroup, raiseGMessage, innerGMessage, asyncInput);
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
      // XJ203 - ShenQishuang
      ...this.registerXJ203(),
      // XJ206 - KongLin
      ...this.registerXJ206(),
      // XJ302 - TangXuejian
      ...this.registerXJ302(),
      // XJ303 - Longkui Blue
      ...this.registerXJ303(),
      // XJ304 - Longkui Red
      ...this.registerXJ304(),
      // XJ305 - Zixuan
      ...this.registerXJ305(),
      // XJ306 - ChongLou
      ...this.registerXJ306(),
      // XJ401 - YunTianhe
      ...this.registerXJ401(),
      // XJ402 - HanLingsha
      ...this.registerXJ402(),
      // XJ403 - LiuMengli
      ...this.registerXJ403(),
      // XJ404 - MurongZiying
      ...this.registerXJ404(),
      // XJ405 - XuanXiao
      ...this.registerXJ405(),
      // X3W01 - NanGongHuang
      ...this.registerX3W01(),
      // X3W02 - WenHui
      ...this.registerX3W02(),
      // X3W03 - XingXuan
      ...this.registerX3W03(),
      // X3W04 - WangPengXu
      ...this.registerX3W04(),
      // XJ501 - JiangYunfan
      ...this.registerXJ501(),
      // XJ502 - TangYurou
      ...this.registerXJ502(),
      // XJ503 - LongYou
      ...this.registerXJ503(),
      // XJ504 - XiaoMan
      ...this.registerXJ504(),
      // XJ505 - JiangShili
      ...this.registerXJ505(),
      // XJ506 - Moyi
      ...this.registerXJ506(),
      // XJ507 - YanShiQiongBing
      ...this.registerXJ507(),
      // XJ508 - OuyangHui
      ...this.registerXJ508(),
      // XJ106 - Jiujianxian (酒剑仙)
      ...this.registerXJ106(),
      // XJ107 - Baiyue Lord (拜月教主)
      ...this.registerXJ107(),
      // XJ207 - Mozun (魔尊)
      ...this.registerXJ207(),
      // HL004 - YeFengling (叶风铃)
      ...this.registerHL004(),
      // HL005 - Lunar Deity (月神)
      ...this.registerHL005(),
      // HL006 - ZhaoWen (赵文)
      ...this.registerHL006(),
      // HL007 - Yingyue (映月)
      ...this.registerHL007(),
      // HL008 - Yingyu (映雨)
      ...this.registerHL008(),
      // HL009 - Lingjian (灵剑)
      ...this.registerHL009(),
      // HL010 - ShuiLingjing (水菱精)
      ...this.registerHL010(),
      // HL011 - ShuiGang (水缸)
      ...this.registerHL011(),
      // HL012 - LiuYing'er (柳莺儿)
      ...this.registerHL012(),
      // HL013 - Xiongshanjun (熊山君)
      ...this.registerHL013(),
      // TR001 - Suyu (素玉)
      ...this.registerTR001(),
      // TR002 - XuChangqing (徐长卿)
      ...this.registerTR002(),
      // TR003 - YunTianqing (云天青)
      ...this.registerTR003(),
      // TR004 - Lingyin (凌音)
      ...this.registerTR004(),
      // TR005 - Lingbo (凌波)
      ...this.registerTR005(),
      // TR006 - OuyangQian (欧阳倩)
      ...this.registerTR006(),
      // TR007 - LiYiru (李忆如)
      ...this.registerTR007(),
      // TR008 - XiahouJinxuan (夏侯瑾轩)
      ...this.registerTR008(),
      // TR009 - Xia (瑕)
      ...this.registerTR009(),
      // TR010 - MuChanglan (暮菖兰)
      ...this.registerTR010(),
      // TR011 - JiangCheng (姜承)
      ...this.registerTR011(),
      // TR012 - HuangfuZhuo (皇甫卓)
      ...this.registerTR012(),
      // TR013 - XieCangxing (谢沧行)
      ...this.registerTR013(),
      // TR014 - Jieluo (结萝)
      ...this.registerTR014(),
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
            const tux = this.libGroup.tl.decodeTux(ut);
            if (tux) {
              types.add(String(tux.type));
            }
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
        action: async (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G1MT,${player.uid},${ut}`);
          const tar = this.board.garden.get(ut)!;
          this.targetPlayer(player.uid, tar.uid);
          await this.asyncInput(
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
      // JN10102 - Steal from hinder (飞龙探云手)
      {
        code: 'JN10102',
        action: async (player, _type, _fuse, _argst) => {
          const hinder = this.board.hinder;
          this.targetPlayer(player.uid, hinder.uid);
          await this.asyncInput(player.uid, `#获得的,T1(${hinder.uid})`, 'JN10102', '0');
          const c0 = 'p0'.repeat(hinder.tux.length);
          await this.asyncInput(player.uid, `#获得的,C1(${c0})`, 'JN10102', '0');
          this.raiseGMessage(`G0HQ,0,${player.uid},${hinder.uid},2,1`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && this.board.rounder.team === player.team &&
            this.board.battler !== null && this.board.battler.agl <= 2 &&
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
        action: async (player, _type, _fuse, _argst) => {
          this.raiseGMessage('G1SG,0');
          const yes = await this.asyncInput(
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
  // XJ302 - TangXuejian
  // ═══════════════════════════════════════════════

  private registerXJ302(): EffectRegistration[] {
    return [
      // JN30201 - Discard a card to negate harm to others
      {
        code: 'JN30201',
        action: (player, _type, fuse, argst) => {
          const card = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${card}`);
          // Harm 1 to each valid target from fuse
          const parts = fuse.split(';');
          const targets: Player[] = [];
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            const py = this.board.garden.get(who);
            if (py && py.isAlive && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.CHAIN_INVAO)) {
              targets.push(py);
            }
          }
          if (targets.length > 0) {
            this.harmMultiple(player, targets, 1);
          }
        },
        valid: (player, _type, fuse) => {
          if (player.tux.length === 0) return false;
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            const py = this.board.garden.get(who);
            if (py && py.isAlive && n > 0 &&
              !FiveElementHelper.isSet(mask, HPEvoMask.CHAIN_INVAO) &&
              (!player.isSKOpt || who !== player.uid)) {
              return true;
            }
          }
          return false;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          return '';
        },
      },
      // JN30202 - Discard non-ZP card for +2 STR
      {
        code: 'JN30202',
        action: (player, _type, _fuse, argst) => {
          const card = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${card}`);
          this.raiseGMessage(`G0IA,${player.uid},1,2`);
        },
        valid: (player, _type, _fuse) => {
          if (player.isSKOpt && !this.board.isAttendWarSucc(player)) return false;
          return player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const nonZpCards = player.tux.filter(ut => {
              const tux = this.libGroup.tl.decodeTux(ut);
              return tux && tux.type !== TuxType.ZP;
            });
            if (nonZpCards.length > 0) return `/Q1(p${nonZpCards.join('p')})`;
            else return '/';
          }
          return '';
        },
      },
      // JN30203 - Self damage 2 to draw 2 cards
      {
        code: 'JN30203',
        action: (player, _type, _fuse, _argst) => {
          this.harm(player, player, 2, FiveElement.A, HPEvoMask.TUX_INAVO);
          if (player.isAlive) {
            this.raiseGMessage(`G0DH,${player.uid},0,2`);
          }
        },
        valid: (player, _type, _fuse) => {
          return player.hp >= 2 && this.board.isAttendWar(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ303 - Longkui Blue
  // ═══════════════════════════════════════════════

  private registerXJ303(): EffectRegistration[] {
    return [
      // JN30301 - Transform to Red (XJ304)
      {
        code: 'JN30301',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0OY,1,${player.uid}`);
          this.raiseGMessage(`G0OS,${player.uid},0,JN30301,JN30302,JN30303`);
          this.raiseGMessage(`G0IY,1,${player.uid},10304`);
          this.raiseGMessage(`G0IS,${player.uid},2,JN30401,JN30402,JN30403`);
        },
        valid: (_player, type, _fuse) => {
          return type === 0;
        },
      },
      // JN30302 - Use stored JP card on damage/link
      {
        code: 'JN30302',
        action: (player, type, fuse, _argst) => {
          if (type === 0) {
            // Use stored JP card: deal 1 self damage, then replay the JP effect
            this.harm(player, player, 1);
            if (player.isAlive) {
              const jpname = player.ram.getString('JPName');
              if (jpname) {
                const colonIdx = fuse.indexOf(':');
                const pureFuse = colonIdx >= 0 ? fuse.substring(colonIdx + 1) : fuse;
                this.raiseGMessage(`G0CC,${player.uid},0,${player.uid},${jpname},0;0,${pureFuse}`);
              }
            }
            player.ram.set('Melt', true);
          } else if (type === 1) {
            // Store the JP card name from link message
            const blocks = fuse.split(',');
            const ut = parseInt(blocks[1], 10);
            if (!player.ram.getBool('Melt') && ut === player.uid) {
              const jpname = blocks[4];
              player.ram.set('JPName', jpname);
            }
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) {
            const jpname = player.ram.getString('JPName');
            return jpname !== null && !player.ram.getBool('Melt');
          } else if (type === 1) {
            const blocks = fuse.split(',');
            const ut = parseInt(blocks[1], 10);
            return !player.ram.getBool('Melt') && ut === player.uid;
          }
          return false;
        },
      },
      // JN30303 - Discard equip for +3 STR
      {
        code: 'JN30303',
        action: (player, _type, _fuse, argst) => {
          const card = parseInt(argst, 10);
          if (card !== 0) {
            this.raiseGMessage(`G0ZI,${player.uid},${card}`);
            this.raiseGMessage(`G0IA,${player.uid},1,3`);
          }
        },
        valid: (player, _type, _fuse) => {
          if (player.isSKOpt && !this.board.isAttendWarSucc(player)) return false;
          return player.listOutAllEquips().length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const equips = player.listOutAllEquips();
            return `/Q1(p${equips.join('p')})`;
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ304 - Longkui Red
  // ═══════════════════════════════════════════════

  private registerXJ304(): EffectRegistration[] {
    return [
      // JN30401 - Transform to Blue (XJ303)
      {
        code: 'JN30401',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0OY,1,${player.uid}`);
          this.raiseGMessage(`G0OS,${player.uid},0,JN30401,JN30402,JN30403`);
          this.raiseGMessage(`G0IY,1,${player.uid},10303`);
          this.raiseGMessage(`G0IS,${player.uid},2,JN30301,JN30302,JN30303`);
        },
        valid: (_player, type, _fuse) => {
          return type === 0;
        },
      },
      // JN30402 - Steal equip from teammate
      {
        code: 'JN30402',
        action: (player, _type, _fuse, argst) => {
          const idx = argst.indexOf(',');
          const from = parseInt(argst.substring(0, idx), 10);
          const card = parseInt(argst.substring(idx + 1), 10);
          this.raiseGMessage(`G0HQ,0,${player.uid},${from},0,1,${card}`);
        },
        valid: (player, _type, _fuse) => {
          for (const py of this.board.garden.values()) {
            if (py.uid !== player.uid && py.isAlive && py.team === player.team) {
              if (py.hasAnyEquips()) return true;
            }
          }
          return false;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const teammates = [...this.board.garden.values()].filter(
              p => p.uid !== player.uid && p.isAlive && p.team === player.team && p.hasAnyEquips(),
            );
            return `/T1(p${teammates.map(p => p.uid).join('p')})`;
          } else if (!prev.includes(',')) {
            const who = parseInt(prev, 10);
            const py = this.board.garden.get(who);
            if (py) {
              return `/C1(p${py.listOutAllEquips().join('p')})`;
            }
          }
          return '';
        },
      },
      // JN30403 - Discard equip to deal 3 damage
      {
        code: 'JN30403',
        action: (player, _type, _fuse, argst) => {
          const idx = argst.indexOf(',');
          const card = parseInt(argst.substring(0, idx), 10);
          const to = parseInt(argst.substring(idx + 1), 10);
          if (card !== 0) {
            this.raiseGMessage(`G0ZI,${player.uid},${card}`);
            const target = this.board.garden.get(to);
            if (target) {
              this.harm(player, target, 3);
            }
          }
        },
        valid: (player, _type, _fuse) => {
          return player.hasAnyEquips();
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            return `/Q1(p${player.listOutAllEquips().join('p')})`;
          } else if (!prev.includes(',')) {
            return '/T1' + this.aAllTareds(player);
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ305 - Zixuan
  // ═══════════════════════════════════════════════

  private registerXJ305(): EffectRegistration[] {
    return [
      // JN30501 - When teammate gets pet, give 2 draws to a teammate
      {
        code: 'JN30501',
        action: async (player, _type, fuse, _argst) => {
          // Parse ObtainPet from fuse: format is like "G0OP,who,land,..."
          const parts = fuse.split(',');
          const farmer = parseInt(parts[1], 10);
          const land = parseInt(parts[2], 10);
          // For each pet obtained, ask who to give 2 draws to
          const petCount = parts.length > 3 ? parts.length - 3 : 1;
          for (let i = 0; i < petCount; i++) {
            const input = await this.asyncInput(
              player.uid,
              `#获得2张补牌,T1${this.aTeammatesTared(player)}`,
              'JN30501',
              '0',
            );
            const who = parseInt(input, 10);
            if (who !== 0) {
              this.raiseGMessage(`G0DH,${who},0,2`);
            }
          }
        },
        valid: (player, _type, fuse) => {
          const parts = fuse.split(',');
          const farmer = parseInt(parts[1], 10);
          const land = parseInt(parts[2], 10);
          const farmerPy = this.board.garden.get(farmer);
          if (!farmerPy) return false;
          const isTeammate = farmerPy.team === player.team;
          if (!isTeammate) return false;
          if (land === 0) return true;
          const landPy = this.board.garden.get(land);
          if (!landPy) return true;
          return landPy.team !== player.team;
        },
      },
      // JN30502 - When pets are in battle, give +3 STR to each
      {
        code: 'JN30502',
        action: (player, _type, fuse, _argst) => {
          const parts = fuse.split(',');
          for (let i = 1; i < parts.length; i++) {
            const petUid = parseInt(parts[i], 10);
            if (player.pets.includes(petUid)) {
              this.raiseGMessage(`G0IB,${petUid},3`);
            }
          }
        },
        valid: (player, _type, fuse) => {
          const parts = fuse.split(',');
          const x = parseInt(parts[1], 10);
          return player.pets.includes(x);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ306 - ChongLou
  // ═══════════════════════════════════════════════

  private registerXJ306(): EffectRegistration[] {
    return [
      // JN30601 - Duel: discard N+1 cards, target player, roll dice
      {
        code: 'JN30601',
        action: (player, _type, _fuse, args) => {
          const blocks = args.split(',');
          const dlc = player.ram.getInt('DuelCount') + 1;
          // Discard the first dlc cards
          const restCards = blocks.slice(0, dlc).map(p => parseInt(p, 10));
          this.raiseGMessage(`G0QZ,${player.uid},${restCards.join(',')}`);
          // Get target players
          const tos = blocks.slice(dlc).map(p => parseInt(p, 10));
          this.targetPlayers(player.uid, tos);
          player.ram.set('DuelCount', dlc);
          const maskDuel = FiveElementHelper.setMask(
            HPEvoMask.ALIVE,
            FiveElementHelper.setMask(HPEvoMask.TUX_INAVO, HPEvoMask.RSV_DUEL),
          );
          for (const to of tos) {
            this.raiseGMessage(`G0TT,${player.uid}`);
            const myDice = this.board.diceValue;
            this.raiseGMessage(`G0TT,${to}`);
            const toDice = this.board.diceValue;
            const target = this.board.garden.get(to);
            if (!target) continue;
            if (myDice > toDice) {
              this.harm(player, target, 3, FiveElement.A, maskDuel);
            } else if (myDice < toDice) {
              this.harm(player, player, 3, FiveElement.A, maskDuel);
            } else {
              // Tie: both take 2 damage
              this.harmVariable(
                player,
                [target, player],
                [2, 2],
                FiveElement.A,
                maskDuel,
              );
            }
          }
        },
        valid: (player, _type, _fuse) => {
          const hasTarget = [...this.board.garden.values()].some(
            p => p.isTared && p.uid !== player.uid,
          );
          const dlc = player.ram.getInt('DuelCount') + 1;
          return hasTarget && player.tux.length >= dlc;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const dlc = player.ram.getInt('DuelCount') + 1;
            const all = [...this.board.garden.values()]
              .filter(p => p.isTared && p.uid !== player.uid)
              .map(p => p.uid);
            if (all.length >= 2) {
              return `/Q${dlc}(p${player.tux.join('p')}),/T1~2(p${all.join('p')})`;
            } else {
              return `/Q${dlc}(p${player.tux.join('p')}),/T1(p${all.join('p')})`;
            }
          }
          return '';
        },
      },
      // JN30602 - Survive lethal duel damage
      {
        code: 'JN30602',
        valid: (_player, _type, fuse) => {
          const parts = fuse.split(';');
          for (const part of parts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            const py = this.board.garden.get(who);
            if (py && FiveElementHelper.isSet(mask, HPEvoMask.RSV_DUEL) &&
              n > 0 && py.hp >= 2 && py.hp - n < 1) {
              return true;
            }
          }
          return false;
        },
      },
      // JN30603 - When enemy is rounder, +2 STR
      {
        code: 'JN30603',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IX,${player.uid},1,2`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.rounder.team === player.oppTeam && this.board.isAttendWar(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ401 - YunTianhe (云天河)
  // ═══════════════════════════════════════════════

  private registerXJ401(): EffectRegistration[] {
    return [
      // JN50101 - STR+2 when DEX difference >= 4 vs battler
      {
        code: 'JN50101',
        action: (player, type, _fuse, _argst) => {
          if (type === 0 || type === 1 || type === 4) {
            this.raiseGMessage(`G0IA,${player.uid},1,2`);
            player.ram.set('STR+2', true);
          } else if (type === 2 || type === 3) {
            this.raiseGMessage(`G0OA,${player.uid},1,2`);
            player.ram.set('STR+2', false);
          }
        },
        valid: (player, type, _fuse) => {
          const battler = this.board.battler;
          if (type === 0 || type === 1 || type === 4) {
            return this.board.isAttendWar(player) && battler !== null &&
              player.dex - battler.agl >= 4 && !player.ram.getBool('STR+2');
          } else if (type === 2 || type === 3) {
            return this.board.isAttendWar(player) && battler !== null &&
              player.dex - battler.agl < 4 && player.ram.getBool('STR+2');
          }
          return false;
        },
      },
      // JN50102 - Lose HP to gain 8 pool, then lose DEX
      {
        code: 'JN50102',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G0IP,${player.team},8`);
            player.rom.set('REC', 1);
          } else if (type === 1) {
            player.dexB = 0;
            player.dexI = 0;
            player.rom.set('REC', 2);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) return player.rom.getInt('REC') === 0;
          else if (type === 1) return player.rom.getInt('REC') === 1;
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ402 - HanLingsha (韩菱纱)
  // ═══════════════════════════════════════════════

  private registerXJ402(): EffectRegistration[] {
    return [
      // JN50201 - 搜囊探宝: Use card to copy JP01 or JP06 effect
      {
        code: 'JN50201',
        action: (player, _type, fuse, argst) => {
          const args = argst.split(',');
          const card = parseInt(args[0], 10);
          if (card !== 0) {
            const db = parseInt(args[1], 10);
            const tux = this.libGroup.tl.encodeTuxDbSerial(db);
            if (tux) {
              this.raiseGMessage(
                `G0CC,${player.uid},0,${player.uid},${tux.code},${card};0,${fuse}`,
              );
            }
          }
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0 && [...this.board.garden.values()].some(
            p => p.uid !== player.uid && p.hasAnyCards(),
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const jp01 = this.libGroup.tl.encodeTuxCode('JP01');
            const jp06 = this.libGroup.tl.encodeTuxCode('JP06');
            const jp01Valid = [...this.board.garden.values()].some(
              p => p.uid !== player.uid && p.tux.length > 0,
            );
            const jp01Serial = jp01?.dbSerial ?? 0;
            const jp06Serial = jp06?.dbSerial ?? 0;
            return `/Q1(p${player.tux.join('p')}),#请选择『搜囊探宝』执行项,/G1(p${jp06Serial}${jp01Valid ? ('p' + jp01Serial) : ''})`;
          }
          return '';
        },
      },
      // JN50202 - Draw 1, if >=2 hand draw 1 more
      {
        code: 'JN50202',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0DH,${player.uid},0,1`);
          if (player.tux.length >= 2) {
            this.raiseGMessage(`G0DH,${player.uid},1,1`);
          }
        },
      },
      // JN50203 - 盗墓: Steal from all players in battle
      {
        code: 'JN50203',
        action: async (player, _type, fuse, _argst) => {
          const args = fuse.split(',');
          const possiCards: number[] = [];
          for (let i = 1; i < args.length; ++i) {
            const who = parseInt(args[i], 10);
            const fromPlayer = this.board.garden.get(who);
            if (fromPlayer && fromPlayer.uid !== player.uid && fromPlayer.hasAnyCards()) {
              possiCards.push(...fromPlayer.listOutAllCards());
              this.raiseGMessage(`G0HQ,1,${player.uid},${who}`);
            }
          }
          // Loop: give cards to others
          do {
            const carg = possiCards.length > 1
              ? `/+Q1~${possiCards.length}(p${possiCards.join('p')})`
              : `/+Q1(p${possiCards.join('p')})`;
            const targ = `/T1${this.formatPlayers(p => p.isTared && p.uid !== player.uid)}`;
            const select = await this.asyncInput(player.uid, carg + ',' + targ, 'JN50203', '0');
            if (select === '0' || select === '/0' || select === '') break;
            const idx = select.lastIndexOf(',');
            const to = parseInt(select.substring(idx + 1), 10);
            const cardsString = select.substring(0, idx);
            if (to === 0) continue;
            const cards = cardsString.split(',').map(p => parseInt(p, 10));
            for (const cd of cards) {
              const cidx = possiCards.indexOf(cd);
              if (cidx !== -1) possiCards.splice(cidx, 1);
            }
            this.raiseGMessage(
              `G0HQ,0,${to},${player.uid},1,${cards.length},${cards.join(',')}`,
            );
          } while (possiCards.length > 0);
          this.harm(player, player, 1);
          this.innerGMessage(fuse, 191);
        },
        valid: (player, _type, fuse) => {
          const args = fuse.split(',');
          for (let i = 1; i < args.length; ++i) {
            const who = parseInt(args[i], 10);
            if (who === player.uid) return false;
            const p = this.board.garden.get(who);
            if (p && p.hasAnyCards()) return true;
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ403 - LiuMengli (柳梦璃)
  // ═══════════════════════════════════════════════

  private registerXJ403(): EffectRegistration[] {
    return [
      // JN50301 - Adjust STR based on pet count changes
      {
        code: 'JN50301',
        action: (player, type, _fuse, _argst) => {
          if (type >= 0 && type <= 2) {
            for (const py of this.board.garden.values()) {
              if (py.isAlive && py.team === player.team) {
                const current = py.getPetCount();
                const enhanced = player.rom.getOrSetDiva('Enhanced');
                const history = enhanced.getInt(py.uid.toString());
                if (history < current) {
                  this.raiseGMessage(`G0IA,${py.uid},0,${current - history}`);
                } else if (history > current) {
                  this.raiseGMessage(`G0OA,${py.uid},0,${history - current}`);
                }
                enhanced.set(py.uid.toString(), current);
              }
            }
          } else if (type === 3) {
            for (const py of this.board.garden.values()) {
              if (py.team === player.team) {
                const enhanced = player.rom.getOrSetDiva('Enhanced');
                const count = enhanced.getInt(py.uid.toString());
                if (count > 0) {
                  this.raiseGMessage(`G0OA,${py.uid},0,${count}`);
                }
              }
            }
          }
        },
        valid: (player, type, fuse) => {
          if (type >= 0 && type <= 2) {
            return player.getPetCount() > 0;
          } else if (type === 3) {
            return this.isMathISOS('JN50301', player, fuse) && [...this.board.garden.values()].some(p =>
              p.team === player.team && player.rom.getOrSetDiva('Enhanced').getInt(p.uid.toString()) > 0,
            );
          }
          return false;
        },
      },
      // JN50302 - On death, transform and revive with DEX=5
      {
        code: 'JN50302',
        action: (player, type, fuse, _argst) => {
          if (type === 0) {
            player.dexB = 5;
            player.dexI = 0;
            const otherSkills = [...player.skills].filter(s => s !== 'JN50302');
            if (otherSkills.length > 0) {
              this.raiseGMessage(`G0OS,${player.uid},0,${otherSkills.join(',')}`);
            }
          } else if (type === 1) {
            // Add as pos supporter/hinder (handled by game loop)
          } else if (type === 2) {
            this.raiseGMessage(`G0OY,2,${player.uid}`);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0 && !player.isAlive) {
            const blocks = fuse.split(',');
            for (let i = 1; i < blocks.length; ++i) {
              if (blocks[i] === player.uid.toString()) return true;
            }
            return false;
          } else if (type === 1 && !player.isAlive) {
            return true;
          } else if (type === 2) {
            const blocks = fuse.split(',');
            const heroCode = parseInt(blocks[3], 10);
            const hero = this.libGroup.hl.instanceHero(heroCode);
            if (hero !== null && hero.avatar === 10503) return true;
            return false;
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ404 - MurongZiying (慕容紫英)
  // ═══════════════════════════════════════════════

  private registerXJ404(): EffectRegistration[] {
    return [
      // JN50401 - Give equip to another player
      {
        code: 'JN50401',
        action: (player, _type, _fuse, argst) => {
          const idx = argst.indexOf(',');
          const card = parseInt(argst.substring(0, idx), 10);
          const who = parseInt(argst.substring(idx + 1), 10);
          if (player.fakeq.has(card)) {
            this.raiseGMessage(
              `G0HQ,0,${who},${player.uid},0,1,${card}`,
            );
          } else {
            this.raiseGMessage(
              `G0HQ,0,${who},${player.uid},0,1,${card}`,
            );
          }
          this.raiseGMessage(`G0DH,${player.uid},0,2`);
          player.ram.getOrSetUshortArray('Present').push(who);
        },
        valid: (player, _type, _fuse) => {
          return player.listOutAllEquips().length > 0 && [...this.board.garden.values()].some(p => p.isTared &&
            p.uid !== player.uid && !player.ram.getOrSetUshortArray('Present').includes(p.uid));
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const c = `/Q1(p${player.listOutAllEquips().join('p')})`;
            const t = `/T1${this.formatPlayers(p => p.isTared && p.uid !== player.uid &&
              !player.ram.getOrSetUshortArray('Present').includes(p.uid))}`;
            return `#装备,${c},${t}`;
          }
          return '';
        },
      },
      // JN50402 - Increase tux limit by 2
      {
        code: 'JN50402',
        action: (player, type, _fuse, _argst) => {
          if (type === 1) {
            player.tuxLimit += 2;
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) {
            return fuse.substring('G0QR,'.length) === player.uid.toString() &&
              player.tux.length > (player.tuxLimit - 2);
          } else if (type === 1) {
            return this.isMathISOS('JN50402', player, fuse);
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ405 - XuanXiao (玄霄)
  // ═══════════════════════════════════════════════

  private registerXJ405(): EffectRegistration[] {
    return [
      // JN50501 - Immune to AQUA/AGNI damage
      {
        code: 'JN50501',
        action: (player, _type, fuse, _argst) => {
          const harmParts = fuse.split(';');
          const remaining: string[] = [];
          for (const part of harmParts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const element = parseInt(pParts[2], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid &&
              !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO) &&
              (element === FiveElementHelper.elem2Int(FiveElement.AQUA) ||
               element === FiveElementHelper.elem2Int(FiveElement.AGNI))) {
              continue; // Immune - skip
            }
            remaining.push(part);
          }
          if (remaining.length > 0) {
            this.innerGMessage(remaining.join(';'), -39);
          }
        },
        valid: (player, _type, fuse) => {
          const harmParts = fuse.split(';');
          for (const part of harmParts) {
            if (part === '') continue;
            const pParts = part.split(',');
            const who = parseInt(pParts[0], 10);
            const element = parseInt(pParts[2], 10);
            const n = parseInt(pParts[3], 10);
            const mask = parseInt(pParts[4], 10) || 0;
            if (who === player.uid &&
              !FiveElementHelper.isSet(mask, HPEvoMask.IMMUNE_INVAO) &&
              n > 0 &&
              (element === FiveElementHelper.elem2Int(FiveElement.AQUA) ||
               element === FiveElementHelper.elem2Int(FiveElement.AGNI))) {
              return true;
            }
          }
          return false;
        },
      },
      // JN50502 - 结拜: Bond with a player for STR bonus
      {
        code: 'JN50502',
        action: async (player, type, _fuse, _argst) => {
          if (type === 0) {
            const target = await this.asyncInput(
              player.uid,
              `#『结拜』的,/T1${this.aOthersTared(player)}`,
              'JN50502',
              '0',
            );
            const tr = parseInt(target, 10);
            player.tokenTars = [tr];
            this.targetPlayer(player.uid, player.singleTokenTar);
          } else if (type === 1) {
            this.targetPlayer(player.uid, player.singleTokenTar);
            this.raiseGMessage(`G0IX,${player.uid},1,1`);
          } else if (type === 2) {
            if (player.singleTokenTar === this.board.rounder.uid) {
              this.raiseGMessage(`G0OX,${player.uid},1,1`);
              player.tokenTars = player.tokenTars.filter(
                t => t !== player.singleTokenTar,
              );
            }
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) {
            return this.isMathISOS('JN50502', player, fuse);
          } else if (type === 1) {
            return player.tokenTars.length > 0 && player.singleTokenTar === this.board.rounder.uid;
          } else if (type === 2) {
            const blocks = fuse.split(',');
            for (let i = 1; i < blocks.length; i += 2) {
              if ((blocks[i] === '0' || blocks[i] === '2') &&
                player.singleTokenTar.toString() === blocks[i + 1]) {
                return true;
              }
            }
            return false;
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // X3W01 - NanGongHuang (南宫煌)
  // ═══════════════════════════════════════════════

  private registerX3W01(): EffectRegistration[] {
    return [
      // JN40101 - Discard 1 card to flip 2 monster cards
      {
        code: 'JN40101',
        action: (player, _type, _fuse, args) => {
          const card = parseInt(args, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${card}`);
          this.raiseGMessage(`G0XZ,${player.uid},2,1,3,1`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0 && this.board.monPiles.count >= 3;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          return '';
        },
      },
      // JN40102 - When capturing pet, force opponent to discard matching pet
      {
        code: 'JN40102',
        action: async (player, _type, fuse, _argst) => {
          // Parse ObtainPet from fuse: format is "G0EP,uid,1,pet1,pet2,..."
          // parts[1] = farmer uid, parts[2] = 1 (trophy), parts[3..] = pet card ids
          const parts = fuse.split(',');
          const pets: number[] = [];
          for (let i = 3; i < parts.length; i++) {
            const pet = parseInt(parts[i], 10);
            if (!isNaN(pet) && pet !== 0) pets.push(pet);
          }
          for (const _pt of pets) {
            // For each captured pet, find opponents with matching element pets
            const oppPets: number[] = [];
            for (const p of this.board.garden.values()) {
              if (p.isAlive && p.team === player.oppTeam) {
                for (const ep of p.pets) {
                  if (ep !== 0) oppPets.push(ep);
                }
              }
            }
            if (oppPets.length === 0) continue;
            const input = await this.asyncInput(
              player.uid,
              `#弃置的,/M1(p${oppPets.join('p')})`,
              'JN40102',
              '0',
            );
            if (!input.startsWith('/') && input !== '0') {
              const pet = parseInt(input, 10);
              // Find who owns this pet and discard it
              for (const p of this.board.garden.values()) {
                if (p.isAlive && p.team === player.oppTeam) {
                  const idx = p.pets.indexOf(pet);
                  if (idx !== -1) {
                    this.targetPlayer(player.uid, p.uid);
                    this.raiseGMessage(`G0LP,${p.uid},${pet}`);
                    break;
                  }
                }
              }
            }
          }
        },
        valid: (player, _type, fuse) => {
          const parts = fuse.split(',');
          // Check if farmer is this player and it's a trophy capture
          const farmer = parseInt(parts[1], 10);
          const isTrophy = parts[2] === '1';
          if (farmer !== player.uid || !isTrophy) return false;
          // Check if any opponent has a pet
          for (let i = 3; i < parts.length; i++) {
            const pet = parseInt(parts[i], 10);
            if (isNaN(pet) || pet === 0) continue;
            for (const p of this.board.garden.values()) {
              if (p.isAlive && p.team === player.oppTeam) {
                for (const ep of p.pets) {
                  if (ep !== 0) return true;
                }
              }
            }
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // X3W02 - WenHui (温慧)
  // ═══════════════════════════════════════════════

  private registerX3W02(): EffectRegistration[] {
    return [
      // JN40201 - Toggle STR+3 based on support status
      {
        code: 'JN40201',
        action: (player, _type, _fuse, _argst) => {
          const hasStr3 = player.ram.getBool('STR+3');
          if (!hasStr3) {
            player.ram.set('STR+3', true);
            this.raiseGMessage(`G0IA,${player.uid},1,3`);
          } else {
            player.ram.set('STR+3', false);
            this.raiseGMessage(`G0OA,${player.uid},1,3`);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0 || (type === 1 && this.board.rounder.uid === player.uid)) {
            const hasStr3 = player.ram.getBool('STR+3');
            if (!hasStr3 && this.board.supportSucc) return true;
            else if (hasStr3 && !this.board.supportSucc) return true;
          }
          return false;
        },
      },
      // JN40202 - When battle lost, deal 2 damage to a target
      {
        code: 'JN40202',
        action: (player, _type, _fuse, argst) => {
          const who = parseInt(argst, 10);
          const target = this.board.garden.get(who);
          if (target) {
            this.harm(player, target, 2);
          }
        },
        valid: (player, _type, _fuse) => {
          return !this.board.isBattleWin && [...this.board.garden.values()].some(
            p => p.isTared && p.uid !== player.uid,
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/T1${this.aAllTareds(player)}`;
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // X3W03 - XingXuan (星璇)
  // ═══════════════════════════════════════════════

  private registerX3W03(): EffectRegistration[] {
    return [
      // JN40301 - Use as TP02 (窥测天机)
      {
        code: 'JN40301',
        action: (player, type, fuse, argst) => {
          this.raiseGMessage(
            `G0CC,${player.uid},0,${player.uid},TP02,${argst};${type},${fuse}`,
          );
        },
        valid: (player, type, _fuse) => {
          if (type === 0) return player.tux.length >= 2;
          else if (type === 1) {
            return [...this.board.garden.values()].some(p => p.isTared && p.hp === 0);
          }
          return false;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            if (player.tux.length >= 2) return `/Q2(p${player.tux.join('p')})`;
            return '/';
          }
          return '';
        },
      },
      // JN40302 - Give cards to teammates (兄弟)
      {
        code: 'JN40302',
        action: async (player, _type, _fuse, _argst) => {
          // Get cards from teammates first
          const getGroup = [...this.board.garden.values()]
            .filter(p => p.uid !== player.uid && p.isAlive && p.team === player.team && p.tux.length > 0)
            .map(p => `${p.uid},2,${p.tux.length}`)
            .join(',');
          if (getGroup) {
            this.raiseGMessage(`G0HQ,0,${player.uid},${getGroup}`);
          }
          // Loop: ask player to give cards to teammates
          do {
            const carg = player.tux.length > 1
              ? `/+Q1~${player.tux.length}(p${player.tux.join('p')})`
              : `/+Q1(p${player.tux.join('p')})`;
            const targ = `/T1${this.formatPlayers(p => p.isTared && p.uid !== player.uid && p.team === player.team)}`;
            const select = await this.asyncInput(player.uid, carg + ',' + targ, 'JN40302', '0');
            if (select === '0' || select === '/0' || select === '') break;
            const idx = select.lastIndexOf(',');
            const to = parseInt(select.substring(idx + 1), 10);
            const cardsString = select.substring(0, idx);
            if (to === 0) continue;
            const cards = cardsString.split(',').map(p => parseInt(p, 10));
            this.raiseGMessage(
              `G0HQ,0,${to},${player.uid},1,${cards.length},${cards.join(',')}`,
            );
          } while (player.tux.length > 0);
        },
        valid: (player, _type, _fuse) => {
          return [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.team && p.tux.length > 0,
          );
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // X3W04 - WangPengXu (王蓬絮)
  // ═══════════════════════════════════════════════

  private registerX3W04(): EffectRegistration[] {
    return [
      // JN40401 - Discard any card to heal 2
      {
        code: 'JN40401',
        action: (player, _type, _fuse, args) => {
          const card = parseInt(args, 10);
          if (card !== 0 && player.listOutAllCards().includes(card)) {
            this.raiseGMessage(`G0QZ,${player.uid},${card}`);
            this.cure(player, player, 2);
          }
        },
        valid: (player, _type, _fuse) => {
          return player.hasAnyCards();
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.listOutAllCards().join('p')})`;
          return '';
        },
      },
      // JN40402 - Equip cards as exCards
      {
        code: 'JN40402',
        action: (player, _type, _fuse, args) => {
          const cards = args.split(',').map(p => parseInt(p, 10));
          this.raiseGMessage(`G0IX,${player.uid},0,${cards.length}`);
        },
        valid: (player, _type, _fuse) => {
          return player.exCards.length < 5 && player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const cds = player.tux.filter(ut => {
              const tux = this.libGroup.tl.decodeTux(ut);
              return tux && (tux.type === TuxType.WQ || tux.type === TuxType.FJ);
            });
            const count = (cds.length + player.exCards.length <= 5)
              ? cds.length
              : (5 - player.exCards.length);
            if (cds.length === 0) return '/';
            return `/Q1${count > 1 ? '~' + count : ''}(p${cds.join('p')})`;
          }
          return '';
        },
      },
      // JN40403 - Bonus when exCards equipped/lost
      {
        code: 'JN40403',
        action: (player, type, _fuse, argst) => {
          if (type === 0) {
            const count = argst.split(',').length;
            this.raiseGMessage(`G0IA,${player.uid},0,${count}`);
          } else if (type === 1) {
            this.raiseGMessage(`G0OA,${player.uid},0,${argst}`);
          }
        },
        valid: (_player, type, _fuse) => {
          return type === 0 || type === 1;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ203 - ShenQishuang (沈欺霜)
  // ═══════════════════════════════════════════════

  private registerXJ203(): EffectRegistration[] {
    return [
      // JN20301 - 仙霞五奇: STR+3 toggle on battle entry / pool refresh
      {
        code: 'JN20301',
        action: (player, type, _fuse, _argst) => {
          const isOnTeam = player.team === this.board.rounder.team;
          const isOnOpp = player.team === this.board.rounder.oppTeam;

          if (type === 0) {
            // Battle entry
            if (isOnTeam) {
              player.ram.set('STR+3', true);
              this.targetPlayer(player.uid, this.board.rounder.uid);
              this.raiseGMessage(`G0IA,${this.board.rounder.uid},1,3`);
            } else if (isOnOpp) {
              if (NMBLib.isMonster(this.board.monster1)) {
                player.ram.set('STR+3', true);
                this.raiseGMessage(`G2YS,T,${player.uid},M,1`);
                this.raiseGMessage(`G0IB,${this.board.monster1},3`);
              }
            }
          } else if (type === 1) {
            // Pool refresh toggle
            if (isOnTeam) {
              if (!player.ram.getBool('STR+3')) {
                player.ram.set('STR+3', true);
                this.targetPlayer(player.uid, this.board.rounder.uid);
                this.raiseGMessage(`G0IA,${this.board.rounder.uid},1,3`);
              } else {
                player.ram.set('STR+3', false);
                this.targetPlayer(player.uid, this.board.rounder.uid);
                this.raiseGMessage(`G0OA,${this.board.rounder.uid},1,3`);
              }
            } else if (isOnOpp) {
              if (NMBLib.isMonster(this.board.monster1)) {
                if (!player.ram.getBool('STR+3')) {
                  player.ram.set('STR+3', true);
                  this.raiseGMessage(`G2YS,T,${player.uid},M,1`);
                  this.raiseGMessage(`G0IB,${this.board.monster1},3`);
                } else {
                  player.ram.set('STR+3', false);
                  this.raiseGMessage(`G2YS,T,${player.uid},M,1`);
                  this.raiseGMessage(`G0OB,${this.board.monster1},3`);
                }
              }
            }
          }
        },
        valid: (player, type, fuse) => {
          const isOnTeam = player.team === this.board.rounder.team;
          const isOnOpp = player.team === this.board.rounder.oppTeam;

          const computeNotIn = (): boolean => {
            if (isOnTeam) {
              return this.board.supporter.uid === 0 || !this.board.supportSucc;
            } else if (isOnOpp) {
              return this.board.hinder.uid === 0 || !this.board.hinderSucc;
            }
            return false;
          };

          if (type === 0) {
            const notin = computeNotIn();
            if (!player.ram.getBool('STR+3') && notin) return true;
            if (player.ram.getBool('STR+3') && !notin) return true;
          } else if (type === 1 && this.board.poolEnabled) {
            // Parse G2YS fuse to check pool context
            const fuseParts = fuse.split(',');
            const isPoolRefresh = fuseParts.some(p => p === 'P');
            if (!isPoolRefresh) return false;
            const notin = computeNotIn();
            if (!player.ram.getBool('STR+3') && notin) return true;
            if (player.ram.getBool('STR+3') && !notin) return true;
          }
          return false;
        },
      },
      // JN20302 - 元灵归心术: Discard JP card to heal target 2
      {
        code: 'JN20302',
        action: (player, _type, _fuse, argst) => {
          const idx = argst.indexOf(',');
          const card = parseInt(argst.substring(0, idx), 10);
          const to = parseInt(argst.substring(idx + 1), 10);
          this.raiseGMessage(`G0QZ,${player.uid},${card}`);
          this.cure(player, this.board.garden.get(to)!, 2);
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            // Filter for JP type tux cards
            const jpCards = player.tux.filter(ut => {
              const tux = this.libGroup.tl.decodeTux(ut);
              return tux !== null && tux.type === TuxType.JP;
            });
            if (jpCards.length > 0) {
              return `/+Q1(p${jpCards.join('p')})`;
            }
            return '/';
          } else if (!prev.includes(',')) {
            return '/T1' + this.aAllTareds(player);
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ206 - KongLin (孔璘)
  // ═══════════════════════════════════════════════

  private registerXJ206(): EffectRegistration[] {
    return [
      // JN20601 - Harm self and a female target
      {
        code: 'JN20601',
        action: (player, _type, _fuse, args) => {
          const who = parseInt(args, 10);
          this.harmMultiple(player, [player, this.board.garden.get(who)!], 1);
          player.ram.getOrSetUshortArray('harmed').push(who);
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const v1 = [...this.board.garden.values()].filter(p =>
              p.isTared && p.gender === 'F' &&
              !player.ram.getOrSetUshortArray('harmed').includes(p.uid),
            ).map(p => p.uid);
            return '/T1(p' + v1.join('p') + ')';
          }
          return '';
        },
        valid: (player, _type, _fuse) => {
          return player.hp >= 2 && [...this.board.garden.values()].some(p =>
            p.isTared && p.gender === 'F' &&
            !player.ram.getOrSetUshortArray('harmed').includes(p.uid),
          );
        },
      },
      // JN20602 - Transform to XJ207 (魔尊) on G0ZW
      {
        code: 'JN20602',
        action: (player, _type, fuse, _args) => {
          const blocks = fuse.split(',');
          let zw = '';
          for (let i = 1; i < blocks.length; ++i) {
            if (blocks[i] !== player.uid.toString()) {
              zw += ',' + blocks[i];
            }
          }
          this.raiseGMessage(`G0OY,0,${player.uid}`);
          this.raiseGMessage(`G0IY,0,${player.uid},10207`);
          if (zw !== '') this.innerGMessage('G0ZW' + zw, -10);
        },
        valid: (player, _type, fuse) => {
          const blocks = fuse.split(',');
          for (let i = 1; i < blocks.length; ++i) {
            if (blocks[i] === player.uid.toString()) return true;
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ106 - Jiujianxian (酒剑仙)
  // ═══════════════════════════════════════════════

  private registerXJ106(): EffectRegistration[] {
    return [
      // JN10601 - Weapon equip/unequip bonus
      // type 0: I'C (equip import) - gain 1 STR per weapon equipped
      // type 1: O'C (equip export) - lose 1 STR per weapon unequipped
      {
        code: 'JN10601',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            // Count weapons imported for this player from fuse
            let n = 0;
            const parts = _fuse.split(',');
            for (let i = 1; i < parts.length; i += 2) {
              const ut = parseInt(parts[i], 10);
              if (parts[i - 1] === player.uid.toString() && ut !== 0) {
                const tux = this.libGroup.tl.decodeTux(ut);
                if (tux && tux.type === TuxType.WQ) n++;
              }
            }
            if (n > 0) this.raiseGMessage(`G0IX,${player.uid},0,${n}`);
          } else if (type === 1) {
            // Count weapons exported for this player from fuse
            let n = 0;
            const parts = _fuse.split(',');
            for (let i = 1; i < parts.length; i += 2) {
              const ut = parseInt(parts[i], 10);
              if (parts[i - 1] === player.uid.toString() && ut !== 0) {
                const tux = this.libGroup.tl.decodeTux(ut);
                if (tux && tux.type === TuxType.WQ) n++;
              }
            }
            if (n > 0) this.raiseGMessage(`G0OX,${player.uid},0,${n}`);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) {
            // Check if any weapon was equipped for this player
            const parts = _fuse.split(',');
            for (let i = 1; i < parts.length; i += 2) {
              const ut = parseInt(parts[i], 10);
              if (parts[i - 1] === player.uid.toString() && ut !== 0) {
                const tux = this.libGroup.tl.decodeTux(ut);
                if (tux && tux.type === TuxType.WQ) return true;
              }
            }
            return false;
          } else if (type === 1) {
            // Check if any weapon was unequipped for this player
            const parts = _fuse.split(',');
            for (let i = 1; i < parts.length; i += 2) {
              const ut = parseInt(parts[i], 10);
              if (parts[i - 1] === player.uid.toString() && ut !== 0) {
                const tux = this.libGroup.tl.decodeTux(ut);
                if (tux && tux.type === TuxType.WQ) return true;
              }
            }
            return false;
          }
          return false;
        },
      },
      // JN10602 - Double fight (Lockin skill)
      // type 0: trigger - ask if want second battle
      // type 1: G0HT handler - add 1 to hand count for duo fight
      // type 2: set AllowNoSupport = false
      {
        code: 'JN10602',
        action: async (player, type, fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage('G1SG,0');
            const yes = await this.asyncInput(
              player.uid,
              '#是否进行第二次战斗？##不进行##进行,Y2',
              'JN10602',
              '0',
            );
            if (yes === '2') {
              player.rfm.set('DuoFight', 1);
              this.raiseGMessage(`G17F,DONE,${player.uid}`);
              this.board.cleanBattler();
              this.raiseGMessage(`G2GOTO,R${player.uid}ZW`);
            } else {
              player.rfm.set('DuoFight', 2);
            }
          } else if (type === 1) {
            // G0HT handler: add 1 to hand count for duo fight
            const parts = fuse.split(',');
            for (let i = 1; i < parts.length; i += 2) {
              const ut = parseInt(parts[i], 10);
              const n = parseInt(parts[i + 1], 10);
              if (ut === player.uid && n > 0) {
                parts[i + 1] = (n + 1).toString();
              }
            }
            this.innerGMessage(parts.join(','), 41);
          } else if (type === 2) {
            this.board.allowNoSupport = false;
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) {
            return this.board.battler !== null &&
              player.rfm.getInt('DuoFight') === 0 &&
              this.board.monPiles.count > 0;
          } else if (type === 1) {
            if (player.rfm.getInt('DuoFight') === 2) {
              const parts = fuse.split(',');
              for (let i = 1; i < parts.length; i += 2) {
                const ut = parseInt(parts[i], 10);
                const n = parseInt(parts[i + 1], 10);
                if (ut === player.uid && n > 0) return true;
              }
            }
            return false;
          } else if (type === 2) {
            return player.rfm.getInt('DuoFight') === 1;
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ107 - Baiyue Lord (拜月教主)
  // ═══════════════════════════════════════════════

  private registerXJ107(): EffectRegistration[] {
    return [
      // JN10701 - 水魔兽合体: STR+2 when fighting AQUA/AGNI monster
      {
        code: 'JN10701',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},1,2`);
        },
        valid: (player, _type, _fuse) => {
          if (this.board.isAttendWar(player) && this.board.battler !== null &&
            this.board.battler.isMonster()) {
            const b = this.board.battler as Monster;
            return b.element === FiveElement.AQUA || b.element === FiveElement.AGNI;
          }
          return false;
        },
      },
      // JN10702 - Discard 2 tux to deal damage to all enemies and gain 5 pool
      {
        code: 'JN10702',
        action: (player, _type, _fuse, argst) => {
          if (argst !== '0') {
            player.restZP = 0;
            this.raiseGMessage(`G0QZ,${player.uid},${argst}`);
            this.raiseGMessage(`G2YS,T,${player.uid},P,${player.team}`);
            this.raiseGMessage(`G0IP,${player.team},5`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && player.tux.length >= 2 && player.restZP > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q2(p${player.tux.join('p')})`;
          else return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ207 - Mozun (魔尊)
  // ═══════════════════════════════════════════════

  private registerXJ207(): EffectRegistration[] {
    return [
      // JN20701 - Draw 1 card
      {
        code: 'JN20701',
        action: (player, _type, _fuse, _args) => {
          this.raiseGMessage(`G0DH,${player.uid},0,1`);
        },
      },
      // JN20702 - Harm self for 1
      {
        code: 'JN20702',
        action: (player, _type, _fuse, _args) => {
          this.harm(player, player, 1);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ501 - JiangYunfan (姜云凡)
  // ═══════════════════════════════════════════════

  private registerXJ501(): EffectRegistration[] {
    return [
      // JN60101 - Use ZP card even when ZP is disabled
      {
        code: 'JN60101',
        action: (player, _type, fuse, argst) => {
          const card = parseInt(argst, 10);
          const decoded = this.libGroup.tl.decodeTux(card);
          const code = decoded ? decoded.code : `TP${String(card).padStart(4, '0')}`;
          this.raiseGMessage(`G0CC,${player.uid},0,${player.uid},${code},${card};0,${fuse}`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0 && (player.restZP === 0 || player.zpDisabled);
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const v1 = player.tux.filter(ut => {
              const tux = this.libGroup.tl.decodeTux(ut);
              return tux !== null && tux.type === TuxType.ZP;
            });
            if (v1.length > 0) return `/Q1(p${v1.join('p')})`;
            else return '/';
          }
          return '';
        },
      },
      // JN60102 - Fortress: Block damage for teammates
      {
        code: 'JN60102',
        action: (player, type, fuse, argst) => {
          if (type === 0) {
            const idx = argst.indexOf(',');
            if (idx >= 0) {
              const to = parseInt(argst.substring(0, idx), 10);
              const cdstr = argst.substring(idx + 1);
              const oy = this.board.garden.get(to);
              if (oy && cdstr !== '' && cdstr !== '0' && !cdstr.startsWith('/')) {
                const card = parseInt(cdstr, 10);
                this.raiseGMessage(`G0HQ,0,${to},${player.uid},1,1,${card}`);
                oy.ram.getOrSetUshortArray('fortress').push(player.uid);
              }
            }
            this.innerGMessage(fuse, 121);
          } else if (type === 1) {
            const to = parseInt(argst, 10);
            const oy = this.board.garden.get(to);
            if (oy) oy.ram.set('fortress', null);
            this.innerGMessage(fuse, 122);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) return true;
          else if (type === 1) {
            const arr = player.ram.getUshortArray('fortress');
            return arr !== null && arr.includes(player.uid);
          }
          return false;
        },
        input: (player, type, fuse, prev) => {
          if (type === 0) {
            if (prev === '') return '';
            else if (!isNaN(parseInt(prev, 10))) {
              const blocks = fuse.split(',');
              let fi = 1;
              while (fi < blocks.length) {
                const n = parseInt(blocks[fi + 2], 10);
                if (blocks[fi + 1] === '0') {
                  const who = parseInt(blocks[fi], 10);
                  if (who === player.uid && n > 0) {
                    const cards = blocks.slice(fi + 4, fi + 4 + n);
                    return `/Q1(p${cards.join('p')})`;
                  }
                }
                fi += (n + 4);
              }
              return '';
            }
            return '';
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ502 - TangYurou (唐雨柔)
  // ═══════════════════════════════════════════════

  private registerXJ502(): EffectRegistration[] {
    return [
      // JN60201 - Use cards on behalf of others (delegation context)
      {
        code: 'JN60201',
        action: (player, _type, fuse, argst) => {
          const ichicm = argst.indexOf(',');
          const nicm = argst.indexOf(',', ichicm + 1);
          const to = parseInt(argst.substring(0, ichicm), 10);
          const ut = parseInt(argst.substring(ichicm + 1, nicm), 10);
          const decoded = this.libGroup.tl.decodeTux(ut);
          const code = decoded ? decoded.code : `TP${String(ut).padStart(4, '0')}`;
          this.targetPlayer(player.uid, to);
          this.raiseGMessage(`G0CC,${player.uid},0,${to},${code},${ut};0,${fuse};DELEGATE,${player.uid}`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const targets = [...this.board.garden.values()]
              .filter(p => p.isTared && p.uid !== player.uid)
              .map(p => p.uid);
            return `/T1(p${targets.join('p')})`;
          } else if (!prev.includes(',')) {
            return `/Q1(p${player.tux.join('p')})`;
          }
          return '';
        },
      },
      // JN60202 - Flip monster cards for teammates
      {
        code: 'JN60202',
        action: (player, _type, _fuse, _argst) => {
          const list = this.board.orderedPlayer();
          for (const who of list) {
            const py = this.board.garden.get(who);
            if (py && who !== player.uid && py.isAlive && py.team === player.team) {
              if (this.board.monPiles.count <= 0) break;
              const mon = this.board.monPiles.dequeue() as number;
              this.raiseGMessage('G2IN,1,1');
              if (mon === 0) break;
              if (NMBLib.isMonster(mon)) {
                this.raiseGMessage(`G2YS,T,${who},M,${mon}`);
              }
              if (this.board.monPiles.count <= 0) break;
            }
          }
          this.raiseGMessage(`G0ZW,${player.uid}`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.monPiles.count > 0;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ503 - LongYou (龙幽)
  // ═══════════════════════════════════════════════

  private registerXJ503(): EffectRegistration[] {
    return [
      // JN60301 - STR bonus based on female attenders count
      {
        code: 'JN60301',
        action: (player, type, _fuse, _argst) => {
          const count = [...this.board.garden.values()].filter(
            p => p.isAlive && p.gender === 'F' && this.board.isAttendWar(p),
          ).length;
          if (type === 0) {
            player.ram.set('Girlfriend', count);
            this.raiseGMessage(`G0IA,${player.uid},1,${count}`);
          } else {
            const prevCount = player.ram.getInt('Girlfriend');
            const delta = count - prevCount;
            player.ram.set('Girlfriend', count);
            if (delta > 0) this.raiseGMessage(`G0IA,${player.uid},1,${delta}`);
            else if (delta < 0) this.raiseGMessage(`G0OA,${player.uid},1,${-delta}`);
          }
        },
        valid: (player, type, _fuse) => {
          if (this.board.poolEnabled) {
            const count = [...this.board.garden.values()].filter(
              p => p.isAlive && p.gender === 'F' && this.board.isAttendWar(p),
            ).length;
            if (type === 0) return count > 0;
            else return count !== player.ram.getInt('Girlfriend');
          }
          return false;
        },
      },
      // JN60302 - Support bonus: +2 STR when supporting
      {
        code: 'JN60302',
        action: (player, _type, _fuse, _argst) => {
          player.ram.set('Hit', true);
          this.targetPlayer(player.uid, this.board.supporter.uid);
          this.raiseGMessage(`G0IX,${this.board.supporter.uid},2`);
        },
        valid: (player, _type, fuse) => {
          return player.uid === this.board.rounder.uid && this.board.supporter.uid !== 0 &&
            fuse.includes('CheckHit') && !player.ram.getBool('Hit');
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ504 - XiaoMan (小蛮)
  // ═══════════════════════════════════════════════

  private registerXJ504(): EffectRegistration[] {
    return [
      // JN60401 - Use JP card from hand
      {
        code: 'JN60401',
        action: (player, _type, fuse, argst) => {
          const card = parseInt(argst, 10);
          const decoded = this.libGroup.tl.decodeTux(card);
          const code = decoded ? decoded.code : `TP${String(card).padStart(4, '0')}`;
          this.raiseGMessage(`G0CC,${player.uid},0,${player.uid},${code},${card};0,${fuse}`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const v1 = player.tux.filter(ut => {
              const tux = this.libGroup.tl.decodeTux(ut);
              return tux !== null && tux.type === TuxType.JP;
            });
            if (v1.length > 0) return `/Q1(p${v1.join('p')})`;
            else return '/';
          }
          return '';
        },
      },
      // JN60402 - Draw 1 card when attending war
      {
        code: 'JN60402',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0DH,${player.uid},0,1`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player);
        },
      },
      // JN60403 - Discard 2 cards to draw 1 for target
      {
        code: 'JN60403',
        action: (player, _type, _fuse, argst) => {
          const blocks = argst.split(',');
          const cards = blocks.slice(0, blocks.length - 1).map(p => parseInt(p, 10));
          const target = parseInt(blocks[blocks.length - 1], 10);
          this.raiseGMessage(`G0QZ,${player.uid},${cards.join(',')}`);
          this.raiseGMessage(`G0DH,${target},0,1`);
        },
        valid: (player, _type, _fuse) => {
          return player.isAlive && player.tux.length >= 2;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q2(p${player.tux.join('p')})`;
          else if (prev.indexOf(',') === prev.lastIndexOf(','))
            return `/T1${this.aAllTareds(player)}`;
          else return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ505 - JiangShili (姜世离)
  // ═══════════════════════════════════════════════

  private registerXJ505(): EffectRegistration[] {
    return [
      // JN60501 - Pool mode: contribute HP to team pool
      {
        code: 'JN60501',
        action: (player, type, _fuse, _argst) => {
          if (type === 0 || type === 1 || type === 2 || type === 4) {
            const point = player.hpBase - player.hp;
            this.raiseGMessage(`G1WP,${player.team},${player.uid},JN60501,${point}`);
          } else if (type === 3) {
            this.raiseGMessage(`G1WP,${player.team},${player.uid},JN60501,0`);
          }
        },
        valid: (player, type, fuse) => {
          const self = this.board.rounder.uid === player.uid;
          if (type === 0) return this.board.isAttendWar(player) && !self && player.hp < player.hpBase;
          else if (type === 3 || type === 4) {
            return this.isMathISOS('JN60501', player, fuse) && this.board.isAttendWar(player) && !self && player.hp < player.hpBase;
          }
          return false;
        },
      },
      // JN60502 - Sacrifice: Skip turn to boost team
      {
        code: 'JN60502',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G0IA,${player.uid},2`);
            player.rom.set('Sacrified', true);
            this.raiseGMessage(`G0GOTO,R${this.board.rounder.uid}ZN`);
          } else if (type === 1) {
            this.raiseGMessage(`G0ZW,${player.uid}`);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) return this.board.isAttendWar(player);
          else if (type === 1) return player.rom.getBool('Sacrified');
          else return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ506 - Moyi (魔翳)
  // ═══════════════════════════════════════════════

  private registerXJ506(): EffectRegistration[] {
    return [
      // JN60601 - Ban heroes from selection
      {
        code: 'JN60601',
        action: (player, type, fuse, _argst) => {
          if (type === 0) {
            const blocks = fuse.split(',');
            const heros: number[] = [];
            for (let i = 1; i < blocks.length; i++) {
              const uid = parseInt(blocks[i], 10);
              if (uid !== player.uid) {
                const py = this.board.garden.get(uid);
                if (py) heros.push(py.selectHero);
              }
            }
            for (const h of heros) {
              player.tokenExcl.push(`H${h}`);
            }
            this.board.bannedHero.push(...heros);
            if (this.board.poolEnabled) {
              this.raiseGMessage(`G0IP,${player.team},${heros.length}`);
            }
          } else if (type === 1) {
            this.raiseGMessage(`G0IP,${player.team},${player.tokenExcl.length}`);
          } else if (type === 2) {
            const souls = player.tokenExcl
              .filter(p => p.startsWith('H'))
              .map(p => parseInt(p.substring(1), 10));
            for (const s of souls) {
              const idx = this.board.bannedHero.indexOf(s);
              if (idx !== -1) this.board.bannedHero.splice(idx, 1);
              this.board.heroDises.push(s);
            }
            if (this.board.poolEnabled) {
              this.raiseGMessage(`G0OP,${player.team},${souls.length}`);
            }
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) {
            const blocks = _fuse.split(',');
            for (let i = 1; i < blocks.length; i++) {
              if (blocks[i] !== player.uid.toString()) return true;
            }
            return false;
          } else if (type === 1) return player.tokenExcl.length > 0;
          return false;
        },
      },
      // JN60602 - When alone, draw 3 and transform
      {
        code: 'JN60602',
        action: (player, _type, fuse, _argst) => {
          this.raiseGMessage(`G0DH,${player.uid},3`);
          this.raiseGMessage(`G0OY,0,${player.uid}`);
          this.raiseGMessage(`G0IY,0,${player.uid},10607`);
          this.innerGMessage(fuse, 341);
        },
        valid: (player, _type, _fuse) => {
          return !([...this.board.garden.values()].some(
            p => p.uid !== player.uid && p.isAlive && p.team === player.team,
          ));
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ507 - YanShiQiongBing (湮世穹兵)
  // ═══════════════════════════════════════════════

  private registerXJ507(): EffectRegistration[] {
    return [
      // JN60701 - +2 STR
      {
        code: 'JN60701',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},1,2`);
        },
        valid: () => true,
      },
      // JN60702 - Roll dice, if >=5 deal 2 damage to all others
      {
        code: 'JN60702',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0TT,${player.uid}`);
          if (this.board.diceValue >= 5) {
            const targets = [...this.board.garden.values()].filter(
              p => p.uid !== player.uid && p.isAlive,
            );
            this.harmMultiple(player, targets, 2);
          }
        },
        valid: () => true,
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // XJ508 - OuyangHui (欧阳慧)
  // ═══════════════════════════════════════════════

  private registerXJ508(): EffectRegistration[] {
    return [
      // JN60801 - Token count management
      {
        code: 'JN60801',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            const od = player.tokenCount;
            if (player.tokenCount < 4) {
              this.raiseGMessage(`G1MI,${player.uid},1`);
            }
            const delta = Math.floor(player.tokenCount / 2) - Math.floor(od / 2);
            if (delta > 0) this.raiseGMessage(`G0IX,${player.uid},0,${delta}`);
          } else if (type === 1) {
            const dtcDelta = 1;
            const zelta = Math.floor(player.tokenCount / 2) - Math.floor((player.tokenCount - dtcDelta) / 2);
            this.raiseGMessage(`G0OX,${player.uid},0,${zelta}`);
          }
        },
        valid: (player, type, _fuse) => {
          if (type === 0) return this.board.isAttendWar(player) && player.tokenCount < 4;
          else if (type === 1) return player.tokenCount >= 2;
          return false;
        },
      },
      // JN60802 - Leiping: Redirect damage using tokens
      {
        code: 'JN60802',
        action: (player, _type, fuse, argst) => {
          const parts = argst.split(',');
          const who = parseInt(parts[0], 10);
          const point = parseInt(parts[1], 10);
          const harms = this.parseHarmFuse(fuse);
          const remaining: typeof harms = [];
          for (const harm of harms) {
            if (harm.who === who && harm.n > 0 &&
              !FiveElementHelper.isSet(harm.mask, HPEvoMask.TERMIN_AT) &&
              !FiveElementHelper.isSet(harm.mask, HPEvoMask.DECR_INVAO)) {
              this.targetPlayer(player.uid, who);
              harm.n -= point;
              this.raiseGMessage(`G1MC,${player.uid},${point}`);
              if (harm.n <= 0) continue;
            }
            remaining.push(harm);
          }
          if (remaining.length > 0) {
            this.innerGMessage(this.harmsToMessage(remaining), 70);
          }
        },
        valid: (player, _type, fuse) => {
          if (player.tokenCount <= 0) return false;
          const harms = this.parseHarmFuse(fuse);
          return harms.some(h =>
            h.n > 0 && this.board.garden.get(h.who)?.isTared &&
            !FiveElementHelper.isSet(h.mask, HPEvoMask.TERMIN_AT) &&
            !FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO));
        },
        input: (player, _type, fuse, prev) => {
          if (prev === '') {
            const harms = this.parseHarmFuse(fuse);
            const targets = harms.filter(h =>
              h.n > 0 && this.board.garden.get(h.who)?.isTared &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.TERMIN_AT) &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO))
              .map(h => h.who);
            const unique = [...new Set(targets)];
            return `/T1(p${unique.join('p')})`;
          } else if (!prev.includes(',')) {
            const tar = parseInt(prev, 10);
            let point = 0;
            const harms = this.parseHarmFuse(fuse);
            for (const harm of harms) {
              if (harm.who === tar) { point = harm.n; break; }
            }
            if (point > player.tokenCount) point = player.tokenCount;
            return point === 0 ? '' : `/D1${point === 1 ? '' : '~' + point}`;
          }
          return '';
        },
      },
      // JN60803 - Spend half tokens for AOE thunder damage
      {
        code: 'JN60803',
        action: (player, _type, _fuse, _argst) => {
          const count = Math.floor(player.tokenCount / 2);
          if (count > 0) {
            this.raiseGMessage(`G1MC,${player.uid},${player.tokenCount}`);
            const targets = [...this.board.garden.values()].filter(
              p => p.isAlive && p.team === player.oppTeam,
            );
            this.harmMultiple(player, targets, count, FiveElement.THUNDER);
          }
        },
        valid: (player, _type, _fuse) => {
          return player.tokenCount >= 2;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL004 - YeFengling (叶风铃)
  // ═══════════════════════════════════════════════

  private registerHL004(): EffectRegistration[] {
    return [
      // JNH0401 - Discard 2 cards to boost monster damage
      {
        code: 'JNH0401',
        action: (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          this.raiseGMessage(`G0OW,${this.board.monster1},2`);
          this.raiseGMessage(`G1TH,${player.uid},0,0,0,0`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length >= 2 && player.team === this.board.rounder.team;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q2(p${player.tux.join('p')})`;
          return '';
        },
      },
      // JNH0402 - TokenAwake: team draw on ally harm/cure
      {
        code: 'JNH0402',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G1MA,${player.uid}`);
            player.ram.set('+1tux', true);
          } else if (type === 1 || type === 2) {
            player.ram.set('+1tux', false);
            this.raiseGMessage(`G0IP,${player.team},1`);
          } else if (type === 3) {
            this.raiseGMessage(`G1MD,${player.uid}`);
            if (player.ram.getBool('+1tux')) {
              this.raiseGMessage(`G0DH,${player.uid},0,1`);
            }
            player.ram.set('+1tux', null);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) return true;
          if ((type === 1 || type === 2) && player.tokenAwake) {
            const who = parseInt(fuse.split(',')[1], 10);
            const py = this.board.garden.get(who);
            return py !== undefined && py.team === player.team;
          }
          if (type === 3) return player.tokenAwake;
          return false;
        },
      },
      // JNH0403 - Transform target into HL005 (月神附身)
      {
        code: 'JNH0403',
        action: async (player, _type, fuse, _argst) => {
          const target = await this.asyncInput(
            player.uid, '#月神附身,T1' + this.aOthersTared(player), 'JNH0403', '0',
          );
          const who = parseInt(target, 10);
          const orgHero = this.board.garden.get(who)?.selectHero ?? 0;
          this.raiseGMessage(`G0OY,0,${who}`);
          this.raiseGMessage(`G0IY,0,${who},19005`);
          this.raiseGMessage(`G0IV,${who},${orgHero}`);
          this.board.bannedHero.push(orgHero);
        },
        valid: (player, _type, fuse) => {
          const blocks = fuse.split(',');
          for (let i = 1; i < blocks.length; ++i) {
            if (blocks[i] === player.uid.toString()) {
              return [...this.board.garden.values()].some(
                p => p.uid !== player.uid && p.isTared,
              );
            }
          }
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL005 - Lunar Deity (月神)
  // ═══════════════════════════════════════════════

  private registerHL005(): EffectRegistration[] {
    return [
      // JNH0501 - Draw 3 on IS; transform back on G0IY/G0ZW
      {
        code: 'JNH0501',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G0DH,${player.uid},0,3`);
          } else if (type === 1) {
            const orgHero = player.cossPeek() ?? 0;
            this.board.bannedHero.splice(this.board.bannedHero.indexOf(orgHero), 1);
            this.raiseGMessage(`G0OV,${player.uid},${orgHero}`);
            this.raiseGMessage(`G0OY,0,${player.uid}`);
            this.raiseGMessage(`G0IY,0,${player.uid},${orgHero}`);
          } else if (type === 2) {
            const blocks = _fuse.split(',');
            let zw = '';
            for (let i = 1; i < blocks.length; ++i) {
              if (blocks[i] !== player.uid.toString()) zw += ',' + blocks[i];
            }
            const orgHero = player.cossPeek() ?? 0;
            this.board.bannedHero.splice(this.board.bannedHero.indexOf(orgHero), 1);
            this.raiseGMessage(`G0OV,${player.uid},${orgHero}`);
            this.raiseGMessage(`G0OY,0,${player.uid}`);
            this.raiseGMessage(`G0IY,0,${player.uid},${orgHero}`);
            if (zw !== '') this.innerGMessage('G0ZW' + zw, -8);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) return this.isMathISOS('JNH0501', player, fuse);
          if (type === 1) {
            return [...this.board.garden.values()].filter(
              p => p.isAlive && p.team === player.team,
            ).length >= 3;
          }
          if (type === 2) {
            const blocks = fuse.split(',');
            for (let i = 1; i < blocks.length; ++i) {
              if (blocks[i] === player.uid.toString()) return true;
            }
          }
          return false;
        },
      },
      // JNH0502 - Burst pet/equip for TokenAwake; block enemy cure
      {
        code: 'JNH0502',
        action: (player, type, _fuse, argst) => {
          if (type === 0) {
            const args = argst.split(',');
            if (args[0] === '1') {
              this.raiseGMessage(`G0HI,${args[1]},${args[2]}`);
            } else if (args[0] === '2') {
              this.raiseGMessage(`G0ZI,${args[1]},${args[2]}`);
            }
            this.raiseGMessage(`G1MA,${player.uid}`);
          } else if (type === 1) {
            // Filter G0IH by team - only remove enemy cures
            const fuseParts = _fuse.split(';');
            const filtered = fuseParts.filter(part => {
              if (!part.startsWith('G0IH')) return true;
              const args = part.split(',');
              const targetId = parseInt(args[1], 10);
              const target = this.board.garden.get(targetId);
              return target && target.team === player.team;
            });
            this.innerGMessage(filtered.join(';'), 51);
          } else if (type === 2) {
            this.raiseGMessage(`G1MD,${player.uid}`);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) {
            return [...this.board.garden.values()].some(
              p => p.isTared && p.team === player.team && (p.hasAnyEquips() || p.getPetCount() > 0),
            );
          }
          if (type === 1 && player.tokenAwake) {
            return fuse.includes('G0IH');
          }
          if (type === 2) return player.tokenAwake;
          return false;
        },
        input: (player, type, _fuse, prev) => {
          if (type === 0) {
            if (prev === '') return '#请选择爆发项目##宠物##装备,/Y2';
            if (!prev.includes(',')) {
              const sel = parseInt(prev, 10);
              if (sel === 1) {
                const pys = [...this.board.garden.values()].filter(
                  p => p.isAlive && p.team === player.team && p.getPetCount() > 0,
                );
                if (pys.length > 0) return `#爆发宠物,/T1(p${pys.map(p => p.uid).join('p')})`;
              } else {
                const pys = [...this.board.garden.values()].filter(
                  p => p.isAlive && p.team === player.team && p.hasAnyEquips(),
                );
                if (pys.length > 0) return `#爆发装备,/T1(p${pys.map(p => p.uid).join('p')})`;
              }
            }
          }
          return '';
        },
      },
      // JNH0503 - Silence target and block damage
      {
        code: 'JNH0503',
        action: (player, type, _fuse, argst) => {
          if (type === 0) {
            this.raiseGMessage(`G0DS,${player.uid},0,1`);
            const tar = parseInt(argst, 10);
            this.raiseGMessage(`G1MT,${player.uid},${tar}`);
            this.board.garden.get(tar)?.setSilence('JNH0503');
          } else if (type === 1) {
            const tar = player.singleTokenTar;
            this.board.garden.get(tar)?.resetSilence('JNH0503');
            this.raiseGMessage(`G1MR,${player.uid},${tar}`);
          } else if (type === 2) {
            // Block harm to silenced target
            const harms = this.parseHarmFuse(_fuse);
            const filtered = harms.filter(h =>
              h.who !== player.singleTokenTar || h.n <= 0 ||
              FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO),
            );
            if (filtered.length > 0) {
              this.innerGMessage(this.harmsToMessage(filtered), -44);
            }
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) return player.tux.length > 0 && [...this.board.garden.values()].some(p => p.isTared);
          if (type === 1 && player.tokenTars.length > 0) {
            const g0ds = fuse.split(',');
            return g0ds[1] === player.uid.toString() && g0ds[2] === '1';
          }
          if (type === 2 && player.tokenTars.length > 0) {
            const harms = this.parseHarmFuse(fuse);
            return harms.some(h => h.who === player.singleTokenTar && h.n > 0 &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO));
          }
          return false;
        },
        input: (player, type, _fuse, prev) => {
          if (type === 0 && prev === '') return '/T1' + this.aAllTareds(player);
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL006 - ZhaoWen (赵文)
  // ═══════════════════════════════════════════════

  private registerHL006(): EffectRegistration[] {
    return [
      // JNH0601 - Draw from tux pile when receiving cards
      {
        code: 'JNH0601',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            const ut = this.board.tuxPiles.dequeue() as number;
            if (ut) {
              this.raiseGMessage('G2IN,0,1');
              player.exCards.push(ut);
            }
          } else if (type === 1) {
            const ut = this.board.tuxPiles.dequeue() as number;
            if (ut) {
              this.raiseGMessage('G2IN,0,1');
              player.exCards.push(ut);
            }
          } else if (type === 2) {
            const args = _argst.split(',');
            const ut = parseInt(args[0], 10);
            this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
            if (args[1] === '1') {
              const targets = args.slice(2).map(s => this.board.garden.get(parseInt(s, 10))!);
              this.cureMultiple(player, targets, 1);
            } else if (args[1] === '2') {
              const targets = args.slice(2);
              this.raiseGMessage(`G0DH,${targets.map(t => `${t},0,1`).join(',')}`);
            }
          }
        },
        valid: (player, type, fuse) => {
          if (!player.isAlive) return false;
          if (type === 0) {
            const blocks = fuse.split(',');
            for (let j = 1; j < blocks.length;) {
              const who = parseInt(blocks[j], 10);
              const inOut = parseInt(blocks[j + 1], 10);
              const ntx = parseInt(blocks[j + 3], 10);
              if (who === player.uid && inOut === 1 && ntx > 0) return true;
              j += (parseInt(blocks[j + 2], 10) + 4);
            }
          }
          if (type === 2) {
            return player.exCards.length > 0;
          }
          return false;
        },
        input: (player, type, _fuse, prev) => {
          if (type === 2 && prev === '') {
            return `#弃置「仁心」,/Q1(p${player.exCards.join('p')}),#请选择执行项##HP+1##补1张牌,Y2`;
          }
          return '';
        },
      },
      // JNH0602 - TokenAwake: reduce incoming damage by 1
      {
        code: 'JNH0602',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) {
            this.raiseGMessage(`G1MA,${player.uid}`);
          } else if (type === 1) {
            const harms = this.parseHarmFuse(_fuse);
            for (const h of harms) {
              if (!FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO) &&
                  !FiveElementHelper.isSet(h.mask, HPEvoMask.TERMIN_AT)) {
                h.n--;
              }
            }
            const filtered = harms.filter(h => h.n > 0);
            if (filtered.length > 0) this.innerGMessage(this.harmsToMessage(filtered), -149);
          } else if (type === 2) {
            this.raiseGMessage(`G1MD,${player.uid}`);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) return !player.tokenAwake;
          if (type === 1 && player.tokenAwake) {
            const harms = this.parseHarmFuse(fuse);
            return harms.some(h => h.n > 0 &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO) &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.TERMIN_AT));
          }
          if (type === 2) return player.tokenAwake;
          return false;
        },
      },
      // JNH0603 - Cure low-HP allies by discarding their cards
      {
        code: 'JNH0603',
        action: (player, _type, _fuse, argst) => {
          const idx = argst.indexOf(',');
          const tar = parseInt(argst.substring(0, idx), 10);
          const ut = parseInt(argst.substring(idx + 1), 10);
          if (ut !== 0) {
            this.raiseGMessage(`G0QZ,${tar},${ut}`);
          } else {
            this.raiseGMessage(`G0DH,${tar},2,1`);
          }
          this.cure(null, this.board.garden.get(tar)!, 1);
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return harms.some(h => {
            const py = this.board.garden.get(h.who);
            return py !== undefined && py.isTared && py.hp > 0 && py.hp < 3 && py.listOutAllCards().length > 0;
          });
        },
        input: (player, _type, fuse, prev) => {
          if (prev === '') {
            const harms = this.parseHarmFuse(fuse);
            const invs = [...new Set(harms.filter(h => {
              const py = this.board.garden.get(h.who);
              return py !== undefined && py.isTared && py.hp > 0 && py.hp < 3 && py.listOutAllCards().length > 0;
            }).map(h => h.who))];
            return `/T1(p${invs.join('p')})`;
          }
          if (!prev.includes(',')) {
            const tar = parseInt(prev, 10);
            const py = this.board.garden.get(tar)!;
            if (tar === player.uid) return `/Q1(p${py.listOutAllCards().join('p')})`;
            return `C1(p${py.listOutAllCards().join('p')})`;
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL007 - Yingyue (映月)
  // ═══════════════════════════════════════════════

  private registerHL007(): EffectRegistration[] {
    return [
      // JNH0701 - Absorb NPCs as Charm tokens; STR bonus
      {
        code: 'JNH0701',
        action: (player, type, _fuse, argst) => {
          if (type === 0) {
            const npcUt = parseInt(argst, 10);
            player.tokenExcl.push(`M${npcUt}`);
          } else if (type === 1) {
            this.raiseGMessage(`G0IP,${player.team},1`);
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) return fuse.includes('NMB');
          if (type === 1) {
            return this.board.isAttendWar(player) && player.tokenExcl.length > 0;
          }
          return false;
        },
      },
      // JNH0702 - Block enemy card plays when attending war
      {
        code: 'JNH0702',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IP,${player.team},1`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && player.tokenExcl.length > 0;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL008 - Yingyu (映雨)
  // ═══════════════════════════════════════════════

  private registerHL008(): EffectRegistration[] {
    return [
      // JNH0801 - Discard card to let elemental damage targets use spells/equips
      {
        code: 'JNH0801',
        action: (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          this.raiseGMessage(`G0IP,${player.team},1`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL009 - Lingjian (灵剑)
  // ═══════════════════════════════════════════════

  private registerHL009(): EffectRegistration[] {
    return [
      // JNH0901 - Counter opponent's ZP by discarding 2 cards
      {
        code: 'JNH0901',
        action: (player, _type, _fuse, argst) => {
          const parts = argst.split(',');
          for (const p of parts) {
            const ut = parseInt(p, 10);
            this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          }
          this.raiseGMessage(`G0IP,${player.team},2`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length >= 2 && this.board.isAttendWar(player);
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q2(p${player.tux.join('p')})`;
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL010 - ShuiLingjing (水菱精)
  // ═══════════════════════════════════════════════

  private registerHL010(): EffectRegistration[] {
    return [
      // JNH1001 - Draw cards for empty-handed allies
      {
        code: 'JNH1001',
        action: (player, _type, _fuse, _argst) => {
          const allies = [...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.team && p.tux.length === 0,
          );
          for (const a of allies) {
            this.raiseGMessage(`G0DH,${a.uid},0,1`);
          }
        },
        valid: (player, _type, _fuse) => {
          return [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.team && p.tux.length === 0,
          );
        },
      },
      // JNH1002 - Grant pet to save dying allies
      {
        code: 'JNH1002',
        action: (player, _type, _fuse, argst) => {
          const parts = argst.split(',');
          const who = parseInt(parts[0], 10);
          this.raiseGMessage(`G0HI,${player.uid},${parts[1]}`);
          this.raiseGMessage(`G0IA,${who},0,1`);
        },
        valid: (player, _type, _fuse) => {
          return player.getPetCount() > 0 && [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.team && p.hp <= 2,
          );
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL011 - ShuiGang (水缸)
  // ═══════════════════════════════════════════════

  private registerHL011(): EffectRegistration[] {
    return [
      // JNH1101 - Take cards from losing combatants
      {
        code: 'JNH1101',
        action: (player, _type, _fuse, argst) => {
          const who = parseInt(argst, 10);
          const py = this.board.garden.get(who);
          if (py && py.tux.length > 0) {
            const ut = py.tux[0];
            this.raiseGMessage(`G0HQ,2,${player.uid},${who},0,0,${ut}`);
          }
        },
        valid: (player, _type, fuse) => {
          return fuse.includes('G0OH') && this.board.isAttendWar(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL012 - LiuYing'er (柳莺儿)
  // ═══════════════════════════════════════════════

  private registerHL012(): EffectRegistration[] {
    return [
      // JNH1201 - Steal random card from each opponent
      {
        code: 'JNH1201',
        action: (player, _type, _fuse, _argst) => {
          const enemies = [...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.oppTeam && p.tux.length > 0,
          );
          for (const e of enemies) {
            const idx = Math.floor(Math.random() * e.tux.length);
            const ut = e.tux[idx];
            this.raiseGMessage(`G0HQ,2,${player.uid},${e.uid},0,0,${ut}`);
          }
        },
        valid: (player, _type, _fuse) => {
          return [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.oppTeam && p.tux.length > 0,
          );
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // HL013 - Xiongshanjun (熊山君)
  // ═══════════════════════════════════════════════

  private registerHL013(): EffectRegistration[] {
    return [
      // JNH1301 - Reveal top monster card for ATK bonus
      {
        code: 'JNH1301',
        action: (player, _type, _fuse, _argst) => {
          if (this.board.monPiles.count > 0) {
            this.raiseGMessage(`G0IB,${player.uid},2`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && this.board.monPiles.count > 0;
        },
      },
      // JNH1302 - Team draw when opponent gives up
      {
        code: 'JNH1302',
        action: (player, _type, _fuse, _argst) => {
          const allies = [...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.team,
          );
          for (const a of allies) {
            this.raiseGMessage(`G0DH,${a.uid},0,1`);
          }
        },
        valid: (player, _type, fuse) => {
          return fuse.includes('G0OH') && this.board.isAttendWar(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR001 - Suyu (素玉)
  // ═══════════════════════════════════════════════

  private registerTR001(): EffectRegistration[] {
    return [
      // JNT0101 - Conditional buff when rounder meets gender/team conditions
      {
        code: 'JNT0101',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},0,1`);
          this.raiseGMessage(`G0IX,${player.uid},0,1`);
        },
        valid: (player, _type, _fuse) => {
          if (player.uid === this.board.rounder.uid) return false;
          const rd = this.board.rounder;
          return (rd.team === player.team && rd.gender === 'M') ||
                 (rd.team === player.oppTeam && rd.gender === 'F');
        },
      },
      // JNT0102 - Reduce AQUA/AGNI harm to allies by 1
      {
        code: 'JNT0102',
        action: (player, _type, fuse, _argst) => {
          const harms = this.parseHarmFuse(fuse);
          for (const h of harms) {
            const py = this.board.garden.get(h.who);
            if (py && py.team === player.team && h.n > 0 &&
                (h.element === FiveElement.AQUA || h.element === FiveElement.AGNI) &&
                !FiveElementHelper.isSet(h.mask, HPEvoMask.IMMUNE_INVAO)) {
              h.n--;
            }
          }
          const filtered = harms.filter(h => h.n > 0);
          if (filtered.length > 0) this.innerGMessage(this.harmsToMessage(filtered), -19);
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return harms.some(h => {
            const py = this.board.garden.get(h.who);
            return py !== undefined && py.team === player.team && h.n > 0 &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.IMMUNE_INVAO) &&
              (h.element === FiveElement.AQUA || h.element === FiveElement.AGNI);
          });
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR002 - XuChangqing (徐长卿)
  // ═══════════════════════════════════════════════

  private registerTR002(): EffectRegistration[] {
    return [
      // JNT0201 - Ally draws 2 when enemy obtains pet
      {
        code: 'JNT0201',
        action: (player, _type, _fuse, argst) => {
          const who = parseInt(argst, 10);
          this.raiseGMessage(`G0DH,${who},0,2`);
        },
        valid: (player, _type, fuse) => {
          return fuse.includes('G2HP');
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const allies = [...this.board.garden.values()].filter(
              p => p.isAlive && p.team === player.team && p.uid !== player.uid,
            );
            return `/T1(p${allies.map(p => p.uid).join('p')})`;
          }
          return '';
        },
      },
      // JNT0202 - Capture non-BOSS monster as pet on battle loss
      {
        code: 'JNT0202',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G1CK,${player.uid}`);
        },
        valid: (player, _type, _fuse) => {
          return player.uid === this.board.rounder.uid && !this.board.isAttendWarSucc(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR003 - YunTianqing (云天青)
  // ═══════════════════════════════════════════════

  private registerTR003(): EffectRegistration[] {
    return [
      // JNT0301 - +3 DEX vs non-AQUA/AGNI monsters
      {
        code: 'JNT0301',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IX,${player.uid},1,3`);
        },
        valid: (player, _type, _fuse) => {
          if (!this.board.isAttendWar(player)) return false;
          const mon = this.libGroup.ml.decode(this.board.monster1);
          if (!mon) return false;
          return mon.element !== FiveElement.AQUA && mon.element !== FiveElement.AGNI;
        },
      },
      // JNT0302 - Give pet to teammate, draw 2
      {
        code: 'JNT0302',
        action: (player, _type, _fuse, argst) => {
          const parts = argst.split(',');
          const pet = parseInt(parts[0], 10);
          const to = parseInt(parts[1], 10);
          this.raiseGMessage(`G0HI,${player.uid},${pet}`);
          this.raiseGMessage(`G0IA,${to},0,1`);
          this.raiseGMessage(`G0DH,${player.uid},0,2`);
        },
        valid: (player, _type, _fuse) => {
          return player.getPetCount() > 0 && [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.team && p.uid !== player.uid && p.isTared,
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/M1(p${player.pets.filter(p => p !== 0).join('p')})`;
          if (!prev.includes(',')) return `/T1(p${[...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.team && p.uid !== player.uid && p.isTared,
          ).map(p => p.uid).join('p')})`;
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR004 - Lingyin (凌音)
  // ═══════════════════════════════════════════════

  private registerTR004(): EffectRegistration[] {
    return [
      // JNT0401 - Redirect harm to another player using elemental tokens
      {
        code: 'JNT0401',
        action: (player, _type, _fuse, argst) => {
          const tar = parseInt(argst, 10);
          this.raiseGMessage(`G0TT,${tar}`);
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return harms.some(h => h.who === player.uid && h.n > 0 &&
            !FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO)) &&
            [...this.board.garden.values()].some(p => p.uid !== player.uid && p.isTared);
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return '/T1' + this.aOthersTared(player);
          return '';
        },
      },
      // JNT0403 - Gain STR when losing tokens
      {
        code: 'JNT0403',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},0,1`);
        },
        valid: (player, _type, _fuse) => {
          return player.tokenCount > 0;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR005 - Lingbo (凌波)
  // ═══════════════════════════════════════════════

  private registerTR005(): EffectRegistration[] {
    return [
      // JNT0501 - Convert DEX to STR during others' battle
      {
        code: 'JNT0501',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},0,${player.dex}`);
        },
        valid: (player, _type, _fuse) => {
          return !this.board.isAttendWar(player) && this.board.inCampaign;
        },
      },
      // JNT0502 - Disable target's pet effect
      {
        code: 'JNT0502',
        action: (player, _type, _fuse, argst) => {
          const tar = parseInt(argst, 10);
          this.raiseGMessage(`G0HI,${tar},0`);
        },
        valid: (player, _type, _fuse) => {
          return [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.oppTeam && p.getPetCount() > 0,
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const enemies = [...this.board.garden.values()].filter(
              p => p.isAlive && p.team === player.oppTeam && p.getPetCount() > 0,
            );
            return `/T1(p${enemies.map(p => p.uid).join('p')})`;
          }
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR006 - OuyangQian (欧阳倩)
  // ═══════════════════════════════════════════════

  private registerTR006(): EffectRegistration[] {
    return [
      // JNT0601 - Sacrifice card type, self-damage, buff ally
      {
        code: 'JNT0601',
        action: (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          this.harm(null, player, 1);
          if (player.isAlive) {
            const ally = this.board.supporter?.team === player.team
              ? this.board.supporter : this.board.hinder;
            if (ally && ally.team === player.team) {
              this.raiseGMessage(`G0IX,${ally.uid},0,1`);
            }
          }
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0 && (
            (this.board.supporter && this.board.supporter.team === this.board.rounder.team) ||
            (this.board.hinder && this.board.hinder.team === this.board.rounder.oppTeam)
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          return '';
        },
      },
      // JNT0602 - Amplify team draw/discard
      {
        code: 'JNT0602',
        action: (player, type, fuse, _argst) => {
          if (type === 0) {
            // Amplify ally draws by +1
            this.innerGMessage(fuse, 100);
          } else if (type === 1) {
            // Force extra discard from allies
            const allies = [...this.board.garden.values()].filter(
              p => p.isAlive && p.team === player.team && p.tux.length > 0,
            );
            for (const a of allies) {
              this.raiseGMessage(`G0DS,${a.uid},0,1`);
            }
          }
        },
        valid: (player, type, fuse) => {
          if (type === 0) return fuse.includes('G0DH');
          if (type === 1) return fuse.includes('G0DS');
          return false;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR007 - LiYiru (李忆如)
  // ═══════════════════════════════════════════════

  private registerTR007(): EffectRegistration[] {
    return [
      // JNT0701 - Use teammate's tux cards
      {
        code: 'JNT0701',
        action: (player, _type, _fuse, argst) => {
          this.raiseGMessage(`G0IP,${player.team},1`);
        },
        valid: (player, _type, _fuse) => {
          return [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.team && p.uid !== player.uid && p.tux.length > 0,
          );
        },
      },
      // JNT0702 - Guardian spirit system: track spirit count, draw based on it
      {
        code: 'JNT0702',
        action: (player, _type, _fuse, _argst) => {
          const spiritCount = player.ram.getInt('GuardianSpirit') + 1;
          player.ram.set('GuardianSpirit', spiritCount);
          const drawCount = Math.min(spiritCount, 3);
          this.raiseGMessage(`G0DH,${player.uid},0,${drawCount}`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR008 - XiahouJinxuan (夏侯瑾轩)
  // ═══════════════════════════════════════════════

  private registerTR008(): EffectRegistration[] {
    return [
      // JNT0801 - Coaching: make teammate the lead attacker
      {
        code: 'JNT0801',
        action: (player, _type, _fuse, argst) => {
          const tar = parseInt(argst, 10);
          this.raiseGMessage(`G0IB,${tar},2`);
        },
        valid: (player, _type, _fuse) => {
          return [...this.board.garden.values()].some(
            p => p.isAlive && p.team === player.team && p.uid !== player.uid && p.isTared,
          );
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') {
            const allies = [...this.board.garden.values()].filter(
              p => p.isAlive && p.team === player.team && p.uid !== player.uid && p.isTared,
            );
            return `/T1(p${allies.map(p => p.uid).join('p')})`;
          }
          return '';
        },
      },
      // JNT0802 - Discard tux to grant rune
      {
        code: 'JNT0802',
        action: (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          this.raiseGMessage(`G0IF,3`);
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          return '';
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR009 - Xia (瑕)
  // ═══════════════════════════════════════════════

  private registerTR009(): EffectRegistration[] {
    return [
      // JNT0901 - On ally draw, swap 1 card with that ally
      {
        code: 'JNT0901',
        action: (player, _type, fuse, _argst) => {
          const parts = fuse.split(',');
          const who = parseInt(parts[1], 10);
          const py = this.board.garden.get(who);
          if (py && py.tux.length > 0 && player.tux.length > 0) {
            const myIdx = Math.floor(Math.random() * player.tux.length);
            const theirIdx = Math.floor(Math.random() * py.tux.length);
            const myCard = player.tux[myIdx];
            const theirCard = py.tux[theirIdx];
            player.tux[myIdx] = theirCard;
            py.tux[theirIdx] = myCard;
          }
        },
        valid: (player, _type, fuse) => {
          return fuse.includes('G0DH');
        },
      },
      // JNT0902 - On battle entry, ally draws 2
      {
        code: 'JNT0902',
        action: (player, _type, _fuse, _argst) => {
          const allies = [...this.board.garden.values()].filter(
            p => p.isAlive && p.team === player.team && p.uid !== player.uid,
          );
          for (const a of allies) {
            this.raiseGMessage(`G0DH,${a.uid},0,2`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player);
        },
      },
      // JNT0903 - Survival: roll dice to cancel lethal damage
      {
        code: 'JNT0903',
        action: (player, _type, _fuse, _argst) => {
          const dice = Math.floor(Math.random() * 6) + 1;
          if (dice < 5) {
            // Cancel the harm
            this.innerGMessage('', -100);
          }
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return harms.some(h => h.who === player.uid && h.n >= player.hp);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR010 - MuChanglan (暮菖兰)
  // ═══════════════════════════════════════════════

  private registerTR010(): EffectRegistration[] {
    return [
      // JNT1001 - Gain/lose STR when enemies equip/unequip weapons
      {
        code: 'JNT1001',
        action: (player, type, _fuse, _argst) => {
          if (type === 0) this.raiseGMessage(`G0IA,${player.uid},0,1`);
          else this.raiseGMessage(`G0OA,${player.uid},0,1`);
        },
        valid: (player, type, fuse) => {
          return fuse.includes('G0QZ') || fuse.includes('G0ZI');
        },
      },
      // JNT1002 - Free strike when enemy attacks someone else
      {
        code: 'JNT1002',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IP,${player.team},1`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.inCampaign && !this.board.isAttendWar(player);
        },
      },
      // JNT1003 - On battle loss, steal 1 card from opponent
      {
        code: 'JNT1003',
        action: (player, _type, _fuse, _argst) => {
          const opp = this.board.hinder;
          if (opp && opp.tux.length > 0) {
            const ut = opp.tux[0];
            this.raiseGMessage(`G0HQ,2,${player.uid},${opp.uid},0,0,${ut}`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && !this.board.isAttendWarSucc(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR011 - JiangCheng (姜承)
  // ═══════════════════════════════════════════════

  private registerTR011(): EffectRegistration[] {
    return [
      // JNT1101 - Take +1 harm in place of teammate
      {
        code: 'JNT1101',
        action: (player, _type, _fuse, argst) => {
          const tar = parseInt(argst, 10);
          this.targetPlayer(player.uid, tar);
          this.raiseGMessage(`G0TT,${player.uid}`);
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return harms.some(h => {
            const py = this.board.garden.get(h.who);
            return py !== undefined && py.team === player.team && h.who !== player.uid && h.n > 0 &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.TERMIN_AT) &&
              !FiveElementHelper.isSet(h.mask, HPEvoMask.DECR_INVAO);
          });
        },
        input: (player, _type, fuse, prev) => {
          if (prev === '') {
            const harms = this.parseHarmFuse(fuse);
            const targets = [...new Set(harms.filter(h => {
              const py = this.board.garden.get(h.who);
              return py !== undefined && py.team === player.team && h.who !== player.uid && h.n > 0;
            }).map(h => h.who))];
            return `/T1(p${targets.join('p')})`;
          }
          return '';
        },
      },
      // JNT1102 - +2 STR as supporter
      {
        code: 'JNT1102',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},0,2`);
        },
        valid: (player, _type, _fuse) => {
          return this.board.supporter?.uid === player.uid;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR012 - HuangfuZhuo (皇甫卓)
  // ═══════════════════════════════════════════════

  private registerTR012(): EffectRegistration[] {
    return [
      // JNT1201 - Discard card, teammate draws from monster pile
      {
        code: 'JNT1201',
        action: (player, _type, _fuse, argst) => {
          const ut = parseInt(argst, 10);
          this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          if (this.board.monPiles.count > 0) {
            this.board.monPiles.dequeue();
            this.raiseGMessage('G2IN,1,1');
          }
          player.ram.set('watched', player.ram.getInt('watched') + 1);
          if (this.board.poolEnabled) {
            this.raiseGMessage(`G0IX,${player.uid},0,1`);
          }
        },
        valid: (player, _type, _fuse) => {
          return player.tux.length > 0 && this.board.monPiles.count > 0;
        },
        input: (player, _type, _fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          return '';
        },
      },
      // JNT1202 - +3 STR when no supporter
      {
        code: 'JNT1202',
        action: (player, _type, _fuse, _argst) => {
          this.raiseGMessage(`G0IA,${player.uid},0,3`);
        },
        valid: (player, _type, _fuse) => {
          return !this.board.supporter || !this.board.supportSucc;
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR013 - XieCangxing (谢沧行)
  // ═══════════════════════════════════════════════

  private registerTR013(): EffectRegistration[] {
    return [
      // JNT1301 - Self-damage to gain STR while unarmed
      {
        code: 'JNT1301',
        action: (player, _type, _fuse, _argst) => {
          this.harm(null, player, 1);
          if (player.isAlive) {
            this.raiseGMessage(`G0IA,${player.uid},0,1`);
          }
        },
        valid: (player, _type, _fuse) => {
          return this.board.isAttendWar(player) && player.weapon === 0;
        },
      },
      // JNT1302 - Force opponent discard pets when HP < 5
      {
        code: 'JNT1302',
        action: (player, _type, _fuse, _argst) => {
          const opp = this.board.hinder;
          if (opp && opp.getPetCount() > 0) {
            const petCount = Math.min(opp.getPetCount(), player.hp * 2);
            for (let i = 0; i < petCount && opp.pets.length > 0; i++) {
              const pet = opp.pets[0];
              this.raiseGMessage(`G0HI,${opp.uid},${pet}`);
            }
          }
        },
        valid: (player, _type, _fuse) => {
          return player.hp < 5 && player.hp > 0 && this.board.isAttendWar(player);
        },
      },
    ];
  }

  // ═══════════════════════════════════════════════
  // TR014 - Jieluo (结萝)
  // ═══════════════════════════════════════════════

  private registerTR014(): EffectRegistration[] {
    return [
      // JNT1401 - Negate WORM-type lethal damage
      {
        code: 'JNT1401',
        action: (player, _type, fuse, _argst) => {
          // Cancel the harm
          this.innerGMessage('', -100);
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return player.hp >= 2 &&
            harms.some(h => h.who === player.uid && h.n >= player.hp &&
              FiveElementHelper.isSet(h.mask, HPEvoMask.RSV_WORM));
        },
      },
      // JNT1402 - Split damage to male player
      {
        code: 'JNT1402',
        action: (player, _type, _fuse, argst) => {
          const parts = argst.split(',');
          const ut = parseInt(parts[0], 10);
          const tar = parseInt(parts[1], 10);
          this.raiseGMessage(`G0QZ,${player.uid},${ut}`);
          this.raiseGMessage(`G0TT,${tar}`);
        },
        valid: (player, _type, fuse) => {
          const harms = this.parseHarmFuse(fuse);
          return player.tux.length > 0 && harms.some(h => h.who === player.uid && h.n > 0);
        },
        input: (player, _type, fuse, prev) => {
          if (prev === '') return `/Q1(p${player.tux.join('p')})`;
          if (!prev.includes(',')) {
            const males = [...this.board.garden.values()].filter(
              p => p.isAlive && p.gender === 'M' && p.uid !== player.uid,
            );
            return `/T1(p${males.map(p => p.uid).join('p')})`;
          }
          return '';
        },
      },
    ];
  }

  // ─── Helper methods for harm parsing ───

  private parseHarmFuse(fuse: string): Array<{ who: number; element: FiveElement; n: number; mask: number }> {
    const results: Array<{ who: number; element: FiveElement; n: number; mask: number }> = [];
    const parts = fuse.split(';');
    for (const part of parts) {
      if (part === '') continue;
      const pParts = part.split(',');
      if (pParts.length >= 4) {
        results.push({
          who: parseInt(pParts[0], 10),
          element: FiveElementHelper.int2Elem(parseInt(pParts[2], 10) || 0),
          n: parseInt(pParts[3], 10) || 0,
          mask: parseInt(pParts[4], 10) || 0,
        });
      }
    }
    return results;
  }

  private harmsToMessage(harms: Array<{ who: number; n: number; mask: number }>): string {
    return harms.map(h => `${h.who},0,0,${h.n},${h.mask}`).join(';');
  }
}
