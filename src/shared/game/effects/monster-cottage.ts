/**
 * MonsterCottage - Monster battle effects (debut, curtain, win/lose, consume)
 * Translation of C# PSD.PSDGamepkg.JNS.FG04 (MonsterCottage)
 *
 * Unlike other cottages, MonsterCottage wires delegate methods directly
 * onto Monster objects rather than returning EffectRegistration arrays.
 *
 * Base 20 monsters: GS01-GS04 (Aqua), GH01-GH04 (Agni),
 * GL01-GL04 (Thunder), GF01-GF04 (Aero), GT01-GT04 (Saturn)
 */
import { JNSBase } from './base';
import { Player } from '../player';
import { Board } from '../board';
import type { LibGroup } from '../lib-group';
import type { Monster } from '../card/monster';
import { TuxEquip } from '../card/tux-equip';
import type { MonsterLib } from '../lib/monster-lib';

export class MonsterCottage extends JNSBase {
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
   * Register delegate methods on all monsters in the library.
   * Matches C# MonsterCottage.RegisterDelegates(MonsterLib lib)
   */
  registerDelegates(monsterLib: MonsterLib): void {
    const allMonsters = monsterLib.listAllMonster(0);
    for (const mon of allMonsters) {
      this.wireMonsterDelegates(mon);
    }
  }

  private wireMonsterDelegates(mon: Monster): void {
    const handler = this.monsterHandlers[mon.code];
    if (handler) {
      if (handler.debut) mon.debut = () => handler.debut!(this);
      if (handler.curtain) mon.curtain = () => handler.curtain!(this);
      if (handler.winEff) mon.winEff = () => handler.winEff!(this);
      if (handler.loseEff) mon.loseEff = () => handler.loseEff!(this);
      if (handler.incrAction) mon.incrAction = (p) => handler.incrAction!(this, p);
      if (handler.decrAction) mon.decrAction = (p) => handler.decrAction!(this, p);
      if (handler.consumeAction) mon.consumeAction = (p, ct, t, f, a) => handler.consumeAction!(this, p, ct, t, f, a);
      if (handler.consumeValid) mon.consumeValid = (p, ct, t, f) => handler.consumeValid!(this, p, ct, t, f);
      if (handler.consumeInput) mon.consumeInput = (p, ct, t, f, prev) => handler.consumeInput!(this, p, ct, t, f, prev);
    }
  }

  // ─── Monster handler definitions ───

  private readonly monsterHandlers: Record<string, {
    debut?: (c: MonsterCottage) => void;
    curtain?: (c: MonsterCottage) => void;
    winEff?: (c: MonsterCottage) => void;
    loseEff?: (c: MonsterCottage) => void;
    incrAction?: (c: MonsterCottage, player: Player) => void;
    decrAction?: (c: MonsterCottage, player: Player) => void;
    consumeAction?: (c: MonsterCottage, player: Player, consumeType: number, type: number, fuse: string, argst: string) => void;
    consumeValid?: (c: MonsterCottage, player: Player, consumeType: number, type: number, fuse: string) => boolean;
    consumeInput?: (c: MonsterCottage, player: Player, consumeType: number, type: number, fuse: string, prev: string) => string;
  }> = {

    // ═══════════════════════════════════════════
    // GS - Aqua Element (千杯不醉, 勇气, 蛇妖男, 水魔兽)
    // ═══════════════════════════════════════════

    GS01: {
      // Debut: Swap hand cards between rounder and hinder
      debut(c) {
        const rd = c.board.rounder;
        const hd = c.board.hinder;
        if (hd.isAlive) {
          c.raiseGMessage(
            `G0HQ,4,${rd.uid},${hd.uid},${rd.tux.length},${hd.tux.length}` +
            (rd.tux.length > 0 ? ',' + rd.tux.join(',') : '') +
            (hd.tux.length > 0 ? ',' + hd.tux.join(',') : ''),
          );
        }
      },
      // LoseEff: Rounder discards 1 card
      loseEff(c) {
        c.raiseGMessage(`G0DS,${c.board.rounder.uid},0,1`);
      },
      // IncrAction: +1 STR
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      // DecrAction: -1 STR
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GS02: {
      // WinEff: Harm all opponents 1, then rounder chooses one to take extra 2
      winEff(c) {
        const rd = c.board.rounder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.harmMultiple(null, opps, 1);
        if (opps.length > 0) {
          const opts = opps.map(p => p.uid).join('p');
          c.asyncInput(rd.uid, `#额外HP-2,T1(p${opts})`, 'GS02WinEff', '0').then(input => {
            const who = parseInt(input) || 0;
            const target = c.board.garden.get(who);
            if (target) c.harm(null, target, 2);
          });
        }
      },
      // LoseEff: Rounder takes 2 damage, discard 1 equip if any
      loseEff(c) {
        const rd = c.board.rounder;
        c.harm(null, rd, 2);
        if (rd.getEquipCount() > 0) {
          const equips = rd.listOutAllEquips();
          c.asyncInput(rd.uid, `#须弃置的,Q1(p${equips.join('p')})`, 'GS02LoseEff', '0').then(input => {
            const which = parseInt(input) || 0;
            if (which > 0) c.raiseGMessage(`G0QZ,${rd.uid},${which}`);
          });
        }
      },
      // ConsumeAction: When consumed, boost STR to 8
      consumeAction(c, player, consumeType) {
        if (consumeType === 0) {
          const gs02 = c.libGroup.ml.encode('GS02');
          if (gs02 !== 0) {
            const monster = c.libGroup.ml.decode(gs02);
            if (monster) {
              const delta = 8 - monster.strb;
              if (delta > 0) c.raiseGMessage(`G0IB,${gs02},${delta}`);
            }
          }
        }
      },
    },

    GS03: {
      // WinEff: Harm hinder for 4
      winEff(c) {
        const hd = c.board.hinder;
        if (hd.isAlive && hd.uid !== 0) {
          c.harm(null, hd, 4);
        }
      },
      // LoseEff: Harm rounder for 4
      loseEff(c) {
        c.harm(null, c.board.rounder, 4);
      },
    },

    GS04: {
      // WinEff: Harm all opponents 1, then rounder steals 1 card from hinder
      winEff(c) {
        const rd = c.board.rounder;
        const hd = c.board.hinder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.harmMultiple(null, opps, 1);
        if (hd.isAlive && hd.uid !== 0 && hd.hasAnyCards()) {
          const cards = hd.listOutAllCardsWithEncrypt();
          c.asyncInput(rd.uid, `#获得对手的,C1(p${cards.join('p')})`, 'GS04WinEff', '0').then(input => {
            const card = parseInt(input) || 0;
            if (card === 0) {
              c.raiseGMessage(`G0HQ,0,${rd.uid},${hd.uid},2,1`);
            } else {
              c.raiseGMessage(`G0HQ,0,${rd.uid},${hd.uid},0,1,${card}`);
            }
          });
        }
      },
      // LoseEff: Rounder takes 2 damage, hinder steals 1 card from rounder
      loseEff(c) {
        const rd = c.board.rounder;
        const hd = c.board.hinder;
        c.harm(null, rd, 2);
        if (hd.isAlive && hd.uid !== 0 && rd.uid !== 0 && rd.hasAnyCards()) {
          const cards = rd.listOutAllCardsWithEncrypt();
          c.asyncInput(hd.uid, `#获得对手的,C1(p${cards.join('p')})`, 'GS04LoseEff', '0').then(input => {
            const card = parseInt(input) || 0;
            if (card === 0) {
              c.raiseGMessage(`G0HQ,0,${hd.uid},${rd.uid},2,1`);
            } else {
              c.raiseGMessage(`G0HQ,0,${hd.uid},${rd.uid},0,1,${card}`);
            }
          });
        }
      },
      // IncrAction: +1 STR and +1 DEX
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
        c.raiseGMessage(`G0IX,${player.uid},0,1`);
      },
      // DecrAction: -1 STR and -1 DEX
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
        c.raiseGMessage(`G0OX,${player.uid},0,1`);
      },
    },

