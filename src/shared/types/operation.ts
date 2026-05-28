// Operation 类型定义 - 对应 C# PSD.Base.Operation

/**
 * 操作数据结构
 */
export interface Operation {
  /** 操作名称 */
  Name: string;
  /** 操作代码，如 JN10102 */
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
  /** 操作描述 */
  Descripe: string;
}
