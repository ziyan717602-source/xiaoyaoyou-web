// Evenement 类型定义 - 对应 C# PSD.Base.Card.Evenement

/**
 * 事件牌数据结构
 */
export interface Evenement {
  /** 事件名称，如"夏铃铛的遭遇" */
  Name: string;
  /** 事件代码，如 SJ001 */
  Code: string;
  /** 所属包组 */
  Group: number;
  /** 卡牌类型分类 */
  Genre: number;
  /** 优先级数组 */
  Priorities: number[];
  /** 触发条件数组 */
  Occurs: string[];
  /** 寄生条件数组 */
  Parasitism: string[];
  /** 是否单次数组 */
  IsOnce: boolean[];
  /** 是否终止数组 */
  IsTermini: boolean[];
  /** 锁定状态数组 */
  Lock: (boolean | null)[];
  /** 是否阻碍数组 */
  IsHind: boolean[];
  /** 事件描述 */
  Descripe: string;
  /** 特殊效果字典 */
  Special: Record<string, string>;
  /** 事件代码标识 */
  Ofcode: string;
}
