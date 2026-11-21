import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client.js';

function respond(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('returns validated data', async () => {
    respond({ places: [{ name: 'Delhi', region: null, country: 'India', lat: 28.6, lon: 77.2 }] });

    expect(await api.geocode('Delhi')).toMatchObject({
      ok: true,
      data: { places: [{ name: 'Delhi' }] },
    });
  });

  it('passes on the server’s safe error message', async () => {
    respond({ error: 'Too many requests. Please wait a moment and try again.' }, 429);

    expect(await api.geocode('Delhi')).toEqual({
      ok: false,
      status: 429,
      message: 'Too many requests. Please wait a moment and try again.',
    });
  });

  it('rejects responses that do not match the contract', async () => {
    respond({ places: 'none' });

    expect(await api.geocode('Delhi')).toEqual({ ok: false, status: 200, message: null });
  });

  it('reports network failures without a status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );

    expect(await api.geocode('Delhi')).toEqual({ ok: false, status: null, message: null });
  });

  it('reports errors without a readable body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>', { status: 500 }))),
    );

    expect(await api.geocode('Delhi')).toEqual({ ok: false, status: 500, message: null });
  });
});
