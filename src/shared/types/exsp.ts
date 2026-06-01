// Exsp 类型定义 - 对应 C# PSD.Base.Card.Exsp

/**
 * 特殊牌数据结构
 */
export interface Exsp {
  /** 特殊牌名称，如"雷灵" */
  Name: string;
  /** 特殊牌代码，如 TRXJ608 */
  Code: string;
  /** 特殊牌类型：0=通用, 1=目标, 2=Token, 3=ICard, 4=标记 */
  Type: number;
  /** 持有英雄编号（如 TR004） */
  Hero: number;
  /** 技能列表 */
  Skills: string[];
  /** 描述字典 */
  Description: Record<string, string>;
}
