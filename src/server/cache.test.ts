import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './cache.js';

function cache(maxEntries = 3) {
  let time = 0;
  const instance = new TtlCache<string>({ maxEntries, ttlMs: 100, now: () => time });
  return {
    instance,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('TtlCache', () => {
  it('returns stored values until they expire', () => {
    const { instance, advance } = cache();
    instance.set('a', 'apple');

    advance(99);
    expect(instance.get('a')).toBe('apple');
    advance(1);
    expect(instance.get('a')).toBeUndefined();
  });

  it('loads on a miss and keeps only the values it is told to keep', async () => {
    const { instance } = cache();
    const load = vi.fn((value: string) => () => Promise.resolve(value));

    expect(await instance.getOrLoad('a', load('kept'), () => true)).toBe('kept');
    expect(await instance.getOrLoad('a', load('ignored'), () => true)).toBe('kept');
    expect(await instance.getOrLoad('b', load('dropped'), () => false)).toBe('dropped');
    expect(instance.get('b')).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('evicts the least recently used entry when full', () => {
    const { instance } = cache(2);
    instance.set('a', 'apple');
    instance.set('b', 'banana');
    instance.get('a');
    instance.set('c', 'cherry');

    expect(instance.get('a')).toBe('apple');
    expect(instance.get('b')).toBeUndefined();
    expect(instance.get('c')).toBe('cherry');
  });

  it('refreshes the expiry when a key is stored again', () => {
    const { instance, advance } = cache();
    instance.set('a', 'apple');
    advance(80);
    instance.set('a', 'apricot');
    advance(80);

    expect(instance.get('a')).toBe('apricot');
  });
});
