// NPC 类型定义 - 对应 C# PSD.Base.Card.NPC

/**
 * NPC 牌数据结构
 */
export interface NPC {
  /** NPC 名称，如"玄霄" */
  Name: string;
  /** NPC 代码，如 NC201 */
  Code: string;
  /** 所属包组 */
  Group: number;
  /** 性别，M 或 F */
  Gender: string;
  /** 卡牌类型分类 */
  Genre: number;
  /** 基础力量 */
  STRb: number;
  /** 技能列表 */
  Skills: string[];
  /** 关联英雄编号（如 10505，0 表示不存在） */
  Hero: number;
  /** 出场文本 */
  DebutText: string;
}
