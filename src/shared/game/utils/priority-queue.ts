/**
 * PriorityQueue<T> - Priority queue with sorted insertion
 * Translation of C# PSD.Base.Utils.PriorityQueue concept
 */
export class PriorityQueue<T> {
  private items: { value: T; priority: number }[] = [];

  enqueue(value: T, priority: number): void {
    // Insert sorted by priority (lower number = higher priority, like C# version)
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority < this.items[i].priority) {
        this.items.splice(i, 0, { value, priority });
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.items.push({ value, priority });
    }
  }

  dequeue(): T {
    if (this.items.length === 0) throw new Error('PriorityQueue is empty');
    return this.items.shift()!.value;
  }

  peek(): T {
    if (this.items.length === 0) throw new Error('PriorityQueue is empty');
    return this.items[0].value;
  }

  get count(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}
