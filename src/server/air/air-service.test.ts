import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_NOW, jsonResponse, openMeteoFetch, requestUrl } from '../test/fake-fetch.js';
import { createAirService } from './air-service.js';

function service(fetch: typeof globalThis.fetch) {
  let now = FIXTURE_NOW;
  return {
    air: createAirService({ fetch, now: () => now }),
    advanceMinutes: (minutes: number) => {
      now = new Date(now.getTime() + minutes * 60_000);
    },
  };
}

describe('location privacy', () => {
  it('rounds to 0.1° so precise GPS positions are never sent upstream', async () => {
    const fetch = openMeteoFetch();
    await service(fetch).air.getAir({ lat: 28.61394, lon: 77.20902 });

    const sent = requestUrl(fetch.mock.calls[0]?.[0]);
    expect([sent.searchParams.get('latitude'), sent.searchParams.get('longitude')]).toEqual([
      '28.6',
      '77.2',
    ]);
  });
});

describe('createAirService', () => {
  it('serves repeat requests for the same area and hour from the cache', async () => {
    const fetch = openMeteoFetch();
    const { air } = service(fetch);

    await air.getAir({ lat: 28.61, lon: 77.21 });
    const second = await air.getAir({ lat: 28.62, lon: 77.19 });

    expect(second).toMatchObject({ ok: true, value: { lat: 28.6, lon: 77.2 } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('never serves a past hour as "now": in India the local hour turns at :30 UTC', async () => {
    const fetch = openMeteoFetch();
    const { air, advanceMinutes } = service(fetch);
    advanceMinutes(20); // 06:50 in Delhi
    const before = await air.getAir({ lat: 28.6, lon: 77.2 });
    advanceMinutes(13); // 07:03 in Delhi: within 15 minutes, but a new local hour
    const after = await air.getAir({ lat: 28.6, lon: 77.2 });
    if (!before.ok || !after.ok) {
      throw new Error('expected air data');
    }

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(before.value.hourly[before.value.nowIndex]?.time).toBe('2026-11-21T06:00');
    expect(after.value.hourly[after.value.nowIndex]?.time).toBe('2026-11-21T07:00');
  });

  it('fetches again once the cached data has expired', async () => {
    const fetch = openMeteoFetch();
    const { air, advanceMinutes } = service(fetch);

    await air.getAir({ lat: 28.6, lon: 77.2 });
    advanceMinutes(16);
    await air.getAir({ lat: 28.6, lon: 77.2 });

    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not cache failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const down = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({}, 404)));
    const { air } = service(down);

    await air.getAir({ lat: 28.6, lon: 77.2 });
    await air.getAir({ lat: 28.6, lon: 77.2 });

    expect(down).toHaveBeenCalledTimes(4);
  });

  it('caches place searches regardless of letter case, per language', async () => {
    const fetch = openMeteoFetch();
    const { air } = service(fetch);

    await air.searchPlaces('Gurugram', 'en');
    const again = await air.searchPlaces('GURUGRAM', 'en');
    await air.searchPlaces('Gurugram', 'hi');

    expect(again.ok && again.value[0]?.name).toBe('Gurugram');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
