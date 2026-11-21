import { describe, expect, it, vi } from 'vitest';
import { computeIndex } from '../../core/aqi.js';
import {
  FIXTURE_NOW,
  airQualityFixture,
  forecastFixture,
  jsonResponse,
  openMeteoFetch,
  requestUrl,
} from '../test/fake-fetch.js';
import { fetchAirData } from './open-meteo.js';

const DELHI = { lat: 28.6, lon: 77.2 };

function deps(fetch: typeof globalThis.fetch, now = FIXTURE_NOW) {
  return { fetch, now: () => now, timeoutMs: 1000, retries: 0 };
}

describe('the current hour', () => {
  it('is found in the location’s local time, east or west of UTC', async () => {
    const westOfUtc = { ...airQualityFixture(), utc_offset_seconds: -18_000 };
    const stub = vi.fn<typeof fetch>((input) =>
      requestUrl(input).host === 'air-quality-api.open-meteo.com'
        ? Promise.resolve(jsonResponse(westOfUtc))
        : openMeteoFetch()(input),
    );
    const delhi = await fetchAirData(DELHI, deps(openMeteoFetch()));
    const west = await fetchAirData(DELHI, deps(stub));

    // 01:00 UTC is 06:30 in Delhi (UTC+5:30) and 20:00 the evening before at UTC−5.
    expect(delhi.ok && delhi.value.hourly[delhi.value.nowIndex]?.time).toBe('2026-11-21T06:00');
    expect(west.ok && west.value.hourly[west.value.nowIndex]?.time).toBe('2026-11-20T20:00');
  });
});

describe('fetchAirData', () => {
  it('merges the recorded Delhi responses into three days of hourly data', async () => {
    const result = await fetchAirData(DELHI, deps(openMeteoFetch()));
    if (!result.ok) {
      throw new Error(result.error);
    }
    const air = result.value;

    expect(air).toMatchObject({
      ...DELHI,
      timezone: 'Asia/Kolkata',
      nowIndex: 30,
    });
    expect(air.hourly).toHaveLength(72);
    expect(air.daylight).toHaveLength(3);
    expect(air.hourly[30]).toMatchObject({ time: '2026-11-21T06:00', hour: 6 });
    expect(air.hourly.every((h) => h.blhM !== null && h.pm25 !== null)).toBe(true);
    expect(computeIndex(air)).toMatchObject({ ok: true, value: { scale: 'naqi' } });
  });

  it('asks both APIs for yesterday plus two days, in local time', async () => {
    const fetch = openMeteoFetch();
    await fetchAirData(DELHI, deps(fetch));
    const urls = fetch.mock.calls.map(([input]) => requestUrl(input));

    expect(urls.map((u) => u.host)).toEqual([
      'air-quality-api.open-meteo.com',
      'api.open-meteo.com',
    ]);
    for (const u of urls) {
      expect(Object.fromEntries(u.searchParams)).toMatchObject({
        latitude: '28.6',
        longitude: '77.2',
        past_days: '1',
        forecast_days: '2',
        timezone: 'auto',
      });
    }
  });

  it('reports stale data when the response does not cover the current hour', async () => {
    const later = new Date('2026-12-01T00:00:00Z');

    expect(await fetchAirData(DELHI, deps(openMeteoFetch(), later))).toEqual({
      ok: false,
      error: 'stale',
    });
  });

  it('fails without air quality, but plans without the weather forecast', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = (host: string) =>
      vi.fn<typeof fetch>((input) =>
        requestUrl(input).host === host
          ? Promise.resolve(jsonResponse({}, 404))
          : openMeteoFetch()(input),
      );

    expect(await fetchAirData(DELHI, deps(failing('air-quality-api.open-meteo.com')))).toEqual({
      ok: false,
      error: 'http',
    });
    const noWeather = await fetchAirData(DELHI, deps(failing('api.open-meteo.com')));
    expect(noWeather.ok && noWeather.value.daylight).toEqual([]);
    expect(noWeather.ok && noWeather.value.hourly.every((h) => h.blhM === null)).toBe(true);
    expect(noWeather.ok && noWeather.value.hourly.some((h) => h.pm25 !== null)).toBe(true);
    expect(warn.mock.calls.map(([line]) => String(line))).toContainEqual(
      expect.stringContaining('Weather forecast unavailable'),
    );
  });

  it('copes with missing weather hours and an incomplete sunset list', async () => {
    const forecast = forecastFixture();
    forecast.hourly.time = forecast.hourly.time.map((t, i) => (i === 30 ? 'gone' : t));
    forecast.daily.sunset = forecast.daily.sunset.slice(0, 2);
    const stub = vi.fn<typeof fetch>((input) =>
      requestUrl(input).host === 'api.open-meteo.com'
        ? Promise.resolve(jsonResponse(forecast))
        : openMeteoFetch()(input),
    );

    const result = await fetchAirData(DELHI, deps(stub));

    expect(result.ok && result.value.hourly[30]?.blhM).toBeNull();
    expect(result.ok && result.value.daylight).toHaveLength(2);
  });

  it('rejects merged data that breaks the air-data contract', async () => {
    const aq = airQualityFixture();
    aq.hourly.pm2_5[0] = -1;
    const stub = vi.fn<typeof fetch>((input) =>
      requestUrl(input).host === 'air-quality-api.open-meteo.com'
        ? Promise.resolve(jsonResponse(aq))
        : openMeteoFetch()(input),
    );

    expect(await fetchAirData(DELHI, deps(stub))).toEqual({
      ok: false,
      error: 'invalid_response',
    });
  });
});
