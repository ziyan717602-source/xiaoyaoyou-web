/**
 * G-Message to Human-Readable Log Text Converter
 *
 * Transforms raw G-message strings (e.g. "G0OH,1,2,3,5,0") into
 * human-readable Chinese log entries for the EventLog component.
 */

import type { PlayerState } from '@shared/network';

export interface NameLookup {
  cards: Record<number, string>;
  heroes: Record<number, string>;
  monsters: Record<number, string>;
  skills: Record<string, string>;
  events: Record<number, string>;
}

export interface LogContext {
  players: PlayerState[];
  lookup?: NameLookup;
}

function resolvePlayer(uid: number, ctx: LogContext): string {
  const p = ctx.players.find(p => p.uid === uid);
  return p?.name ?? `玩家${uid}`;
}

function resolveCard(cardId: number, ctx: LogContext): string {
  return ctx.lookup?.cards[cardId] ?? `卡牌#${cardId}`;
}

function resolveHero(heroId: number, ctx: LogContext): string {
  return ctx.lookup?.heroes[heroId] ?? `英雄#${heroId}`;
}

function resolveMonster(monId: number, ctx: LogContext): string {
  return ctx.lookup?.monsters[monId] ?? `怪物#${monId}`;
}

function resolveSkill(code: string, ctx: LogContext): string {
  return ctx.lookup?.skills[code] ?? code;
}

function resolveEvent(eventCardId: number, ctx: LogContext): string {
  return ctx.lookup?.events[eventCardId] ?? `事件#${eventCardId}`;
}

const ELEMENTS = ['物理', '火', '水', '雷', '风', '土'];

/**
 * Convert a G-message string to a human-readable log entry.
 * Returns null if the message should not be logged.
 */
