import { describe, it, expect } from 'vitest';
import { Rueue } from '../utils/rueue';
import { Diva } from '../utils/diva';
import { PriorityQueue } from '../utils/priority-queue';
import { UFSet } from '../utils/ufset';
import { Algo } from '../utils/algo';

describe('Rueue', () => {
  it('should enqueue and dequeue from head', () => {
    const r = new Rueue<number>();
    r.enqueue(1);
    r.enqueue(2);
    r.enqueue(3);
    expect(r.dequeue()).toBe(1);
    expect(r.dequeue()).toBe(2);
    expect(r.count).toBe(1);
  });

  it('should pushBack to head', () => {
    const r = new Rueue<number>();
    r.pushBack(1);
    r.pushBack(2);
    expect(r.dequeue()).toBe(2);
    expect(r.dequeue()).toBe(1);
  });

  it('should dequeue multiple', () => {
    const r = new Rueue<number>();
    r.enqueue(1);
    r.enqueue(2);
    r.enqueue(3);
    const items = r.dequeue(2) as number[];
    expect(items).toEqual([1, 2]);
    expect(r.count).toBe(1);
  });

  it('should watch head without removing', () => {
    const r = new Rueue<number>();
    r.enqueue(10);
    r.enqueue(20);
    expect(r.watch()).toBe(10);
    expect(r.count).toBe(2);
  });

  it('should remove specific value', () => {
    const r = new Rueue<number>();
    r.enqueue(1);
    r.enqueue(2);
    r.enqueue(3);
    r.remove(2);
    expect(r.count).toBe(2);
    expect(r.toArray()).toEqual([1, 3]);
  });

  it('should intersect', () => {
    const r = new Rueue<number>();
    r.enqueue(1);
    r.enqueue(2);
    r.enqueue(3);
    const result = r.intersect([2, 3, 4]);
    expect(result).toEqual([2, 3]);
  });

  it('should shuffle deterministically with rng', () => {
    const r = new Rueue<number>();
    r.enqueue(1);
    r.enqueue(2);
    r.enqueue(3);
    r.enqueue(4);
    r.enqueue(5);
    let seed = 42;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    r.shuffle(rng);
    // Just verify it's still the same elements
    expect(r.toArray().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('should iterate', () => {
    const r = new Rueue<number>();
    r.enqueue(1);
    r.enqueue(2);
    r.enqueue(3);
    const arr = [...r];
    expect(arr).toEqual([1, 2, 3]);
  });

  it('should initialize from collection', () => {
    const r = new Rueue([10, 20, 30]);
    expect(r.count).toBe(3);
    expect(r.toArray()).toEqual([10, 20, 30]);
  });

  it('should handle pushBackRange', () => {
    const r = new Rueue<number>();
    r.pushBack(1);
    r.pushBackRange([2, 3]);
    expect(r.toArray()).toEqual([3, 2, 1]);
  });
});

describe('Diva', () => {
  it('should set and get values', () => {
    const d = new Diva();
    d.set('key1', 42);
    d.set('key2', 'hello');
    expect(d.getInt('key1')).toBe(42);
    expect(d.getString('key2')).toBe('hello');
  });

  it('should delete key when set to null', () => {
    const d = new Diva();
    d.set('key1', 42);
    d.set('key1', null);
    expect(d.getInt('key1')).toBe(0);
  });

  it('should return defaults for missing keys', () => {
    const d = new Diva();
    expect(d.getInt('missing')).toBe(0);
    expect(d.getString('missing')).toBeNull();
    expect(d.getBool('missing')).toBe(false);
  });

  it('should initialize with key-value pairs', () => {
    const d = new Diva('a', 1, 'b', 2);
    expect(d.getInt('a')).toBe(1);
    expect(d.getInt('b')).toBe(2);
  });

  it('should get or set array lazily', () => {
    const d = new Diva();
    const arr = d.getOrSetArray<number>('arr');
    arr.push(1);
    arr.push(2);
    expect(d.getOrSetArray<number>('arr')).toEqual([1, 2]);
  });

  it('should get or set diva lazily', () => {
    const d = new Diva();
    const inner = d.getOrSetDiva('inner');
    inner.set('x', 10);
    expect(d.getDiva('inner')?.getInt('x')).toBe(10);
  });

  it('should get keys', () => {
    const d = new Diva();
    d.set('a', 1);
    d.set('b', 2);
    expect(d.getKeys()).toEqual(['a', 'b']);
  });

  it('should clear', () => {
    const d = new Diva();
    d.set('a', 1);
    d.clear();
    expect(d.getKeys()).toEqual([]);
  });

  it('should chain set calls', () => {
    const d = new Diva();
    d.set('a', 1).set('b', 2);
    expect(d.getInt('a')).toBe(1);
    expect(d.getInt('b')).toBe(2);
  });
});

describe('PriorityQueue', () => {
  it('should dequeue by priority', () => {
    const pq = new PriorityQueue<string>();
    pq.enqueue('low', 3);
    pq.enqueue('high', 1);
    pq.enqueue('mid', 2);
    expect(pq.dequeue()).toBe('high');
    expect(pq.dequeue()).toBe('mid');
    expect(pq.dequeue()).toBe('low');
  });

  it('should peek without removing', () => {
    const pq = new PriorityQueue<number>();
    pq.enqueue(10, 2);
    pq.enqueue(5, 1);
    expect(pq.peek()).toBe(5);
    expect(pq.count).toBe(2);
  });

  it('should handle empty queue', () => {
    const pq = new PriorityQueue<number>();
    expect(pq.isEmpty).toBe(true);
    expect(pq.count).toBe(0);
  });
});

describe('UFSet', () => {
  it('should union and find', () => {
    const uf = new UFSet<number>();
    uf.union(1, 2);
    uf.union(3, 4);
    uf.union(2, 3);
    expect(uf.find(1)).toBe(uf.find(4));
  });

  it('should check contains', () => {
    const uf = new UFSet<number>();
    uf.find(1);
    expect(uf.contains(1)).toBe(true);
    expect(uf.contains(99)).toBe(false);
  });

  it('should get all in set', () => {
    const uf = new UFSet<number>();
    uf.union(1, 2);
    uf.union(2, 3);
    const all = uf.getAll(1);
    expect(all.sort()).toEqual([1, 2, 3]);
  });
});

describe('Algo', () => {
  it('should shuffle deterministically', () => {
    const arr = [1, 2, 3, 4, 5];
    let seed = 42;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    Algo.shuffle(arr, rng);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('should include check', () => {
    expect(Algo.include(1, 1, 2, 3)).toBe(true);
    expect(Algo.include(4, 1, 2, 3)).toBe(false);
  });

  it('should substring safely', () => {
    expect(Algo.substring('hello', 1, 3)).toBe('el');
    expect(Algo.substring('hello', -1, 3)).toBe('');
    expect(Algo.substring('hello', 1, 100)).toBe('ello');
  });

  it('should split and remove empty', () => {
    expect(Algo.splits('a,,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('should count comma items', () => {
    expect(Algo.countItemFromComma('a,b,c')).toBe(3);
    expect(Algo.countItemFromComma('')).toBe(0);
  });

  it('should add to multi-map', () => {
    const map = new Map<string, number[]>();
    Algo.addToMultiMap(map, 'a', 1);
    Algo.addToMultiMap(map, 'a', 2);
    Algo.addToMultiMap(map, 'a', 1); // duplicate
    expect(map.get('a')).toEqual([1, 2]);
  });

  it('should plus to map', () => {
    const map = new Map<string, number>();
    Algo.plusToMap(map, 'a', 5);
    Algo.plusToMap(map, 'a', 3);
    expect(map.get('a')).toBe(8);
  });

  it('should take range', () => {
    expect(Algo.takeRange([1, 2, 3, 4, 5], 1, 3)).toEqual([2, 3]);
    expect(Algo.takeRange([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });

  it('should repeat to array', () => {
    expect(Algo.repeatToArray(0, 3)).toEqual([0, 0, 0]);
  });

  it('should repeat string', () => {
    expect(Algo.repeatString('ab', 3)).toBe('ababab');
  });

  it('should list to string', () => {
    expect(Algo.listToString([1, 2, 3])).toBe('3,1,2,3');
    expect(Algo.listToString([])).toBe('0');
  });

  it('should check isSubSet', () => {
    expect(Algo.isSubSet([1, 2], [1, 2, 3])).toBe(true);
    expect(Algo.isSubSet([1, 4], [1, 2, 3])).toBe(false);
  });

  it('should pickSomeInRandomOrder', () => {
    const result = Algo.pickSomeInRandomOrder([1, 2, 3, 4, 5], 3);
    expect(result.length).toBe(3);
  });
});
