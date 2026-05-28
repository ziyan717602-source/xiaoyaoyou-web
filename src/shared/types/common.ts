// 通用类型定义

/**
 * 队列结构 - 用于管理卡牌堆、弃牌堆等
 */
export interface Rueue<T> {
  /** 获取队列长度 */
  readonly length: number;
  /** 入队 */
  enqueue(item: T): void;
  /** 出队 */
  dequeue(): T | undefined;
  /** 查看队首元素 */
  peek(): T | undefined;
  /** 清空队列 */
  clear(): void;
  /** 转为数组 */
  toArray(): T[];
}
