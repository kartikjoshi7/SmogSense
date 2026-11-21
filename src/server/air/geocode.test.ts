import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, openMeteoFetch, requestUrl } from '../test/fake-fetch.js';
import { searchPlaces } from './geocode.js';

function deps(fetch: typeof globalThis.fetch) {
  return { fetch, timeoutMs: 1000, retries: 0 };
}

describe('searchPlaces', () => {
  it('maps Open-Meteo results to places', async () => {
    const result = await searchPlaces('Gurugram', 'en', deps(openMeteoFetch()));

    expect(result.ok && result.value[0]).toEqual({
      name: 'Gurugram',
      region: 'Haryana',
      country: 'India',
      lat: 28.4601,
      lon: 77.02635,
    });
  });

  it('asks for at most five results for the query, in the interface language', async () => {
    const fetch = openMeteoFetch();
    await searchPlaces('Gurugram', 'en', deps(fetch));
    const url = requestUrl(fetch.mock.calls[0]?.[0]);

    expect(Object.fromEntries(url.searchParams)).toEqual({
      name: 'Gurugram',
      count: '5',
      language: 'en',
      format: 'json',
    });
    await searchPlaces('Gurugram', 'hi', deps(fetch));
    expect(requestUrl(fetch.mock.calls[1]?.[0]).searchParams.get('language')).toBe('hi');
  });

  it('returns no places when nothing matches, with missing labels as null', async () => {
    const none = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ generationtime_ms: 1 })));
    const bare = vi.fn<typeof fetch>(() =>
      Promise.resolve(jsonResponse({ results: [{ name: 'Nowhere', latitude: 1, longitude: 2 }] })),
    );

    expect(await searchPlaces('Zzz', 'en', deps(none))).toEqual({ ok: true, value: [] });
    expect(await searchPlaces('Nowhere', 'en', deps(bare))).toEqual({
      ok: true,
      value: [{ name: 'Nowhere', region: null, country: null, lat: 1, lon: 2 }],
    });
  });

  it('passes on upstream failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const down = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({}, 404)));

    expect(await searchPlaces('Delhi', 'en', deps(down))).toEqual({ ok: false, error: 'http' });
  });
});
