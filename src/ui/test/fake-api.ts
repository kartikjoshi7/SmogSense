import { vi } from 'vitest';
import { createFakeApi, type FakeApiOptions } from './fake-server.js';

/**
 * Stub `fetch` with the fake SmogSense API from `fake-server.ts`. The abort signal stays with
 * the caller: the UI checks it itself when a reply arrives.
 */
export function fakeApi(options: FakeApiOptions = {}) {
  const reply = createFakeApi(options);
  const fetchMock = vi.fn((input: string, init: RequestInit = {}) => {
    const { signal: _signal, ...rest } = init;
    return reply(new Request(new URL(input, 'http://localhost'), rest));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** An in-memory stand-in for localStorage. */
export function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
}
