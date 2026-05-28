// Tux 类型定义 - 对应 C# PSD.Base.Card.Tux

import { TuxType } from './enums';

/**
 * 基础装备牌数据结构
 */
export interface Tux {
  /** 装备名称，如"天玄五音" */
  Name: string;
  /** 装备代码，如 JP06 */
  Code: string;
  /** 装备类型 */
  Type: TuxType;
  /** 卡牌类型分类 */
  Genre: number;
  /** 所属包组列表 */
  Package: number[];
  /** 编号范围列表（如 [1, 2, 82, 84] 表示 1~2 在包1，82~84 在包4） */
  Range: number[];
  /** 描述文本 */
  Description: string;
  /** 特殊效果字典 */
  Special: Record<string, string>;
  /** 优先级数组 */
  Priorities: number[];
  /** 触发条件数组 */
  Occurs: string[];
  /** 寄生条件数组 */
  Parasitism: string[];
  /** 目标数组 */
  Targets: string[];
  /** 是否终止数组 */
  IsTermini: boolean[];
}

/**
 * 装备牌（可穿戴）- 继承自 Tux，对应 C# TuxEqiup
 * 注意：C# 中拼写为 TuxEqiup，TypeScript 中修正为 TuxEquip
 */
export interface TuxEquip extends Tux {
  /** 力量增量 */
  IncrOfSTR: number;
  /** 敏捷增量 */
  IncrOfDEX: number;
  /** 单一入口编号 */
  SingleEntry: number;
  /** 消耗优先级二维数组 */
  CsPriorites: number[][];
  /** 消耗触发条件二维数组 */
  CsOccur: string[][];
  /** 消耗锁定二维数组 */
  CsLock: boolean[][];
  /** 消耗单次二维数组 */
  CsOnce: boolean[][];
  /** 消耗终止二维数组 */
  CsIsTermini: boolean[][];
  /** 消耗阻碍二维数组 */
  CsHind: boolean[][];
}

/**
 * 行囊装备 - 继承自 TuxEquip，对应 C# Luggage
 */
export interface Luggage extends TuxEquip {
  /** 容量列表（如 "C","M","E" 等） */
  Capacities: string[];
  /** 是否正在拉取货物 */
  Pull: boolean;
}

/**
 * 幻象装备 - 继承自 TuxEquip，对应 C# Illusion
 */
export interface Illusion extends TuxEquip {
  /** 当前幻象展示内容，null 或空表示自身 */
  ILAS: string | null;
}