    // ═══════════════════════════════════════════
    // GH - Agni Element (赝月, 肥肥, 狐妖女, 熔岩兽王)
    // ═══════════════════════════════════════════

    GH01: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const hd = c.board.hinder;
        if (hd.isAlive && hd.uid !== 0) c.harm(null, hd, 2);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GH02: {
      // WinEff: Harm hinder for 3
      winEff(c) {
        const hd = c.board.hinder;
        if (hd.isAlive && hd.uid !== 0) c.harm(null, hd, 3);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
      // ConsumeAction: When consumed, team draws 3 cards
      consumeAction(c, player, consumeType) {
        if (consumeType === 1) {
          c.raiseGMessage(`G0IP,${player.team},3`);
        }
      },
    },

    GH03: {
      // Debut: Harm supporter for (rounder STR - 1)
      debut(c) {
        const rd = c.board.rounder;
        const sd = c.board.supporter;
        if (sd.isAlive && sd.uid !== 0) {
          const n = rd.str - 1;
          if (n > 0) c.harm(null, sd, n);
        }
      },
      // WinEff: Harm hinder for 3
      winEff(c) {
        const hd = c.board.hinder;
        if (hd.isAlive && hd.uid !== 0) c.harm(null, hd, 3);
      },
      // LoseEff: Opponent chooses 2 teammates to take 3 fire damage each
      loseEff(c) {
        const op = c.board.opponent;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === c.board.rounder.team);
        if (teammates.length >= 2) {
          const opts = teammates.map(p => p.uid).join('p');
          c.asyncInput(op.uid, `#受到3点火属性伤害,T2(p${opts})`, 'GH03LoseEff', '0').then(input => {
            const idx = input.indexOf(',');
            if (idx > 0 && input !== '/') {
              const p1 = parseInt(input.substring(0, idx)) || 0;
              const p2 = parseInt(input.substring(idx + 1)) || 0;
              const t1 = c.board.garden.get(p1);
              const t2 = c.board.garden.get(p2);
              if (t1 && t2) {
                c.targetPlayers(op.uid, [p1, p2]);
                c.harmMultiple(null, [t1, t2], 3);
              }
            }
          });
        } else if (teammates.length === 1) {
          const opts = teammates.map(p => p.uid).join('p');
          c.asyncInput(op.uid, `#受到3点火属性伤害,T1(p${opts})`, 'GH03LoseEff', '0').then(input => {
            if (input !== '/') {
              const p1 = parseInt(input) || 0;
              const t1 = c.board.garden.get(p1);
              if (t1) {
                c.targetPlayer(op.uid, p1);
                c.harm(null, t1, 3);
              }
            }
          });
        }
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,2`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,2`);
      },
    },

    GH04: {
      // Debut: Harm all alive players for 2
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        c.harmMultiple(null, all, 2);
      },
      // WinEff: Harm all opponents for 2
      winEff(c) {
        const rd = c.board.rounder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.harmMultiple(null, opps, 2);
      },
      // LoseEff: Harm rounder (+ supporter if valid) for 2
      loseEff(c) {
        const rd = c.board.rounder;
        const sd = c.board.supporter;
        if (sd.isAlive && sd.uid !== 0) {
          c.harmMultiple(null, [rd, sd], 2);
        } else {
          c.harm(null, rd, 2);
        }
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,2`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,2`);
      },
    },

    // ═══════════════════════════════════════════
    // GL - Thunder Element (积粮隐者, 赤鬼王, 毒娘子, 邪剑仙)
    // ═══════════════════════════════════════════

    GL01: {
      // WinEff: Rounder chooses a player to heal 2
      winEff(c) {
        const rd = c.board.rounder;
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        const opts = all.map(p => p.uid).join('p');
        c.asyncInput(rd.uid, `#HP+2,T1(p${opts})`, 'GL01WinEff', '0').then(input => {
          const who = parseInt(input) || 0;
          const target = c.board.garden.get(who);
          if (target) c.cure(null, target, 2);
        });
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
    },

    GL02: {
      // Debut: Supporter gets +1 STR, +2 DEX
      debut(c) {
        const sd = c.board.supporter;
        if (sd.isAlive && sd.uid !== 0) {
          c.raiseGMessage(`G0IA,${sd.uid},1,2`);
        }
      },
      // WinEff: Rounder chooses a player to draw 2 cards
      winEff(c) {
        const rd = c.board.rounder;
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        const opts = all.map(p => p.uid).join('p');
        c.asyncInput(rd.uid, `#获得2张牌,T1(p${opts})`, 'GL02WinEff', '0').then(input => {
          const who = parseInt(input) || 0;
          c.raiseGMessage(`G0DH,${who},0,2`);
        });
      },
      // LoseEff: Rounder takes 2 damage, discard all equips then redraw
      loseEff(c) {
        const rd = c.board.rounder;
        c.harm(null, rd, 2);
        const loses = rd.listOutAllEquips();
        if (loses.length > 0) {
          const count = loses.length;
          c.raiseGMessage(`G0QZ,${rd.uid},${loses.join(',')}`);
          c.raiseGMessage(`G0DH,${rd.uid},0,${count}`);
        }
      },
      // ConsumeAction: Boost heal amount by 1
      consumeAction(c, player, consumeType, _type, fuse) {
        if (consumeType === 0) {
          const g0ht = fuse.split(',');
          for (let i = 1; i < g0ht.length; i += 2) {
            const ut = parseInt(g0ht[i]) || 0;
            const n = parseInt(g0ht[i + 1]) || 0;
            if (ut === player.uid && n > 0) {
              g0ht[i + 1] = (n + 1).toString();
            }
          }
          c.innerGMessage(g0ht.join(','), 51);
        }
      },
      // ConsumeValid: Check if player has heal in fuse
      consumeValid(c, player, consumeType, _type, fuse) {
        if (consumeType === 0) {
          const g0ht = fuse.split(',');
          for (let i = 1; i < g0ht.length; i += 2) {
            const ut = parseInt(g0ht[i]) || 0;
            const n = parseInt(g0ht[i + 1]) || 0;
            if (ut === player.uid && n > 0) return true;
          }
        }
        return false;
      },
    },

    GL03: {
      // WinEff: Rounder discards cards, each gives HP+2
      winEff(c) {
        const rd = c.board.rounder;
        const txCount = rd.listOutAllCards().length;
        if (txCount === 1) {
          const cards = rd.listOutAllCards();
          c.asyncInput(rd.uid, `#弃置以获得每张HP+2效果,/Q1(p${cards.join('p')})`, 'GL03WinEff', '0').then(input => {
            if (input && input !== '0' && !input.startsWith('/')) {
              c.raiseGMessage(`G0QZ,${rd.uid},${input}`);
              c.cure(null, rd, 2);
            }
          });
        } else if (txCount > 1) {
          const cards = rd.listOutAllCards();
          c.asyncInput(rd.uid, `#弃置以获得每张HP+2效果,/Q1~${txCount}(p${cards.join('p')})`, 'GL03WinEff', '0').then(input => {
            if (input && input !== '0' && !input.startsWith('/')) {
              const discarded = input.split(',');
              c.raiseGMessage(`G0QZ,${rd.uid},${input}`);
              c.cure(null, rd, 2 * discarded.length);
            }
          });
        }
      },
      // LoseEff: Discard all equips, then all players with max equips discard
      loseEff(c) {
        const rd = c.board.rounder;
        const loses = rd.listOutAllEquips();
        if (loses.length > 0) {
          c.asyncInput(rd.uid, `#须弃置,Q1(p${loses.join('p')})`, 'GL03LoseEff', '0').then(input => {
            c.raiseGMessage(`G0QZ,${rd.uid},${input}`);
          });
        }
        const maxEquip = Math.max(...[...c.board.garden.values()].map(p => p.getEquipCount()));
        if (maxEquip > 0) {
          const kaos = [...c.board.garden.values()].filter(p => p.getEquipCount() === maxEquip);
          for (const py of kaos) {
            const equips = py.listOutAllEquips();
            c.asyncInput(py.uid, `#须弃置,Q1(p${equips.join('p')})`, 'GL03LoseEff', '0').then(input => {
              c.raiseGMessage(`G0QZ,${py.uid},${input}`);
            });
          }
        }
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IX,${player.uid},0,2`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OX,${player.uid},0,2`);
      },
    },

    GL04: {
      // WinEff: Draw cards equal to equipment count for teammates with equips
      winEff(c) {
        const rd = c.board.rounder;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team && p.getEquipCount() > 0);
        if (teammates.length > 0) {
          const parts = teammates.map(p => `${p.uid},0,${p.getEquipCount()}`).join(',');
          c.raiseGMessage(`G0DH,${parts}`);
        }
      },
      // LoseEff: Harm all teammates for 2
      loseEff(c) {
        const rd = c.board.rounder;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team);
        c.harmMultiple(null, teammates, 2);
      },
      // IncrAction: Disable enemy weapons
      incrAction(c, player) {
        const enemies = [...c.board.garden.values()].filter(p => p.isAlive && p.team === player.oppTeam);
        for (const py of enemies) {
          c.raiseGMessage(`G2QZ,${py.uid},${py.weapon},1`);
        }
      },
      // DecrAction: Re-enable enemy weapons
      decrAction(c, player) {
        const enemies = [...c.board.garden.values()].filter(p => p.isAlive && p.team === player.oppTeam);
        for (const py of enemies) {
          c.raiseGMessage(`G2QZ,${py.uid},${py.weapon},0`);
        }
      },
      // ConsumeAction: Disable weapons of opponents in fuse
      consumeAction(c, player, consumeType, _type, fuse) {
        if (consumeType === 0) {
          const blocks = fuse.split(',');
          for (let i = 1; i < blocks.length;) {
            const gtype = parseInt(blocks[i]) || 0;
            const ut = parseInt(blocks[i + 1]) || 0;
            const py = c.board.garden.get(ut);
            if (py && py.team === player.oppTeam) {
              c.raiseGMessage(`G2QZ,${ut},${py.weapon},1`);
            }
            if (gtype === 0 || gtype === 1) i += 3;
            else if (gtype === 2) i += 4;
            else break;
          }
        }
      },
      // ConsumeValid: Check if opponent is in fuse
      consumeValid(c, player, consumeType, _type, fuse) {
        if (consumeType === 0) {
          const blocks = fuse.split(',');
          for (let i = 1; i < blocks.length;) {
            const gtype = parseInt(blocks[i]) || 0;
            const ut = parseInt(blocks[i + 1]) || 0;
            const py = c.board.garden.get(ut);
            if (py && py.team === player.oppTeam) return true;
            if (gtype === 0 || gtype === 1) i += 3;
            else if (gtype === 2) i += 4;
          }
        }
        return false;
      },
    },

    // ═══════════════════════════════════════════
    // GF - Aero Element (叶灵, 暗香, 句芒, 彩依)
    // ═══════════════════════════════════════════

    GF01: {
      // WinEff: Rounder draws 1 card
      winEff(c) {
        c.raiseGMessage(`G0DH,${c.board.rounder.uid},0,1`);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GF02: {
      // WinEff: Heal rounder for 2
      winEff(c) {
        c.cure(null, c.board.rounder, 2);
      },
      // LoseEff: Heal all alive opponents for 2
      loseEff(c) {
        const rd = c.board.rounder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.cureMultiple(null, opps, 2);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GF03: {
      // WinEff: Heal rounder + supporter for 2 (or just rounder if no supporter)
      winEff(c) {
        const rd = c.board.rounder;
        const sd = c.board.supporter;
        if (sd.isAlive && sd.uid !== 0) {
          c.cureMultiple(null, [rd, sd], 2);
        } else {
          c.cure(null, rd, 2);
        }
      },
      // LoseEff: Reshuffle hand cards for teammates with cards, then harm all teammates for 2
      loseEff(c) {
        const rd = c.board.rounder;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.tux.length > 0 && p.team === rd.team);
        if (teammates.length > 0) {
          c.raiseGMessage(`G1XR,1,0,0,${teammates.map(p => p.uid).join(',')}`);
        }
        const allTeammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team);
        c.harmMultiple(null, allTeammates, 2);
      },
      // ConsumeAction: Reshuffle hand cards for teammates
      consumeAction(c, player, consumeType) {
        if (consumeType === 1) {
          const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.tux.length > 0 && p.team === player.team);
          if (teammates.length > 0) {
            c.raiseGMessage(`G1XR,1,0,0,${teammates.map(p => p.uid).join(',')}`);
          }
        }
      },
      // ConsumeValid: Check if teammate has cards
      consumeValid(c, player, consumeType, type) {
        if (consumeType === 1) {
          const rd = c.board.rounder;
          const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team && p.tux.length > 0);
          if (type === 0) {
            return teammates.length > 0 && player.team === rd.team;
          } else if (type === 1) {
            return teammates.length > 0;
          }
        }
        return false;
      },
    },

    GF04: {
      // WinEff: Opponent chooses a teammate to heal 2
      winEff(c) {
        const op = c.board.opponent;
        const oppTeammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === op.team);
        const opts = oppTeammates.map(p => p.uid).join('p');
        c.asyncInput(op.uid, `#HP+2,T1(p${opts})`, 'GF04WinEff', '0').then(input => {
          const who = parseInt(input) || 0;
          const target = c.board.garden.get(who);
          if (target) c.cure(null, target, 2);
        });
      },
      // ConsumeValid: Check if any alive player has 0 HP
      consumeValid(c, _player, consumeType) {
        if (consumeType === 1) {
          return [...c.board.garden.values()].some(p => p.isAlive && p.hp === 0);
        }
        return false;
      },
      // ConsumeAction: Revive a 0-HP player to full HP
      consumeAction(c, player, consumeType) {
        if (consumeType === 1) {
          const zeros = [...c.board.garden.values()].filter(p => p.isAlive && p.hp === 0);
          const opts = zeros.length > 0 ? zeros.map(p => p.uid).join('p') : '/';
          c.asyncInput(player.uid, `#复活,T1(p${opts})`, 'GF04', '1').then(input => {
            const tg = parseInt(input) || 0;
            const target = c.board.garden.get(tg);
            if (target && zeros.some(p => p.uid === tg)) {
              c.cure(null, target, target.hpBase - target.hp);
            }
          });
        }
      },
    },

    // ═══════════════════════════════════════════
    // GT - Saturn Element (璇龟, 刑天, 金蟾鬼母, 天鬼皇)
    // ═══════════════════════════════════════════

    GT01: {
      // WinEff: Harm rounder + supporter for 3
      winEff(c) {
        const rd = c.board.rounder;
        const sd = c.board.supporter;
        if (sd.isAlive && sd.uid !== 0) {
          c.harmMultiple(null, [rd, sd], 3);
        } else {
          c.harm(null, rd, 3);
        }
      },
      // LoseEff: Harm hinder for 3
      loseEff(c) {
        const hd = c.board.hinder;
        if (hd.isAlive && hd.uid !== 0) c.harm(null, hd, 3);
      },
    },

    GT02: {
      // Debut: Harm non-attending players for their hand card count
      debut(c) {
        const pys = [...c.board.garden.values()].filter(p => p.isAlive && !c.board.isAttendWar(p) && p.tux.length > 0);
        if (pys.length > 0) {
          c.harmVariable(null, pys, pys.map(p => p.tux.length));
        }
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IX,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OX,${player.uid},0,1`);
      },
    },

    GT03: {
      // Debut: Boost own STR by 3
      debut(c) {
        const x = c.libGroup.ml.encode('GT03');
        if (x !== 0) c.raiseGMessage(`G0IB,${x},3`);
      },
      // WinEff: Harm all opponents for 1
      winEff(c) {
        const rd = c.board.rounder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.harmMultiple(null, opps, 1);
      },
      // LoseEff: Harm all teammates for 2
      loseEff(c) {
        const rd = c.board.rounder;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team);
        c.harmMultiple(null, teammates, 2);
      },
      // DecrAction: Clear coaching signs
      decrAction(c, player) {
        const rk = 1000 + (c.libGroup.ml.encode('GT03') || 0);
        if (c.board.inCampaign) {
          if (c.board.supporter.uid === rk) {
            c.raiseGMessage(`G2CS,${c.board.supporter.uid},S,0`);
          } else if (c.board.hinder.uid === rk) {
            c.raiseGMessage(`G2CS,${c.board.hinder.uid},H,0`);
          }
        }
      },
      // ConsumeAction: Add to pos supporters/hinders
      consumeAction(c, player, consumeType) {
        if (consumeType === 0) {
          if (c.board.rounder.team === player.team) {
            c.board.posSupporters.push('PT19');
          } else {
            c.board.posHinders.push('PT19');
          }
        }
      },
    },

    GT04: {
      // LoseEff: Opponent can replace a pet with GT04
      loseEff(c) {
        const saturnElem = 4; // Saturn element index
        const op = c.board.opponent;
        const others = [...c.board.garden.values()].filter(
          p => p.team === c.board.rounder.oppTeam && p.pets[saturnElem] !== 0,
        );
        if (others.length > 0 && c.board.mon1From === 0) {
          const opts = others.map(p => p.pets[saturnElem]).join('p');
          c.asyncInput(op.uid, `#要替换的,/M1(p${opts})`, 'GT04LoseEff', '0').then(input => {
            if (input && input !== '/') {
              const mons = parseInt(input) || 0;
              const gt04code = c.libGroup.ml.encode('GT04');
              const py = others.find(p => p.pets[saturnElem] === mons);
              if (py && gt04code !== 0) {
                c.raiseGMessage(`G1HP,${py.uid},${gt04code},1,0`);
                if (c.board.monster1 === gt04code) {
                  c.board.monster1 = 0;
                } else if (c.board.monster2 === gt04code) {
                  c.board.monster2 = 0;
                }
              }
            }
          });
        }
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,2`);
        c.raiseGMessage(`G0IX,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,2`);
        c.raiseGMessage(`G0OX,${player.uid},0,1`);
      },
    },

    // ═══════════════════════════════════════════
    // Package 4# Expansion Monsters
    // ═══════════════════════════════════════════

    GST1: {
      // Debut: Supporter loses 4 DEX
      debut(c) {
        const sd = c.board.supporter;
        if (sd.isAlive && sd.uid !== 0 && sd.uid < 1000) {
          c.raiseGMessage(`G0OX,${sd.uid},1,4`);
        }
      },
      // WinEff: Hinder discards cards or gets filled+flipped
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) {
          const hls = h.listOutAllCards().length;
          if (hls >= 2) {
            const cards = h.listOutAllCards();
            c.asyncInput(h.uid, `#弃置(取消则补满牌后横置),/Q${hls}(p${cards.join('p')})`, 'GST1WinEff', '0').then(ts => {
              if (ts !== '/0') {
                c.raiseGMessage(`G0QZ,${h.uid},${ts}`);
              } else {
                if (h.tux.length < h.tuxLimit) {
                  c.raiseGMessage(`G0DH,${h.uid},0,${h.tuxLimit - h.tux.length}`);
                }
                c.raiseGMessage(`G0DS,${h.uid},0,1`);
              }
            });
          } else {
            if (h.tux.length < h.tuxLimit) {
              c.raiseGMessage(`G0DH,${h.uid},0,${h.tuxLimit - h.tux.length}`);
            }
            c.raiseGMessage(`G0DS,${h.uid},0,1`);
          }
        }
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IX,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OX,${player.uid},0,1`);
      },
    },

    GST2: {
      // WinEff: Harm hinder for (equipCount + 2), discard 1 equip
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) {
          c.harm(null, h, h.getEquipCount() + 2);
          if (h.getEquipCount() > 0) {
            const equips = h.listOutAllEquips();
            c.asyncInput(h.uid, `#弃置的,Q1(p${equips.join('p')})`, 'GST2WinEff', '0').then(input => {
              const ut = parseInt(input) || 0;
              if (ut > 0) c.raiseGMessage(`G0QZ,${h.uid},${ut}`);
            });
          }
        }
      },
      // LoseEff: Harm rounder for (equipCount + 2), discard 1 equip
      loseEff(c) {
        const r = c.board.rounder;
        c.harm(null, r, r.getEquipCount() + 2);
        if (r.getEquipCount() > 0) {
          const equips = r.listOutAllEquips();
          c.asyncInput(r.uid, `#弃置的,Q1(p${equips.join('p')})`, 'GST2LoseEff', '0').then(input => {
            const ut = parseInt(input) || 0;
            if (ut > 0) c.raiseGMessage(`G0QZ,${r.uid},${ut}`);
          });
        }
      },
      incrAction(c, player) {
        for (const ut of player.listOutAllEquips()) {
          const tux = c.libGroup.tl.decodeTux(ut);
          if (tux instanceof TuxEquip && tux.incrOfSTR > 0) {
            c.raiseGMessage(`G0IA,${player.uid},0,${tux.incrOfSTR}`);
          }
        }
      },
      decrAction(c, player) {
        for (const _ut of player.listOutAllEquips()) {
          c.raiseGMessage(`G0OA,${player.uid},0,1`);
        }
      },
    },

    GHT1: {
      // Debut: Boost STR based on team's Agni pets
      debut(c) {
        const x = c.libGroup.ml.encode('GHT1');
        if (x !== 0) {
          const agniIdx = 1; // Agni element index
          let inc = 0;
          for (const p of c.board.garden.values()) {
            if (p.isAlive && p.team === c.board.rounder.team) {
              const pet = p.pets[agniIdx];
              if (pet !== 0) {
                const mon = c.libGroup.ml.decode(pet);
                if (mon) inc += mon.str;
              }
            }
          }
          if (inc > 0) c.raiseGMessage(`G0IB,${x},${inc}`);
        }
      },
      // WinEff: Harm hinder for 2, check catchable
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
        const agniIdx = 1;
        const anyAgni = [...c.board.garden.values()].some(
          p => p.isAlive && p.team === c.board.rounder.team && p.pets[agniIdx] !== 0,
        );
        if (!anyAgni) {
          if (c.board.monster1 !== 0) {
            const m1 = c.libGroup.ml.decode(c.board.monster1);
            if (m1 && m1.code === 'GHT1') c.board.mon1Catchable = false;
          }
          if (c.board.monster2 !== 0) {
            const m2 = c.libGroup.ml.decode(c.board.monster2);
            if (m2 && m2.code === 'GHT1') c.board.mon2Catchable = false;
          }
        }
      },
      // LoseEff: Harm rounder + supporter for 2
      loseEff(c) {
        const r = c.board.rounder;
        const s = c.board.supporter;
        if (s.isAlive && s.uid !== 0) {
          c.harmMultiple(null, [r, s], 2);
        } else {
          c.harm(null, r, 2);
        }
      },
      // ConsumeAction: Team draws 3 cards, set bursted
      consumeAction(c, player, consumeType) {
        if (consumeType === 0) {
          const mon = c.libGroup.ml.decode(c.libGroup.ml.encode('GHT1'));
          if (mon) {
            mon.teamBursted = true;
            c.raiseGMessage(`G0IP,${player.team},3`);
          }
        }
      },
      // ConsumeValid: Check if not bursted
      consumeValid(c, _player, consumeType) {
        if (consumeType === 0) {
          const mon = c.libGroup.ml.decode(c.libGroup.ml.encode('GHT1'));
          return mon !== null && !mon.teamBursted;
        }
        return false;
      },
    },

    GHT2: {
      // WinEff: Harm all opponents for 3
      winEff(c) {
        const rd = c.board.rounder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.harmMultiple(null, opps, 3);
      },
      // LoseEff: Harm all teammates for 3
      loseEff(c) {
        const rd = c.board.rounder;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team);
        c.harmMultiple(null, teammates, 3);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
        c.raiseGMessage(`G0IX,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
        c.raiseGMessage(`G0OX,${player.uid},0,1`);
      },
    },

    GLT1: {
      // WinEff: Rounder discards 1 equip to let someone draw 2
      winEff(c) {
        const r = c.board.rounder;
        if (r.hasAnyEquips()) {
          const equips = r.listOutAllEquips();
          const alive = [...c.board.garden.values()].filter(p => p.isAlive);
          const opts = alive.map(p => p.uid).join('p');
          c.asyncInput(r.uid, `#弃置以令任意一人补2张牌的,/Q1(p${equips.join('p')}),#获得2张牌的,/T1(p${opts})`, 'GLT1WinEff', '0').then(ts => {
            if (ts && !ts.startsWith('/') && !ts.includes('/')) {
              const idx = ts.indexOf(',');
              if (idx > 0) {
                const tx = parseInt(ts.substring(0, idx)) || 0;
                const tp = parseInt(ts.substring(idx + 1)) || 0;
                if (tx > 0) c.raiseGMessage(`G0QZ,${r.uid},${tx}`);
                if (tp > 0) c.raiseGMessage(`G0DH,${tp},0,2`);
              }
            }
          });
        }
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GLT2: {
      // Debut: Disable all equipment for attenders
      debut(c) {
        const attenders = [...c.board.garden.values()].filter(p => p.isAlive && c.board.isAttendWar(p));
        for (const py of attenders) {
          c.raiseGMessage(`G2QZ,${py.uid},${py.weapon},1`);
          c.raiseGMessage(`G2QZ,${py.uid},${py.armor},1`);
          c.raiseGMessage(`G2QZ,${py.uid},${py.trove},1`);
        }
      },
      // Curtain: Re-enable all equipment
      curtain(c) {
        for (const py of c.board.garden.values()) {
          if (py.isAlive) {
            c.raiseGMessage(`G2QZ,${py.uid},${py.weapon},0`);
            c.raiseGMessage(`G2QZ,${py.uid},${py.armor},0`);
            c.raiseGMessage(`G2QZ,${py.uid},${py.trove},0`);
          }
        }
      },
      // WinEff: Opponent discards an equip
      winEff(c) {
        const opps = [...c.board.garden.values()].filter(
          p => p.isAlive && p.team === c.board.rounder.oppTeam && p.getEquipCount() > 0,
        );
        if (opps.length > 0) {
          const r = c.board.rounder;
          const opts = opps.map(p => p.uid).join('p');
          c.asyncInput(r.uid, `#弃置装备,/T1(p${opts})`, 'GLT2WinEff', '0').then(ts => {
            if (ts && ts !== '/0') {
              const who = parseInt(ts) || 0;
              const target = c.board.garden.get(who);
              if (target) {
                const equips = target.listOutAllEquips();
                c.asyncInput(r.uid, `#弃置,/C1(p${equips.join('p')})`, 'GLT2WinEff', '0').then(tu => {
                  if (tu && tu !== '/0') {
                    c.raiseGMessage(`G0QZ,${who},${tu}`);
                  }
                });
              }
            }
          });
        }
      },
      // LoseEff: Teammate discards an equip
      loseEff(c) {
        const op = c.board.opponent;
        const teammates = [...c.board.garden.values()].filter(
          p => p.isAlive && p.team === c.board.rounder.team && p.getEquipCount() > 0,
        );
        if (teammates.length > 0) {
          const opts = teammates.map(p => p.uid).join('p');
          c.asyncInput(op.uid, `#弃置装备的,/T1(p${opts})`, 'GLT2LoseEff', '0').then(ts => {
            if (ts && ts !== '/0') {
              const who = parseInt(ts) || 0;
              const target = c.board.garden.get(who);
              if (target) {
                const equips = target.listOutAllEquips();
                c.asyncInput(op.uid, `#弃置的,/C1(p${equips.join('p')})`, 'GLT2LoseEff', '0').then(tu => {
                  if (tu && tu !== '/0') {
                    c.raiseGMessage(`G0QZ,${who},${tu}`);
                  }
                });
              }
            }
          });
        }
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IX,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OX,${player.uid},0,1`);
      },
    },

    GFT1: {
      // Debut: Heal all alive players for 1
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        c.cureMultiple(null, all, 1);
      },
      // WinEff: Rounder chooses a player to heal 3
      winEff(c) {
        const r = c.board.rounder;
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        const opts = all.map(p => p.uid).join('p');
        c.asyncInput(r.uid, `#HP+3,T1(p${opts})`, 'GFT1WinEff', '0').then(input => {
          const who = parseInt(input) || 0;
          const target = c.board.garden.get(who);
          if (target) c.cure(null, target, 3);
        });
      },
      // LoseEff: Harm rounder + supporter for 2, draw to full
      loseEff(c) {
        const r = c.board.rounder;
        const s = c.board.supporter;
        if (s.isAlive && s.uid !== 0) {
          c.harmMultiple(null, [r, s], 2);
        } else {
          c.harm(null, r, 2);
        }
        const parts: string[] = [];
        if (s.isAlive && s.uid !== 0 && s.tux.length > 1) {
          parts.push(`${s.uid},1,${s.tux.length - 1}`);
        }
        if (r.tux.length > 1) {
          parts.push(`${r.uid},1,${r.tux.length - 1}`);
        }
        if (parts.length > 0) {
          c.raiseGMessage(`G0DH,${parts.join(',')}`);
        }
      },
      incrAction(c, player) {
        player.tuxLimit++;
      },
      decrAction(c, player) {
        player.tuxLimit--;
      },
    },

    GFT2: {
      // Debut: Each alive player with cards draws 1
      debut(c) {
        const result = [...c.board.garden.values()]
          .filter(p => p.isAlive && p.tux.length > 0)
          .map(p => `${p.uid},1,1`)
          .join(',');
        if (result) c.raiseGMessage(`G0DH,${result}`);
      },
      // WinEff: Heal all teammates for 2
      winEff(c) {
        const rd = c.board.rounder;
        const teammates = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.team);
        c.cureMultiple(null, teammates, 2);
      },
      // LoseEff: Heal all opponents for 1
      loseEff(c) {
        const rd = c.board.rounder;
        const opps = [...c.board.garden.values()].filter(p => p.isAlive && p.team === rd.oppTeam);
        c.cureMultiple(null, opps, 1);
      },
    },

    GTT1: {
      // WinEff: Rounder discards up to 2 cards
      winEff(c) {
        const r = c.board.rounder;
        const s = c.board.supporter;
        const rc = Math.min(r.listOutAllCards().length, 2);
        if (rc > 0) {
          const cards = r.listOutAllCards().slice(0, rc);
          c.asyncInput(r.uid, `#弃置的,Q${rc}(p${cards.join('p')})`, 'GTT1WinEff', '0').then(ts => {
            if (ts) c.raiseGMessage(`G0QZ,${r.uid},${ts}`);
          });
        }
        if (s.isAlive && s.uid !== 0) {
          const sc = Math.min(s.listOutAllCards().length, 2);
          if (sc > 0) {
            const cards = s.listOutAllCards().slice(0, sc);
            c.asyncInput(s.uid, `#弃置的,Q${sc}(p${cards.join('p')})`, 'GTT1WinEff', '0').then(ts => {
              if (ts) c.raiseGMessage(`G0QZ,${s.uid},${ts}`);
            });
          }
        }
      },
      // LoseEff: Hinder discards up to 2 cards
      loseEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) {
          const hc = Math.min(h.listOutAllCards().length, 2);
          if (hc > 0) {
            const cards = h.listOutAllCards().slice(0, hc);
            c.asyncInput(h.uid, `#弃置的,Q${hc}(p${cards.join('p')})`, 'GTT1LoseEff', '0').then(ts => {
              if (ts) c.raiseGMessage(`G0QZ,${h.uid},${ts}`);
            });
          }
        }
      },
      // ConsumeValid: Check if player has heal in fuse
      consumeValid(c, player, consumeType, _type, fuse) {
        if (consumeType === 0) {
          const g0ht = fuse.split(',');
          for (let i = 1; i < g0ht.length; i += 2) {
            const ut = parseInt(g0ht[i]) || 0;
            const n = parseInt(g0ht[i + 1]) || 0;
            if (ut === player.uid && n > 0) return true;
          }
        }
        return false;
      },
      // ConsumeAction: Reduce heal, steal 1 card from target
      consumeAction(c, player, consumeType, _type, fuse, argst) {
        if (consumeType === 0) {
          const g0ht = fuse.split(',');
          const ng0ht: string[] = [];
          for (let i = 1; i < g0ht.length; i += 2) {
            const ut = parseInt(g0ht[i]) || 0;
            const n = parseInt(g0ht[i + 1]) || 0;
            if (ut !== player.uid) ng0ht.push(`${ut},${n}`);
            else if (n > 1) ng0ht.push(`${player.uid},${n - 1}`);
          }
          if (ng0ht.length > 0) c.innerGMessage(`G0HT,${ng0ht.join(',')}`, 81);
          const from = parseInt(argst) || 0;
          if (from > 0) {
            c.targetPlayer(player.uid, from);
            c.raiseGMessage(`G0HQ,0,${player.uid},${from},2,1`);
          }
        }
      },
      // ConsumeInput: Ask which player to steal from
      consumeInput(c, player, consumeType, _type, _fuse, prev) {
        if (consumeType === 0 && prev === '') {
          const alive = [...c.board.garden.values()].filter(
            p => p.uid !== player.uid && p.isAlive && p.tux.length > 0,
          );
          if (alive.length > 0) {
            return `#获得手牌,/T1(p${alive.map(p => p.uid).join('p')})`;
          }
        }
        return '';
      },
    },

    GTT2: {
      // Debut: Harm all alive players for (HP+2)/3 each
      debut(c) {
        const invs = [...c.board.garden.values()].filter(p => p.isAlive);
        c.harmVariable(null, invs, invs.map(p => Math.floor((p.hp + 2) / 3)));
      },
      // LoseEff: Rounder's team discards pets with total STR >= 4
      loseEff(c) {
        const r = c.board.rounder;
        const allPets: number[] = [];
        for (const py of c.board.garden.values()) {
          if (py.isAlive && py.team === r.team) {
            allPets.push(...py.pets.filter(p => p !== 0));
          }
        }
        if (allPets.length > 0) {
          const opts = allPets.join('p');
          c.asyncInput(r.uid, `#弃置累积战力4及以上的,M1(p${opts})`, 'GTT2LoseEff', '0').then(ts => {
            if (ts) {
              const pick = ts.split(',').map(p => parseInt(p) || 0).filter(p => p > 0);
              let sum = 0;
              for (const code of pick) {
                const mon = c.libGroup.ml.decode(code);
                if (mon) sum += mon.str;
              }
              if (sum >= 4 || pick.length === allPets.length) {
                for (const code of pick) {
                  c.raiseGMessage(`G1LP,${code}`);
                }
              }
            }
          });
        }
      },
      // ConsumeValid: Check if attending war
      consumeValid(c, player, consumeType) {
        if (consumeType === 0) return c.board.isAttendWar(player);
        return false;
      },
      // ConsumeAction: Target a player to lose 2 STR
      consumeAction(c, player, consumeType) {
        if (consumeType === 0) {
          const all = [...c.board.garden.values()].filter(p => p.isAlive);
          const opts = all.map(p => p.uid).join('p');
          c.asyncInput(player.uid, `#指定战力-2的,/T1(p${opts})`, 'GTT2ConsumeAction', '0').then(ts => {
            if (ts && ts !== '/0') {
              const to = parseInt(ts) || 0;
              c.targetPlayer(player.uid, to);
              c.raiseGMessage(`G0OA,${to},1,2`);
            }
          });
        }
      },
    },

    // ═══════════════════════════════════════════
    // Package 5# Expansion Monsters
    // ═══════════════════════════════════════════

    GST3: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GST4: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 3
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 3);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GHT3: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GHT4: {
      // Debut: All alive players lose 1 DEX
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OX,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 3
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 3);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
    },

    GLT3: {
      // Debut: Disable all equipment for attenders
      debut(c) {
        const attenders = [...c.board.garden.values()].filter(p => p.isAlive && c.board.isAttendWar(p));
        for (const py of attenders) {
          c.raiseGMessage(`G2QZ,${py.uid},${py.weapon},1`);
          c.raiseGMessage(`G2QZ,${py.uid},${py.armor},1`);
          c.raiseGMessage(`G2QZ,${py.uid},${py.trove},1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GLT4: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 3
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 3);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
    },

    GFT3: {
      // Debut: Each alive player draws 1 card
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0DH,${p.uid},0,1`);
        }
      },
      // WinEff: Heal rounder for 3
      winEff(c) {
        c.cure(null, c.board.rounder, 3);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
    },

    GFT4: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GTT3: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GTT4: {
      // Debut: All alive players lose 1 DEX
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OX,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    // ═══════════════════════════════════════════
    // Package HL# Expansion Monsters
    // ═══════════════════════════════════════════

    GSH1: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
      incrAction(c, player) {
        c.raiseGMessage(`G0IA,${player.uid},0,1`);
      },
      decrAction(c, player) {
        c.raiseGMessage(`G0OA,${player.uid},0,1`);
      },
    },

    GSH2: {
      // Debut: All alive players lose 1 DEX
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OX,${p.uid},0,1`);
        }
      },
      // Curtain: Re-enable all equipment
      curtain(c) {
        for (const py of c.board.garden.values()) {
          if (py.isAlive) {
            c.raiseGMessage(`G2QZ,${py.uid},${py.weapon},0`);
            c.raiseGMessage(`G2QZ,${py.uid},${py.armor},0`);
            c.raiseGMessage(`G2QZ,${py.uid},${py.trove},0`);
          }
        }
      },
      // WinEff: Harm hinder for 3
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 3);
      },
      // LoseEff: Harm rounder for 3
      loseEff(c) {
        c.harm(null, c.board.rounder, 3);
      },
    },

    GHH1: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GHH2: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GLH1: {
      // Debut: All alive players lose 1 DEX
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OX,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GLH2: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GFH1: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GFH2: {
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GTH1: {
      // Debut: All alive players lose 1 DEX
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OX,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },

    GTH2: {
      // Debut: All alive players lose 1 STR
      debut(c) {
        const all = [...c.board.garden.values()].filter(p => p.isAlive);
        for (const p of all) {
          c.raiseGMessage(`G0OA,${p.uid},0,1`);
        }
      },
      // WinEff: Harm hinder for 2
      winEff(c) {
        const h = c.board.hinder;
        if (h.isAlive && h.uid !== 0) c.harm(null, h, 2);
      },
      // LoseEff: Harm rounder for 2
      loseEff(c) {
        c.harm(null, c.board.rounder, 2);
      },
    },
  };
}
