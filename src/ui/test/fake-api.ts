import { vi } from 'vitest';
import { fakeReply, type FakeApiOptions } from './fake-server.js';

function pathOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return new URL(input, 'http://localhost').pathname;
  }
  return input instanceof URL ? input.pathname : new URL(input.url).pathname;
}

/** Stub `fetch` with the fake SmogSense API from `fake-server.ts`. */
export function fakeApi(options: FakeApiOptions = {}) {
  const fetchMock = vi.fn((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    const reply = fakeReply(pathOf(input), body, options);
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
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
