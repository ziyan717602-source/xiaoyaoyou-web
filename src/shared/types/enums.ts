// 枚举类型定义 - 对应 C# PSD.Base.Card 中的枚举

/**
 * 装备牌类型 - 对应 C# Tux.TuxType
 */
export enum TuxType {
  HX = 'HX',
  JP = 'JP',
  ZP = 'ZP',
  TP = 'TP',
  WQ = 'WQ',
  FJ = 'FJ',
  XB = 'XB',
}

/**
 * 怪物等级 - 对应 C# Monster.ClLevel
 */
export enum MonsterLevel {
  WOODEN = 'WOODEN',
  WEAK = 'WEAK',
  STRONG = 'STRONG',
  BOSS = 'BOSS',
}

/**
 * 五行属性 - 对应 C# FiveElement
 */
export enum FiveElement {
  A = 'A',
  AQUA = 'AQUA',
  AGNI = 'AGNI',
  THUNDER = 'THUNDER',
  AERO = 'AERO',
  SATURN = 'SATURN',
  YINN = 'YINN',
  SOLARIS = 'SOLARIS',
}

/**
 * 卡牌类型分类
 */
export enum Genre {
  /** 角色牌 */
  Hero = 0,
  /** 装备牌 */
  Tux = 1,
  /** 怪物牌 */
  Monster = 2,
  /** NPC牌 */
  NPC = 3,
  /** 事件牌 */
  Evenement = 4,
  /** 技能 */
  Skill = 5,
  /** 符文 */
  Rune = 6,
  /** 特殊牌 */
  Exsp = 7,
  /** 操作 */
  Operation = 8,
  /** NPC行动 */
  NCAction = 9,
}

/**
 * 卡堆类型分类
 */
export enum PileGenre {
  /** 手牌堆 */
  Tux = 0,
  /** 弃牌堆 */
  Discard = 1,
  /** 牌库 */
  Debris = 2,
  /** 消耗堆 */
  Exhaust = 3,
}
