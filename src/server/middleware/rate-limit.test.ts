import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { rateLimit } from './rate-limit.js';

function app(options: { limit: number; maxClients?: number }) {
  let now = 0;
  const instance = new Hono()
    .use(rateLimit({ windowMs: 60_000, maxClients: 100, now: () => now, ...options }))
    .get('/', (c) => c.text('ok'));
  return {
    request: (ip?: string) =>
      instance.request('/', { headers: ip === undefined ? {} : { 'x-forwarded-for': ip } }),
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('rateLimit', () => {
  it('allows requests up to the limit, then answers 429 with Retry-After', async () => {
    const { request, advance } = app({ limit: 2 });
    await request('1.1.1.1');
    advance(10_000);
    await request('1.1.1.1');
    const blocked = await request('1.1.1.1');

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('50');
    expect(await blocked.json()).toEqual({
      error: 'Too many requests. Please wait a moment and try again.',
    });
  });

  it('lets requests through again once the window has passed', async () => {
    const { request, advance } = app({ limit: 1 });
    await request('1.1.1.1');
    advance(60_001);

    expect((await request('1.1.1.1')).status).toBe(200);
  });

  it('counts each client separately, using the first forwarded address', async () => {
    const { request } = app({ limit: 1 });
    await request('1.1.1.1, 10.0.0.1');

    expect((await request('2.2.2.2')).status).toBe(200);
    expect((await request('1.1.1.1')).status).toBe(429);
  });

  it('groups requests without a forwarded address together', async () => {
    const { request } = app({ limit: 1 });
    await request();

    expect((await request('')).status).toBe(429);
  });

  it('forgets the least recent client when tracking too many', async () => {
    const { request } = app({ limit: 1, maxClients: 1 });
    await request('1.1.1.1');
    await request('2.2.2.2');

    expect((await request('1.1.1.1')).status).toBe(200);
  });
});
