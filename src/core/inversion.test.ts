import { describe, expect, it } from 'vitest';
import { makeAir } from './fixtures/air.js';
import { analyzeInversion } from './inversion.js';

describe('analyzeInversion', () => {
  it('detects a trapped morning and when daytime mixing clears it', () => {
    const air = makeAir({ nowHour: 6 });

    expect(analyzeInversion(air.hourly, air.nowIndex)).toEqual({
      trappedNow: true,
      clearsAtHour: 12,
      minBlhM: 10,
      maxBlhM: 640,
      basis: 'boundary_layer',
    });
  });

  it('calls a very low boundary layer trapped even with a breeze or no wind data', () => {
    const air = makeAir({ nowHour: 6 });
    const breezy = air.hourly.map((h) => ({ ...h, windKmh: 8 }));
    const noWind = air.hourly.map((h) => ({ ...h, windKmh: null }));

    expect(analyzeInversion(breezy, air.nowIndex).trappedNow).toBe(true);
    expect(analyzeInversion(noWind, air.nowIndex).trappedNow).toBe(true);
  });

  it('is not trapped once the boundary layer has risen', () => {
    const air = makeAir({ nowHour: 14 });

    expect(analyzeInversion(air.hourly, air.nowIndex)).toMatchObject({ trappedNow: false });
  });

  it('reports no clearing when the boundary layer stays low', () => {
    const air = makeAir({ blhDay: Array<number>(24).fill(50) });

    expect(analyzeInversion(air.hourly, air.nowIndex)).toMatchObject({
      trappedNow: true,
      clearsAtHour: null,
    });
  });

  it('falls back to wind speed alone without boundary-layer data', () => {
    const air = makeAir({ blhDay: null });

    expect(analyzeInversion(air.hourly, air.nowIndex)).toEqual({
      trappedNow: true,
      clearsAtHour: null,
      minBlhM: null,
      maxBlhM: null,
      basis: 'wind_only',
    });
  });

  it('says there is no basis past the end of the data or without any weather data', () => {
    const air = makeAir();
    const noWeather = air.hourly.map((h) => ({ ...h, blhM: null, windKmh: null }));

    expect(analyzeInversion(air.hourly, air.hourly.length)).toMatchObject({
      trappedNow: false,
      basis: 'none',
    });
    expect(analyzeInversion(noWeather, air.nowIndex)).toMatchObject({
      trappedNow: false,
      basis: 'none',
    });
  });
});
