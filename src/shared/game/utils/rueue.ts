/**
 * Rueue<T> - Double-ended queue
 * Translation of C# PSD.Base.Utils.Rueue<T>
 */
export class Rueue<T> {
  private items: T[] = [];

  constructor(collection?: Iterable<T>) {
    if (collection) {
      this.items = [...collection];
    }
  }

  /** Enqueue to tail (addLast) */
  enqueue(value: T): void {
    this.items.push(value);
  }

  /** Enqueue multiple values to tail */
  enqueueRange(values: Iterable<T>): void {
    this.items.push(...values);
  }

  /** Push to head (addFirst) - C# PushBack */
  pushBack(value: T): void {
    this.items.unshift(value);
  }

  /** Push multiple values to head, preserving order */
  pushBackRange(values: Iterable<T>): void {
    const arr = [...values];
    for (let i = 0; i < arr.length; i++) {
      this.items.unshift(arr[i]);
    }
  }

  /** Dequeue from head (removeFirst). If count is provided, dequeue multiple. */
  dequeue(count?: number): T | T[] {
    if (count === undefined) {
      if (this.items.length === 0) throw new Error('Rueue is empty');
      return this.items.shift()!;
    }
    if (count > this.items.length) count = this.items.length;
    return this.items.splice(0, count);
  }

  /** Watch head element. If count is provided, watch multiple. */
  watch(count?: number): T | T[] {
    if (count === undefined) {
      if (this.items.length === 0) throw new Error('Rueue is empty');
      return this.items[0];
    }
    if (count > this.items.length) count = this.items.length;
    return this.items.slice(0, count);
  }

  /** Remove a specific value */
  remove(value: T): void {
    const idx = this.items.indexOf(value);
    if (idx !== -1) this.items.splice(idx, 1);
  }

  /** Intersect with another collection */
  intersect(values: Iterable<T>): T[] {
    const set = new Set(values);
    return this.items.filter(item => set.has(item));
  }

  /** Fisher-Yates shuffle */
  shuffle(rng?: () => number): void {
    const random = rng ?? Math.random;
    let n = this.items.length;
    while (n > 1) {
      n--;
      const k = Math.floor(random() * (n + 1));
      [this.items[n], this.items[k]] = [this.items[k], this.items[n]];
    }
  }

  get count(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): T[] {
    return [...this.items];
  }

  [Symbol.iterator](): Iterator<T> {
    let index = 0;
    const items = this.items;
    return {
      next(): IteratorResult<T> {
        if (index < items.length) {
          return { value: items[index++], done: false };
        }
        return { done: true, value: undefined };
      },
    };
  }
}
