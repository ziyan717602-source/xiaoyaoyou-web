/**
 * UFSet<T> - Union-Find Set with path compression and union by rank
 * Translation of C# PSD.Base.Utils.UFSet concept
 */
export class UFSet<T> {
  private parent = new Map<T, T>();
  private rank = new Map<T, number>();

  find(x: T): T {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    if (this.parent.get(x) !== x) {
      // Path compression
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: T, y: T): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;

    const rankX = this.rank.get(rootX)!;
    const rankY = this.rank.get(rootY)!;

    // Union by rank
    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  contains(x: T): boolean {
    return this.parent.has(x);
  }

  getAll(x: T): T[] {
    const root = this.find(x);
    const result: T[] = [];
    for (const [key] of this.parent) {
      if (this.find(key) === root) {
        result.push(key);
      }
    }
    return result;
  }
}
