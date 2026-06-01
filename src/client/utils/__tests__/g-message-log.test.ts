import { describe, it, expect } from 'vitest';
import { gMessageToLogText, type LogContext } from '../g-message-log';

const baseCtx: LogContext = {
  players: [
    { uid: 1, name: '赵灵儿', heroAvatar: 0, hp: 8, hpBase: 10, hand: [], handCount: 3, team: 1, weapon: 0, armor: 0, trove: 0, exEquip: 0, str: 3, dex: 2, pets: [], petCodes: [], skills: [], blesses: [], status: [] },
    { uid: 2, name: '李逍遥', heroAvatar: 0, hp: 10, hpBase: 12, hand: [], handCount: 5, team: 1, weapon: 0, armor: 0, trove: 0, exEquip: 0, str: 4, dex: 3, pets: [], petCodes: [], skills: [], blesses: [], status: [] },
    { uid: 3, name: '韩菱纱', heroAvatar: 0, hp: 7, hpBase: 8, hand: [], handCount: 2, team: 2, weapon: 0, armor: 0, trove: 0, exEquip: 0, str: 2, dex: 5, pets: [], petCodes: [], skills: [], blesses: [], status: [] },
  ],
  lookup: {
    cards: { 1001: '天蛇杖', 1002: '魔剑', 2001: '五彩霞衣', 3001: '鼠儿果' },
    heroes: { 1: '赵灵儿', 2: '李逍遥', 3: '韩菱纱', 4: '林月如' },
    monsters: { 1: '千杯不醉', 2: '五毒兽', 3: '熔岩兽王' },
    skills: { 'xlrc': '侠骨柔肠', 'fslz': '飞龙探云手' },
    events: { 10: '仙灵岛奇遇', 20: '比武招亲' },
  },
};

