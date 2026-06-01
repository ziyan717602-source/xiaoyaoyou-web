// Hero 类型定义 - 对应 C# PSD.Base.Card.Hero

/**
 * 角色牌数据结构
 */
export interface Hero {
  /** 角色名称，如"韩菱纱" */
  Name: string;
  /** 头像编号，如 10502 */
  Avatar: number;
  /** 所属包组，如 1 为标准包，0 为测试，2 为 SP 等 */
  Group: number;
  /** 卡牌类型分类 */
  Genre: number;
  /** 性别，M 或 F */
  Gender: string;
  /** 生命值 */
  HP: number;
  /** 力量 */
  STR: number;
  /** 敏捷 */
  DEX: number;
  /** 技能列表 */
  Skills: string[];
  /** 关联技能列表（如 JNT0701->[JNT0703]） */
  RelatedSkills: string[];
  /** 配偶列表（如 {30501,!2}） */
  Spouses: string[];
  /** 同形列表（如 XJ304.Isomorphic = XJ303） */
  Isomorphic: number[];
  /** 原型角色编号（如 SP001.Archetype = XJ101） */
  Archetype: number;
  /** 前辈角色编号（如 RM202.Antecessor = XJ202） */
  Antecessor: number;
  /** 先驱角色编号（如 XJ202.Pioneer = RM202） */
  Pioneer: number;
  /** 角色代码，如 XJ101 */
  Ofcode: string;
  /** 传记标签（如 "A", "BK" 等，用于倾慕条件匹配） */
  Bio: string;
  /** Token 别名 */
  TokenAlias: string;
  /** 人物别名 */
  PeopleAlias: string;
  /** 玩家目标别名 */
  PlayerTarAlias: string;
  /** 扩展卡牌别名 */
  ExCardsAlias: string;
  /** 觉醒别名 */
  AwakeAlias: string;
  /** 文件夹别名 */
  FolderAlias: string;
  /** 客人别名 */
  GuestAlias: string;
}
