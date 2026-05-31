// Monster 类型定义 - 对应 C# PSD.Base.Card.Monster

import { FiveElement, MonsterLevel } from './enums';

/**
 * 怪物牌数据结构
 */
export interface Monster {
  /** 怪物名称，如"彩依" */
  Name: string;
  /** 怪物代码，如 GS001 */
  Code: string;
  /** 所属包组 */
  Group: number;
  /** 卡牌类型分类 */
  Genre: number;
  /** 五行属性 */
  Element: FiveElement;
  /** 怪物等级 */
  Level: MonsterLevel;
  /** 基础力量 */
  STRb: number;
  /** 基础敏捷 */
  AGLb: number;
  /** 数据库序列号 */
  DBSerial: number;
  /** 出场文本 */
  DebutText: string;
  /** 宠物文本 */
  PetText: string;
  /** 胜利文本 */
  WinText: string;
  /** 失败文本 */
  LoseText: string;
  /** 事件触发条件二维数组 */
  EAOccurs: string[][];
  /** 事件属性二维数组 */
  EAProperties: number[][];
  /** 事件锁定二维数组 */
  EALocks: boolean[][];
  /** 事件单次二维数组 */
  EAOnces: boolean[][];
  /** 事件终止二维数组 */
  EAIsTermini: boolean[][];
  /** 事件阻碍二维数组 */
  EAHinds: boolean[][];
}