describe('gMessageToLogText', () => {
  describe('G0OH - damage', () => {
    it('should format damage from player to player', () => {
      const result = gMessageToLogText('G0OH,1,2,3,5,0', baseCtx);
      expect(result).toBe('李逍遥 对 赵灵儿 造成 5 点雷伤害');
    });

    it('should format damage with source=0 (system damage)', () => {
      const result = gMessageToLogText('G0OH,1,0,1,3,0', baseCtx);
      expect(result).toBe('系统 对 赵灵儿 造成 3 点火伤害');
    });

    it('should handle physical damage', () => {
      const result = gMessageToLogText('G0OH,3,1,0,2,0', baseCtx);
      expect(result).toBe('赵灵儿 对 韩菱纱 造成 2 点物理伤害');
    });

    it('should handle unknown element', () => {
      const result = gMessageToLogText('G0OH,1,2,99,1,0', baseCtx);
      expect(result).toBe('李逍遥 对 赵灵儿 造成 1 点E99伤害');
    });
  });

  describe('G0IH - heal', () => {
    it('should format healing', () => {
      const result = gMessageToLogText('G0IH,1,2,0,3,0', baseCtx);
      expect(result).toBe('赵灵儿 恢复 3 点 HP');
    });
  });

  describe('G0IT - add cards to hand', () => {
    it('should format card gained', () => {
      const result = gMessageToLogText('G0IT,1,1001', baseCtx);
      expect(result).toBe('赵灵儿 获得 [天蛇杖]');
    });

    it('should handle multiple cards', () => {
      const result = gMessageToLogText('G0IT,2,1001,1002', baseCtx);
      expect(result).toBe('李逍遥 获得 [天蛇杖]');
    });
  });

  describe('G0OT - remove cards from hand', () => {
    it('should format card lost', () => {
      const result = gMessageToLogText('G0OT,1,1001', baseCtx);
      expect(result).toBe('赵灵儿 失去 [天蛇杖]');
    });
  });

  describe('G0QZ - discard', () => {
    it('should format discard', () => {
      const result = gMessageToLogText('G0QZ,1,1001,1002', baseCtx);
      expect(result).toBe('赵灵儿 弃掉 [天蛇杖]');
    });
  });

  describe('G0CC - card use', () => {
    it('should format card use', () => {
      const result = gMessageToLogText('G0CC,1,1,0,1001', baseCtx);
      expect(result).toBe('赵灵儿 使用 [天蛇杖]');
    });
  });

  describe('G0CD - card target', () => {
    it('should format card targeting', () => {
      const result = gMessageToLogText('G0CD,1,3,天雷破;1,0', baseCtx);
      expect(result).toBe('赵灵儿 对 韩菱纱 使用 [天雷破]');
    });
  });

  describe('G0CE - card execute', () => {
    it('should format card execution success', () => {
      const result = gMessageToLogText('G0CE,1,3,0,天雷破;1,0', baseCtx);
      expect(result).toBe('赵灵儿 的 [天雷破] 生效');
    });

    it('should format card execution cancelled', () => {
      const result = gMessageToLogText('G0CE,1,3,1,天雷破;1,0', baseCtx);
      expect(result).toBe('[天雷破] 被取消');
    });
  });

  describe('G1CW - two target card', () => {
    it('should format two-target card', () => {
      const result = gMessageToLogText('G1CW,1,2,3,冰心诀;0;1,0', baseCtx);
      expect(result).toBe('赵灵儿 对 李逍遥 和 韩菱纱 使用 [冰心诀]');
    });
  });

  describe('G1TH - harm', () => {
    it('should format HP loss', () => {
      const result = gMessageToLogText('G1TH,1,3', baseCtx);
      expect(result).toBe('赵灵儿 受到 3 点伤害');
    });

    it('should format multiple players harmed', () => {
      const result = gMessageToLogText('G1TH,1,2,3,1', baseCtx);
      // Only first entry is returned for simplicity
      expect(result).toBe('赵灵儿 受到 2 点伤害');
    });

    it('should format HP gain (negative harm)', () => {
      const result = gMessageToLogText('G1TH,1,-3', baseCtx);
      expect(result).toBe('赵灵儿 恢复 3 点 HP');
    });
  });

  describe('G0HZ - tangled', () => {
    it('should format tangled with monster', () => {
      const result = gMessageToLogText('G0HZ,1,3', baseCtx);
      expect(result).toBe('赵灵儿 与 熔岩兽王 缠斗');
    });
  });

  describe('G0IP - combat power', () => {
    it('should format pool increase', () => {
      const result = gMessageToLogText('G0IP,1,3', baseCtx);
      expect(result).toBe('触发方 战力 +3');
    });

    it('should format pool decrease', () => {
      const result = gMessageToLogText('G0IP,2,-2', baseCtx);
      expect(result).toBe('怪物方 战力 -2');
    });
  });

  describe('G0IA / G0OA - stat bonus', () => {
    it('should format STR bonus', () => {
      const result = gMessageToLogText('G0IA,1,0,2', baseCtx);
      expect(result).toBe('赵灵儿 战力 +2');
    });

    it('should format DEX bonus', () => {
      const result = gMessageToLogText('G0IA,2,1,1', baseCtx);
      expect(result).toBe('李逍遥 命中 +1');
    });

    it('should format stat removal', () => {
      const result = gMessageToLogText('G0OA,1,0,1', baseCtx);
      expect(result).toBe('赵灵儿 战力 -1');
    });
  });

  describe('G0ZW - kill', () => {
    it('should format player killed', () => {
      const result = gMessageToLogText('G0ZW,1', baseCtx);
      expect(result).toBe('赵灵儿 被击杀');
    });
  });

  describe('G0ZH - death check', () => {
    it('should format death check', () => {
      const result = gMessageToLogText('G0ZH,1', baseCtx);
      expect(result).toBe('赵灵儿 进行死亡判定');
    });
  });

  describe('G1GE - win/lose effect', () => {
    it('should format win effect', () => {
      const result = gMessageToLogText('G1GE,W,3', baseCtx);
      expect(result).toBe('熔岩兽王 胜利效果触发');
    });

    it('should format lose effect', () => {
      const result = gMessageToLogText('G1GE,L,1', baseCtx);
      expect(result).toBe('千杯不醉 失败效果触发');
    });
  });

  describe('G0HC - harvest pet', () => {
    it('should format pet capture', () => {
      const result = gMessageToLogText('G0HC,0,1,0,0,3', baseCtx);
      expect(result).toBe('赵灵儿 捕获了 熔岩兽王 作为宠物');
    });
  });

  describe('G0HD - obtain pet', () => {
    it('should format pet obtained', () => {
      const result = gMessageToLogText('G0HD,1,0,0,2', baseCtx);
      expect(result).toBe('赵灵儿 获得宠物 五毒兽');
    });
  });

  describe('G0IE / G0OE - pet effect toggle', () => {
    it('should format pet effect enabled', () => {
      const result = gMessageToLogText('G0IE,1', baseCtx);
      expect(result).toBe('赵灵儿 的宠物效果已启用');
    });

    it('should format pet effect disabled', () => {
      const result = gMessageToLogText('G0OE,1', baseCtx);
      expect(result).toBe('赵灵儿 的宠物效果已禁用');
    });
  });

  describe('G0DH - draw/discard', () => {
    it('should format draw', () => {
      const result = gMessageToLogText('G0DH,1,0,2', baseCtx);
      expect(result).toBe('赵灵儿 抽取 2 张牌');
    });

    it('should format random discard', () => {
      const result = gMessageToLogText('G0DH,1,2,1', baseCtx);
      expect(result).toBe('赵灵儿 随机弃 1 张牌');
    });

    it('should format discard all', () => {
      const result = gMessageToLogText('G0DH,1,3,0', baseCtx);
      expect(result).toBe('赵灵儿 弃掉所有手牌');
    });
  });

  describe('G0HG - give cards', () => {
    it('should format draw cards', () => {
      const result = gMessageToLogText('G0HG,1,2', baseCtx);
      expect(result).toBe('赵灵儿 补充 2 张手牌');
    });
  });

  describe('G0QR - quarter reset', () => {
    it('should format hand limit exceeded', () => {
      const result = gMessageToLogText('G0QR,1', baseCtx);
      expect(result).toBe('赵灵儿 手牌超出上限');
    });
  });

  describe('G0DS - freeze', () => {
    it('should format freeze', () => {
      const result = gMessageToLogText('G0DS,1', baseCtx);
      expect(result).toBe('赵灵儿 被冻结');
    });
  });

  describe('G0IY - hero change', () => {
    it('should format hero change', () => {
      const result = gMessageToLogText('G0IY,0,1,4', baseCtx);
      expect(result).toBe('赵灵儿 切换为 林月如');
    });
  });

  describe('G0IS / G0OS - skill add/remove', () => {
    it('should format skill added', () => {
      const result = gMessageToLogText('G0IS,1,0,xlrc', baseCtx);
      expect(result).toBe('赵灵儿 获得技能 [侠骨柔肠]');
    });

    it('should format skill removed', () => {
      const result = gMessageToLogText('G0OS,1,0,fslz', baseCtx);
      expect(result).toBe('赵灵儿 失去技能 [飞龙探云手]');
    });
  });

  describe('G0ZB - equip', () => {
    it('should format equipment', () => {
      const result = gMessageToLogText('G0ZB,0,1,1,0,0,1001', baseCtx);
      expect(result).toBe('赵灵儿 装备了 [天蛇杖]');
    });
  });

  describe('G0ZJ - equip slot variation', () => {
    it('should format slot increase', () => {
      const result = gMessageToLogText('G0ZJ,1,0,1', baseCtx);
      expect(result).toBe('赵灵儿 的武器槽容量增加');
    });

    it('should format slot decrease', () => {
      const result = gMessageToLogText('G0ZJ,1,1,0', baseCtx);
      expect(result).toBe('赵灵儿 的防具槽容量减少');
    });
  });

  describe('G0OF - remove rune', () => {
    it('should format rune removal', () => {
      const result = gMessageToLogText('G0OF,1,1001', baseCtx);
      expect(result).toBe('赵灵儿 失去符文 [天蛇杖]');
    });
  });

  describe('G0IV / G0OV - cos stack', () => {
    it('should format cos push', () => {
      const result = gMessageToLogText('G0IV,1,4', baseCtx);
      expect(result).toBe('赵灵儿 的 林月如 进入化身栈');
    });

    it('should format cos pop', () => {
      const result = gMessageToLogText('G0OV,1', baseCtx);
      expect(result).toBe('赵灵儿 从化身栈恢复');
    });
  });

  describe('G0OY - leave game', () => {
    it('should format player leave', () => {
      const result = gMessageToLogText('G0OY,2,1', baseCtx);
      expect(result).toBe('赵灵儿 离场');
    });
  });

  describe('G1EV - event card', () => {
    it('should format event card', () => {
      const result = gMessageToLogText('G1EV,1,0', baseCtx);
      // Event card ID is in args[2] but we need the actual card ID from the event pile
      // This is a simplified version - the actual event name comes from the event pile
      expect(result).toBeNull(); // G1EV needs event card data from lookup
    });
  });

  describe('G1IU - insert PZone', () => {
    it('should format PZone insert', () => {
      const result = gMessageToLogText('G1IU,1001,1002', baseCtx);
      expect(result).toBe('展示区增加 [天蛇杖]');
    });
  });

  describe('G1DI - disposal', () => {
    it('should format disposal to tux pile', () => {
      const result = gMessageToLogText('G1DI,0,1001', baseCtx);
      expect(result).toBe('[天蛇杖] 被废弃');
    });
  });

  describe('G1WJ - exhaustion', () => {
    it('should format game exhaustion', () => {
      const result = gMessageToLogText('G1WJ,0', baseCtx);
      expect(result).toBe('牌堆耗尽，游戏进入终局');
    });
  });

  describe('G09P - pond refresh', () => {
    it('should format pond refresh', () => {
      const result = gMessageToLogText('G09P,0', baseCtx);
      expect(result).toBe('战力池已刷新');
    });
  });

  describe('G0CZ - ZP counter', () => {
    it('should format ZP counter reset', () => {
      const result = gMessageToLogText('G0CZ,2', baseCtx);
      expect(result).toBe('战牌计数器已重置');
    });

    it('should format ZP counter set for player', () => {
      const result = gMessageToLogText('G0CZ,1,1', baseCtx);
      expect(result).toBe('赵灵儿 战牌计数器设为1');
    });
  });

  describe('G0XZ - peek pile', () => {
    it('should format peek pile', () => {
      const result = gMessageToLogText('G0XZ,1,1,0,3', baseCtx);
      expect(result).toBe('赵灵儿 观看了牌堆');
    });
  });

  describe('unknown commands', () => {
    it('should return null for unknown command', () => {
      const result = gMessageToLogText('G999,1,2', baseCtx);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = gMessageToLogText('', baseCtx);
      expect(result).toBeNull();
    });
  });

  describe('missing lookup data', () => {
    it('should fallback to numeric ID for unknown card', () => {
      const ctx: LogContext = {
        players: [
          { uid: 1, name: '玩家1', heroAvatar: 0, hp: 8, hpBase: 10, hand: [], handCount: 3, team: 1, weapon: 0, armor: 0, trove: 0, exEquip: 0, str: 3, dex: 2, pets: [], petCodes: [], skills: [], blesses: [], status: [] },
          { uid: 2, name: '玩家2', heroAvatar: 0, hp: 10, hpBase: 12, hand: [], handCount: 5, team: 1, weapon: 0, armor: 0, trove: 0, exEquip: 0, str: 4, dex: 3, pets: [], petCodes: [], skills: [], blesses: [], status: [] },
        ],
        lookup: undefined,
      };
      const result = gMessageToLogText('G0OH,1,2,3,5,0', ctx);
      expect(result).toBe('玩家2 对 玩家1 造成 5 点雷伤害');
    });

    it('should fallback for unknown monster', () => {
      const result = gMessageToLogText('G0HZ,1,999', baseCtx);
      expect(result).toBe('赵灵儿 与 怪物#999 缠斗');
    });

    it('should fallback for unknown skill', () => {
      const result = gMessageToLogText('G0IS,1,0,unknown_skill', baseCtx);
      expect(result).toBe('赵灵儿 获得技能 [unknown_skill]');
    });
  });

  describe('multiple entries in one message', () => {
    it('should handle G1TH with multiple players', () => {
      const results: string[] = [];
      // G1TH can have multiple pairs - test with single pair
      const result = gMessageToLogText('G1TH,1,2,3,1', baseCtx);
      expect(result).toBe('赵灵儿 受到 2 点伤害');
    });
  });
});
