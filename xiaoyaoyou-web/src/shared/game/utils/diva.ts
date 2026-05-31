/**
 * Diva - Dynamic key-value store
 * Translation of C# PSD.Base.Utils.Diva
 */
export class Diva {
  private store = new Map<string, unknown>();

  constructor(...pairs: unknown[]) {
    for (let i = 0; i < pairs.length; i += 2) {
      const key = pairs[i] as string;
      const value = pairs[i + 1];
      this.set(key, value);
    }
  }

  /** Set a key-value pair. Setting null removes the key. */
  set(key: string, value: unknown): Diva {
    if (value === null || value === undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
    return this;
  }

  getInt(key: string): number {
    const v = this.store.get(key);
    return typeof v === 'number' ? v : 0;
  }

  getUshort(key: string): number {
    return this.getInt(key);
  }

  getString(key: string): string | null {
    const v = this.store.get(key);
    return typeof v === 'string' ? v : null;
  }

  getBool(key: string): boolean {
    const v = this.store.get(key);
    return typeof v === 'boolean' ? v : false;
  }

  getDiva(key: string): Diva | null {
    const v = this.store.get(key);
    return v instanceof Diva ? v : null;
  }

  getOrSetDiva(key: string): Diva {
    const existing = this.getDiva(key);
    if (existing) return existing;
    const diva = new Diva();
    this.store.set(key, diva);
    return diva;
  }

  getObject(key: string): unknown {
    return this.store.get(key) ?? null;
  }

  getUshortArray(key: string): number[] | null {
    const v = this.store.get(key);
    return Array.isArray(v) ? v as number[] : null;
  }

  getOrSetUshortArray(key: string): number[] {
    const existing = this.getUshortArray(key);
    if (existing) return existing;
    const arr: number[] = [];
    this.store.set(key, arr);
    return arr;
  }

  getIntArray(key: string): number[] | null {
    return this.getUshortArray(key);
  }

  getOrSetIntArray(key: string): number[] {
    return this.getOrSetUshortArray(key);
  }

  getStringArray(key: string): string[] | null {
    const v = this.store.get(key);
    return Array.isArray(v) ? v as string[] : null;
  }

  getBoolArray(key: string): boolean[] | null {
    const v = this.store.get(key);
    return Array.isArray(v) ? v as boolean[] : null;
  }

  getDivaArray(key: string): Diva[] | null {
    const v = this.store.get(key);
    return Array.isArray(v) ? v as Diva[] : null;
  }

  getOrSetArray<T>(key: string): T[] {
    const v = this.store.get(key);
    if (Array.isArray(v)) return v as T[];
    const arr: T[] = [];
    this.store.set(key, arr);
    return arr;
  }

  getKeys(): string[] {
    return [...this.store.keys()];
  }

  clear(): void {
    this.store.clear();
  }

  toString(): string {
    const parts: string[] = [];
    for (const [key, value] of this.store) {
      let str: string;
      if (typeof value === 'string') {
        str = `"${value}"`;
      } else if (Array.isArray(value)) {
        str = `[${value}]`;
      } else {
        str = String(value);
      }
      parts.push(`${key}:${str}`);
    }
    return `{${parts.join(',')}}\n`;
  }
}