export function gMessageToLogText(msg: string, ctx: LogContext): string | null {
  if (!msg) return null;

  const args = msg.split(',');
  const cmd = args[0];

  switch (cmd) {
    // === Combat Flow ===
    case 'G0OH': {
      const target = parseInt(args[1], 10);
      const source = parseInt(args[2], 10);
      const element = parseInt(args[3], 10);
      const damage = parseInt(args[4], 10);
      const elemName = ELEMENTS[element] ?? `E${element}`;
      const t = resolvePlayer(target, ctx);
      const s = source > 0 ? resolvePlayer(source, ctx) : '系统';
      return `${s} 对 ${t} 造成 ${damage} 点${elemName}伤害`;
    }

    case 'G0IH': {
      const target = parseInt(args[1], 10);
      const heal = parseInt(args[4], 10);
      return `${resolvePlayer(target, ctx)} 恢复 ${heal} 点 HP`;
    }

    case 'G1TH': {
      const uid = parseInt(args[1], 10);
      const harm = parseInt(args[2], 10);
      if (harm > 0) {
        return `${resolvePlayer(uid, ctx)} 受到 ${harm} 点伤害`;
      } else if (harm < 0) {
        return `${resolvePlayer(uid, ctx)} 恢复 ${Math.abs(harm)} 点 HP`;
      }
      return null;
    }

    case 'G0CC': {
      const provider = parseInt(args[1], 10);
      const cardId = parseInt(args[4], 10);
      if (provider > 0) {
        return `${resolvePlayer(provider, ctx)} 使用 [${resolveCard(cardId, ctx)}]`;
      }
      return null;
    }

    case 'G0CD': {
      const a = parseInt(args[1], 10);
      const t = parseInt(args[2], 10);
      const cardPart = args[3] ?? '';
      const cardName = cardPart.split(';')[0];
      return `${resolvePlayer(a, ctx)} 对 ${resolvePlayer(t, ctx)} 使用 [${cardName}]`;
    }

    case 'G0CE': {
      const a = parseInt(args[1], 10);
      const cancelled = args[3] === '1';
      const cardPart = args[4] ?? '';
      const cardName = cardPart.split(';')[0];
      if (cancelled) {
        return `[${cardName}] 被取消`;
      }
      return `${resolvePlayer(a, ctx)} 的 [${cardName}] 生效`;
    }

    case 'G1CW': {
      const a = parseInt(args[1], 10);
      const b = parseInt(args[2], 10);
      const c = parseInt(args[3], 10);
      const cardPart = args[4] ?? '';
      const cardName = cardPart.split(';')[0];
      return `${resolvePlayer(a, ctx)} 对 ${resolvePlayer(b, ctx)} 和 ${resolvePlayer(c, ctx)} 使用 [${cardName}]`;
    }

    case 'G0HZ': {
      const target = parseInt(args[1], 10);
      const monsterId = parseInt(args[2], 10);
      return `${resolvePlayer(target, ctx)} 与 ${resolveMonster(monsterId, ctx)} 缠斗`;
    }

    case 'G0IP': {
      const side = parseInt(args[1], 10);
      const delta = parseInt(args[2], 10);
      const label = side === 1 ? '触发方' : '怪物方';
      return `${label} 战力 ${delta > 0 ? '+' : ''}${delta}`;
    }

    case 'G0IA': {
      const target = parseInt(args[1], 10);
      const statType = parseInt(args[2], 10);
      const bonus = parseInt(args[3], 10);
      const statName = statType === 0 ? '战力' : '命中';
      return `${resolvePlayer(target, ctx)} ${statName} +${bonus}`;
    }

    case 'G0OA': {
      const target = parseInt(args[1], 10);
      const statType = parseInt(args[2], 10);
      const bonus = parseInt(args[3], 10);
      const statName = statType === 0 ? '战力' : '命中';
      return `${resolvePlayer(target, ctx)} ${statName} -${bonus}`;
    }

    case 'G0ZW': {
      const uids = args.slice(1).map(Number).filter(n => n > 0);
      return uids.map(uid => `${resolvePlayer(uid, ctx)} 被击杀`).join('；');
    }

    case 'G0ZH': {
      const target = parseInt(args[1], 10);
      return `${resolvePlayer(target, ctx)} 进行死亡判定`;
    }

    case 'G1GE': {
      const results: string[] = [];
      for (let i = 1; i < args.length - 1; i += 2) {
        const winStr = args[i];
        const monId = parseInt(args[i + 1], 10);
        const effect = winStr === 'W' ? '胜利效果' : '失败效果';
        results.push(`${resolveMonster(monId, ctx)} ${effect}触发`);
      }
      return results.join('；') || null;
    }

    // === Pet System ===
    case 'G0HC': {
      const farmer = parseInt(args[2], 10);
      const pets = args.slice(5).map(Number).filter(n => n > 0);
      if (pets.length > 0) {
        return `${resolvePlayer(farmer, ctx)} 捕获了 ${resolveMonster(pets[0], ctx)} 作为宠物`;
      }
      return null;
    }

    case 'G0HD': {
      const farmer = parseInt(args[1], 10);
      const pets = args.slice(4).map(Number).filter(n => n > 0);
      if (pets.length > 0) {
        return `${resolvePlayer(farmer, ctx)} 获得宠物 ${resolveMonster(pets[0], ctx)}`;
      }
      return null;
    }

    case 'G0IE': {
      const uid = parseInt(args[1], 10);
      return `${resolvePlayer(uid, ctx)} 的宠物效果已启用`;
    }

    case 'G0OE': {
      const uid = parseInt(args[1], 10);
      return `${resolvePlayer(uid, ctx)} 的宠物效果已禁用`;
    }

    // === Card Operations ===
    case 'G0IT': {
      const target = parseInt(args[1], 10);
      const cardId = parseInt(args[2], 10);
      return `${resolvePlayer(target, ctx)} 获得 [${resolveCard(cardId, ctx)}]`;
    }

    case 'G0OT': {
      const target = parseInt(args[1], 10);
      const cardId = parseInt(args[2], 10);
      return `${resolvePlayer(target, ctx)} 失去 [${resolveCard(cardId, ctx)}]`;
    }

    case 'G0QZ': {
      const target = parseInt(args[1], 10);
      const cards = args.slice(2).map(Number).filter(n => n > 0);
      if (cards.length > 0) {
        return `${resolvePlayer(target, ctx)} 弃掉 [${resolveCard(cards[0], ctx)}]`;
      }
      return null;
    }

    case 'G0DH': {
      const uid = parseInt(args[1], 10);
      const loseType = parseInt(args[2], 10);
      const n = parseInt(args[3], 10);
      const name = resolvePlayer(uid, ctx);
      if (loseType === 0) return `${name} 抽取 ${n} 张牌`;
      if (loseType === 2) return `${name} 随机弃 ${n} 张牌`;
      if (loseType === 3) return `${name} 弃掉所有手牌`;
      return `${name} 弃 ${n} 张牌`;
    }

    case 'G0HG': {
      const uid = parseInt(args[1], 10);
      const n = parseInt(args[2], 10);
      return `${resolvePlayer(uid, ctx)} 补充 ${n} 张手牌`;
    }

    case 'G0QR': {
      const uid = parseInt(args[1], 10);
      return `${resolvePlayer(uid, ctx)} 手牌超出上限`;
    }

    case 'G1IU': {
      const cardId = parseInt(args[1], 10);
      return `展示区增加 [${resolveCard(cardId, ctx)}]`;
    }

    case 'G1DI': {
      const cardId = parseInt(args[2], 10);
      return `[${resolveCard(cardId, ctx)}] 被废弃`;
    }

    // === Equipment ===
    case 'G0ZB': {
      const who = parseInt(args[2], 10);
      const cards = args.slice(6).map(Number).filter(n => n > 0);
      if (cards.length > 0) {
        return `${resolvePlayer(who, ctx)} 装备了 [${resolveCard(cards[0], ctx)}]`;
      }
      return null;
    }

    case 'G0ZJ': {
      const who = parseInt(args[1], 10);
      const slot = parseInt(args[2], 10);
      const increase = args[3] === '1';
      const slotNames = ['武器', '防具', '饰品', '备用'];
      const slotName = slotNames[slot] ?? `槽${slot}`;
      const action = increase ? '增加' : '减少';
      return `${resolvePlayer(who, ctx)} 的${slotName}槽容量${action}`;
    }

    case 'G0OF': {
      const who = parseInt(args[1], 10);
      const runeId = parseInt(args[2], 10);
      return `${resolvePlayer(who, ctx)} 失去符文 [${resolveCard(runeId, ctx)}]`;
    }

    // === Hero/Skill Changes ===
    case 'G0IY': {
      const uid = parseInt(args[2], 10);
      const heroNum = parseInt(args[3], 10);
      return `${resolvePlayer(uid, ctx)} 切换为 ${resolveHero(heroNum, ctx)}`;
    }

    case 'G0IS': {
      const who = parseInt(args[1], 10);
      const skillCode = args[3];
      return `${resolvePlayer(who, ctx)} 获得技能 [${resolveSkill(skillCode, ctx)}]`;
    }

    case 'G0OS': {
      const who = parseInt(args[1], 10);
      const skillCode = args[3];
      return `${resolvePlayer(who, ctx)} 失去技能 [${resolveSkill(skillCode, ctx)}]`;
    }

    case 'G0IV': {
      const uid = parseInt(args[1], 10);
      const heroId = parseInt(args[2], 10);
      return `${resolvePlayer(uid, ctx)} 的 ${resolveHero(heroId, ctx)} 进入化身栈`;
    }

    case 'G0OV': {
      const uid = parseInt(args[1], 10);
      return `${resolvePlayer(uid, ctx)} 从化身栈恢复`;
    }

    case 'G0DS': {
      const target = parseInt(args[1], 10);
      return `${resolvePlayer(target, ctx)} 被冻结`;
    }

    case 'G0OY': {
      const uid = parseInt(args[2], 10);
      return `${resolvePlayer(uid, ctx)} 离场`;
    }

    // === System Messages ===
    case 'G09P':
      return '战力池已刷新';

    case 'G0CZ': {
      const mode = parseInt(args[1], 10);
      if (mode === 2) return '战牌计数器已重置';
      const uid = parseInt(args[2], 10);
      return `${resolvePlayer(uid, ctx)} 战牌计数器设为1`;
    }

    case 'G1WJ':
      return '牌堆耗尽，游戏进入终局';

    case 'G0XZ': {
      const uid = parseInt(args[1], 10);
      return `${resolvePlayer(uid, ctx)} 观看了牌堆`;
    }

    // === Ignored messages (return null) ===
    case 'G2AS':
    case 'G0AS':
    case 'G2IN':
    case 'E09P':
      return null;

    default:
      return null;
  }
}
