/**
 * Algo - Static utility algorithms
 * Translation of C# PSD.Base.Utils.Algo
 */
export class Algo {
  /** Fisher-Yates shuffle */
  static shuffle<T>(list: T[], rng?: () => number): void {
    const random = rng ?? Math.random;
    let n = list.length;
    while (n > 1) {
      n--;
      const k = Math.floor(random() * (n + 1));
      [list[n], list[k]] = [list[k], list[n]];
    }
  }

  /** Pick some items in random order, up to maxCount */
  static pickSomeInRandomOrder<T>(items: Iterable<T>, maxCount: number): T[] {
    const arr = [...items];
    const randomSortTable = new Map<number, T>();
    for (const item of arr) {
      randomSortTable.set(Math.random(), item);
    }
    return [...randomSortTable.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, maxCount)
      .map(entry => entry[1]);
  }

  /** Check if object is one of the options */
  static include(object: unknown, ...options: unknown[]): boolean {
    return options.includes(object);
  }

  /** Safe substring extraction */
  static substring(content: string, start: number, end: number): string {
    if (start < 0) return '';
    if (end < 0) return start < content.length ? content.substring(start) : '';
    return start < end ? content.substring(start, end) : '';
  }

  /** Split string by separator, removing empty entries */
  static splits(line: string, separator: string): string[] {
    return line.split(separator).filter(s => s.length > 0);
  }

  /** Count comma-separated items */
  static countItemFromComma(line: string): number {
    if (!line) return 0;
    return line.split(',').length;
  }

  /** Add value to a multi-map (key -> list) */
  static addToMultiMap<K, V>(dict: Map<K, V[]>, key: K, value: V): void {
    const existing = dict.get(key);
    if (existing) {
      if (!existing.includes(value)) {
        existing.push(value);
      }
    } else {
      dict.set(key, [value]);
    }
  }

  /** Add value to a unique multi-map (key -> set) */
  static addToUniqueMultiMap<K, V>(dict: Map<K, Set<V>>, key: K, value: V): void {
    const existing = dict.get(key);
    if (existing) {
      existing.add(value);
    } else {
      const set = new Set<V>();
      set.add(value);
      dict.set(key, set);
    }
  }

  /** Add delta to a counter map */
  static plusToMap<K>(dict: Map<K, number>, key: K, delta: number): void {
    const existing = dict.get(key);
    dict.set(key, (existing ?? 0) + delta);
  }

  /** Take a range from an array */
  static takeRange<T>(blocks: T[], start: number, end?: number): T[] {
    if (end === undefined) end = blocks.length;
    if (end === -1) end = blocks.length;
    if (start <= end && end <= blocks.length) {
      return blocks.slice(start, end);
    }
    return [];
  }

  /** Take array with size prefix (ushort version) */
  static takeArrayWithSize(blocks: number[], start: number): { result: number[]; next: number } {
    const n = blocks[start];
    return {
      result: Algo.takeRange(blocks, start + 1, start + 1 + n),
      next: start + n + 1,
    };
  }

  /** Repeat a string n times */
  static repeatString(str: string, times: number): string {
    let result = '';
    for (let i = 0; i < times; i++) {
      result += str;
    }
    return result;
  }

  /** Repeat a value to create an array */
  static repeatToArray<T>(value: T, count: number): T[] {
    const arr: T[] = [];
    for (let i = 0; i < count; i++) {
      arr.push(value);
    }
    return arr;
  }

  /** Serialize collection to comma-separated string with count prefix */
  static listToString<T>(list: Iterable<T>): string {
    const arr = [...list];
    if (arr.length === 0) return '0';
    return arr.length + ',' + arr.join(',');
  }

  /** Remove value from a multi-map */
  static removeFromMultiMap<K, T>(map: Map<K, T[]>, key: K, value: T): void {
    const list = map.get(key);
    if (list) {
      const idx = list.indexOf(value);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) map.delete(key);
    }
  }

  /** Remove value from a multi-map by predicate */
  static removeFromMultiMapBy<K, T>(map: Map<K, T[]>, key: K, match: (item: T) => boolean): void {
    const list = map.get(key);
    if (list) {
      const filtered = list.filter(item => !match(item));
      if (filtered.length === 0) {
        map.delete(key);
      } else {
        map.set(key, filtered);
      }
    }
  }

  /** Check if subset is contained in set */
  static isSubSet<T>(subset: Iterable<T>, set: Iterable<T>): boolean {
    const setArr = [...set];
    const subsetArr = [...subset];
    return subsetArr.every(item => setArr.includes(item));
  }

  /** Check if two 2D arrays are equal at given indices */
  static equals2D<T>(arrays: T[][], idx: number, jdx: number, expected: T): boolean {
    if (idx >= arrays.length) return false;
    if (jdx >= (arrays[idx]?.length ?? 0)) return false;
    return arrays[idx][jdx] === expected;
  }

  /** Try to get a non-empty string from a map */
  static tryNotEmpty(map: Map<string, unknown>, key: string): boolean {
    return map.has(key) && map.get(key) !== '';
  }

  /** Parse long message format (simplified version) */
  static longMessageParse(
    lines: string[],
    setWho: (who: number) => void,
    assign: (who: number, key: string, value: unknown) => void,
    keys: string[],
  ): void {
    let idx = 1;
    while (idx < lines.length) {
      const who = parseInt(lines[idx++], 10);
      setWho(who);
      for (const keyDef of keys) {
        const serp = keyDef.indexOf(',');
        const ktype = keyDef.substring(0, serp);
        const kname = keyDef.substring(serp + 1);
        if (ktype === 'LA') {
          const n = parseInt(lines[idx++], 10);
          const values = Algo.takeRange(lines, idx, idx + n);
          assign(who, kname, values);
          idx += n;
        } else if (ktype === 'LU') {
          const { result, next } = Algo.takeArrayWithSize(lines.map(Number), idx);
          assign(who, kname, result);
          idx = next;
        } else if (ktype === 'LI') {
          const n = parseInt(lines[idx++], 10);
          const values = Algo.takeRange(lines, idx, idx + n).map(p => parseInt(p, 10));
          assign(who, kname, values);
          idx += n;
        } else if (ktype.startsWith('LC')) {
          const n = parseInt(ktype.substring('LC'.length), 10);
          const values = Algo.takeRange(lines, idx, idx + n).map(p => parseInt(p, 10));
          assign(who, kname, values);
          idx += n;
        } else if (ktype === 'LD') {
          const n = parseInt(lines[idx++], 10) * 2;
          const values = Algo.takeRange(lines, idx, idx + n);
          assign(who, kname, values);
          idx += n;
        } else if (ktype === 'U') {
          assign(who, kname, parseInt(lines[idx++], 10));
        } else if (ktype === 'I') {
          assign(who, kname, parseInt(lines[idx++], 10));
        } else if (ktype === 'A') {
          assign(who, kname, lines[idx++]);
        }
      }
    }
  }
}
