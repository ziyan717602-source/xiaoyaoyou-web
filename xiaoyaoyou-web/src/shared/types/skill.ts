// Skill 类型定义 - 对应 C# PSD.Base.Skill

/**
 * 技能数据结构
 */
export interface Skill {
  /** 技能名称 */
  Name: string;
  /** 技能代码，如 JN101 */
  Code: string;
  /** 触发条件数组 */
  Occurs: string[];
  /** 优先级数组 */
  Priorities: number[];
  /** 是否单次数组 */
  IsOnce: boolean[];
  /** 是否终止数组 */
  IsTermini: boolean[];
  /** 锁定状态数组（true=锁定, null=可选, false=正常） */
  Lock: (boolean | null)[];
  /** 是否阻碍数组 */
  IsHind: boolean[];
  /** 是否变化技能 */
  IsChange: boolean;
  /** 是否限制技能 */
  IsRestrict: boolean;
  /** 寄生条件数组 */
  Parasitism: string[];
  /** 技能描述 */
  Descripe: string;
}

/**
 * 祝福技能 - 继承自 Skill，对应 C# Bless
 */
export interface Bless extends Skill {
  /** 祝福验证函数 */
  BKValid: (player: unknown, type: number, fuse: string, owner: number) => boolean;
}
