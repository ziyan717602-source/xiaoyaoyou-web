/**
 * 标准版游戏范围配置
 * 只包含标准版26张+凤鸣玉誓8张角色牌，禁用TR/HL等扩展
 */

// 标准版+凤鸣玉誓英雄Ofcode（34张）
// 仙剑一（7）：XJ101-XJ107
// 仙剑二（5）：XJ201-XJ203, XJ206-XJ207
// 仙剑三（3）：XJ302, XJ305, XJ306
// 仙剑三外传（4）：X3W01-X3W04
// 仙剑四（5）：XJ401-XJ405
// 仙剑五（2）：XJ503, XJ504
// 凤鸣玉誓（8）：XJ303, XJ304, XJ501, XJ502, XJ505, XJ506, XJ507, XJ508
export const STANDARD_HERO_OFCODES = [
  // 仙剑一（7）
  'XJ101', 'XJ102', 'XJ103', 'XJ104', 'XJ105', 'XJ106', 'XJ107',
  // 仙剑二（5）
  'XJ201', 'XJ202', 'XJ203', 'XJ206', 'XJ207',
  // 仙剑三（3）
  'XJ302', 'XJ305', 'XJ306',
  // 仙剑三外传（4）
  'X3W01', 'X3W02', 'X3W03', 'X3W04',
  // 仙剑四（5）
  'XJ401', 'XJ402', 'XJ403', 'XJ404', 'XJ405',
  // 仙剑五（2）
  'XJ503', 'XJ504',
  // 凤鸣玉誓（8）
  'XJ303', 'XJ304', 'XJ501', 'XJ502', 'XJ505', 'XJ506', 'XJ507', 'XJ508',
];

// 标准版怪物Code（20张）
export const STANDARD_MONSTER_CODES = [
  // 风属性（4）
  'GF01', 'GF02', 'GF03', 'GF04',
  // 雷属性（4）
  'GL01', 'GL02', 'GL03', 'GL04',
  // 水属性（4）
  'GS01', 'GS02', 'GS03', 'GS04',
  // 火属性（4）
  'GH01', 'GH02', 'GH03', 'GH04',
  // 土属性（4）
  'GT01', 'GT02', 'GT03', 'GT04',
];

// 标准版手牌Code（56张）
// 技牌（15）：JP01(3), JP02(2), JP03(2), JP04(3), JP05(3), JP06(2)
// 战牌（17）：TP01(2), TP02(5), TP03(8), TP04(2)
// 特殊牌（14）：ZP01(3), ZP02(4), ZP03(4), ZP04(3)
// 武器（5）：WQ01-WQ05
// 防具（5）：FJ01-FJ05
export const STANDARD_TUX_CODES = [
  // 技牌
  'JP01', 'JP02', 'JP03', 'JP04', 'JP05', 'JP06',
  // 战牌
  'TP01', 'TP02', 'TP03', 'TP04',
  // 特殊牌
  'ZP01', 'ZP02', 'ZP03', 'ZP04',
  // 武器
  'WQ01', 'WQ02', 'WQ03', 'WQ04', 'WQ05',
  // 防具
  'FJ01', 'FJ02', 'FJ03', 'FJ04', 'FJ05',
];

// 标准版事件牌（14张）
export const STANDARD_EVENT_NAMES = [
  // 仙剑一（4）
  '走出圣姑小屋', '闯荡试炼窟', '仙灵岛的邂逅', '深入将军冢',
  // 仙剑二（2）
  '破除禁咒空间', '寻找天使绘卷',
  // 仙剑三（3）
  '三世轮回', '神树与夕瑶', '封印锁妖塔',
  // 仙剑三外传（2）
  '绝世美味的诞生', '大军围蜀山',
  // 仙剑四（2）
  '拜访石沉溪洞', '束缚幻暝界',
  // 仙剑五（1）
  '误闯神魔之隙',
];

// 禁用的扩展内容前缀
export const DISABLED_HERO_PREFIXES = [
  'TR', 'HL', 'EX', 'SP', 'RM', // TR/HL/其他扩展
];
export const DISABLED_MONSTER_PREFIXES = [
  'GSH', 'GST', 'GHH', 'GHT', 'GLH', 'GLT', 'GFH', 'GFT', 'GTH', 'GTT', 'GIT', 'GYT',
];
export const DISABLED_TUX_PREFIXES = [
  'JPH', 'JPR', 'JPT', 'TPH', 'TPR', 'TPT', 'ZPH', 'ZPT', 'WQH', 'WQT', 'FJH', 'FJT', 'XB',
];

/**
 * 检查英雄是否在标准范围内
 */
export function isStandardHero(hero: { Avatar?: number; Ofcode?: string }): boolean {
  if (hero.Ofcode) {
    return STANDARD_HERO_OFCODES.includes(hero.Ofcode);
  }
  return false;
}

/**
 * 检查怪物是否在标准范围内
 */
export function isStandardMonster(monster: { Code?: string }): boolean {
  if (!monster.Code) return false;
  return STANDARD_MONSTER_CODES.includes(monster.Code);
}

/**
 * 检查怪物是否被禁用
 */
export function isDisabledMonster(monster: { Code?: string }): boolean {
  if (!monster.Code) return false;
  return DISABLED_MONSTER_PREFIXES.some(prefix => monster.Code!.startsWith(prefix));
}

/**
 * 检查手牌是否在标准范围内
 */
export function isStandardTux(tux: { Code?: string }): boolean {
  if (!tux.Code) return false;
  return STANDARD_TUX_CODES.includes(tux.Code);
}

/**
 * 检查手牌是否被禁用
 */
export function isDisabledTux(tux: { Code?: string }): boolean {
  if (!tux.Code) return false;
  return DISABLED_TUX_PREFIXES.some(prefix => tux.Code!.startsWith(prefix));
}

/**
 * 检查事件是否在标准范围内
 */
export function isStandardEvent(event: { Name?: string }): boolean {
  if (!event.Name) return false;
  return STANDARD_EVENT_NAMES.includes(event.Name);
}
