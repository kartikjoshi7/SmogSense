import { describe, expect, it, vi } from 'vitest';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { api } from './client.js';

function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn((_path: string, _init?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api client', () => {
  it('returns validated data', async () => {
    const fetchMock = respond({
      places: [{ name: 'Delhi', region: null, country: 'India', lat: 28.6, lon: 77.2 }],
    });

    expect(await api.geocode('Delhi', 'hi')).toMatchObject({
      ok: true,
      value: { places: [{ name: 'Delhi' }] },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/geocode?q=Delhi&lang=hi');
  });

  it('reports the status of an error response', async () => {
    respond({ error: 'Too many requests. Please wait a moment and try again.' }, 429);

    expect(await api.geocode('Delhi', 'en')).toEqual({ ok: false, error: { status: 429 } });
  });

  it('rejects responses that do not match the contract', async () => {
    respond({ places: 'none' });

    expect(await api.geocode('Delhi', 'en')).toEqual({ ok: false, error: { status: null } });
  });

  it('reports network failures without a status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );

    expect(await api.geocode('Delhi', 'en')).toEqual({ ok: false, error: { status: null } });
  });

  it('reports a success status with an unreadable body as no answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>', { status: 200 }))),
    );

    expect(await api.geocode('Delhi', 'en')).toEqual({ ok: false, error: { status: null } });
  });

  it('posts JSON and passes the abort signal through', async () => {
    const fetchMock = respond({ error: 'Busy' }, 503);
    const controller = new AbortController();

    await api.plan(
      { profile: SHARMA_FAMILY, location: { lat: 28.6, lon: 77.2 } },
      controller.signal,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/plan',
      expect.objectContaining({ method: 'POST', signal: controller.signal }),
    );
  });
});
