/**
 * RuleCode - Translation of C# PSD.Base.Rules.RuleCode
 */

export class RuleCode {
  static readonly DEF_CODE = 0x0;

  // Team Selection
  static readonly HOPE_NO = 0x2;
  static readonly HOPE_YES = 0x4;
  static readonly HOPE_NOTCARE = 0x5;
  static readonly HOPE_AKA = 0x6;
  static readonly HOPE_AO = 0x7;
  static readonly HOPE_IP = 0xC;

  // Mode Selection
  static readonly MODE_00 = 0x1;
  static readonly MODE_CJ = 0x2;
  static readonly MODE_31 = 0x3;
  static readonly MODE_RM = 0x4;
  static readonly MODE_BP = 0x5;
  static readonly MODE_RD = 0x6;
  static readonly MODE_ZY = 0x7;
  static readonly MODE_CP = 0x8;
  static readonly MODE_IN = 0x9;
  static readonly MODE_SS = 0xA;
  static readonly MODE_NM = 0xB;
  static readonly MODE_TC = 0xC;
  static readonly MODE_CM = 0xD;

  // Package Selection
  static readonly LEVEL_NEW = 0x1 << 1;
  static readonly LEVEL_STD = 0x2 << 1;
  static readonly LEVEL_RCM = 0x3 << 1;
  static readonly LEVEL_ALL = 0x4 << 1;
  static readonly LEVEL_IPV = 0x5 << 1;
  static readonly LEVEL_TRAIN_MASK = 0x1;

  static castMode(name: string): number {
    const map: Record<string, number> = {
      '00': RuleCode.MODE_00, 'CJ': RuleCode.MODE_CJ, '31': RuleCode.MODE_31,
      'RM': RuleCode.MODE_RM, 'BP': RuleCode.MODE_BP, 'RD': RuleCode.MODE_RD,
      'ZY': RuleCode.MODE_ZY, 'CP': RuleCode.MODE_CP, 'IN': RuleCode.MODE_IN,
      'SS': RuleCode.MODE_SS, 'NM': RuleCode.MODE_NM, 'TC': RuleCode.MODE_TC,
      'CM': RuleCode.MODE_CM,
    };
    return map[name] ?? RuleCode.DEF_CODE;
  }

  static castModeToString(mode: number): string {
    const map: Record<number, string> = {
      [RuleCode.MODE_00]: '00', [RuleCode.MODE_CJ]: 'CJ', [RuleCode.MODE_31]: '31',
      [RuleCode.MODE_RM]: 'RM', [RuleCode.MODE_BP]: 'BP', [RuleCode.MODE_RD]: 'RD',
      [RuleCode.MODE_ZY]: 'ZY', [RuleCode.MODE_CP]: 'CP', [RuleCode.MODE_IN]: 'IN',
      [RuleCode.MODE_SS]: 'SS', [RuleCode.MODE_NM]: 'NM', [RuleCode.MODE_TC]: 'TC',
      [RuleCode.MODE_CM]: 'CM',
    };
    return map[mode] ?? 'RM';
  }
}
