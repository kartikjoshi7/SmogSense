import { describe, it, expect } from 'vitest';
import type { HourlyReading } from '../shared/schemas.js';
import { analyzeInversion } from './inversion.js';

describe('inversion', () => {
  function makeReading(hour: number, blhM: number | null, windKmh: number | null): HourlyReading {
    return {
      time: `2026-11-20T${String(hour).padStart(2, '0')}:00:00Z`,
      hour,
      pm25: 100,
      pm10: 200,
      no2: null,
      o3: null,
      co: null,
      so2: null,
      blhM,
      windKmh,
    };
  }

  it('detects temperature inversion trapping with boundary layer and wind speed', () => {
    // Current at index 0 (hour 0): blh = 150 m (< 200), wind = 3 km/h (< 5) -> trapped
    // Hour 1: blh = 180 m
    // Hour 10: blh = 550 m (>= 500) -> clearsAtHour = 10
    const hourly: HourlyReading[] = [
      makeReading(0, 150, 3),
      makeReading(1, 180, 2),
      makeReading(10, 550, 8),
      makeReading(12, 900, 10),
    ];

    const res = analyzeInversion(hourly, 0);
    expect(res.basis).toBe('boundary_layer');
    expect(res.trappedNow).toBe(true);
    expect(res.clearsAtHour).toBe(10);
    expect(res.minBlhM).toBe(150);
    expect(res.maxBlhM).toBe(900);
  });

  it('is not trapped if boundary layer height is >= 200 m', () => {
    const hourly: HourlyReading[] = [makeReading(0, 250, 2)];
    const res = analyzeInversion(hourly, 0);
    expect(res.trappedNow).toBe(false);
  });

  it('is not trapped if wind speed is >= 5 km/h', () => {
    const hourly: HourlyReading[] = [makeReading(0, 150, 6)];
    const res = analyzeInversion(hourly, 0);
    expect(res.trappedNow).toBe(false);
  });

  it('handles the missing-BLH fallback correctly', () => {
    // Current BLH is null, wind is 3 km/h -> stagnant wind (< 5), basis is wind_only
    const hourlyStagnant: HourlyReading[] = [makeReading(0, null, 3)];
    const resStagnant = analyzeInversion(hourlyStagnant, 0);
    expect(resStagnant.basis).toBe('wind_only');
    expect(resStagnant.trappedNow).toBe(true);
    expect(resStagnant.clearsAtHour).toBeNull();
    expect(resStagnant.minBlhM).toBeNull();
    expect(resStagnant.maxBlhM).toBeNull();

    // Current BLH is null, wind is 7 km/h -> not trapped
    const hourlyBreezy: HourlyReading[] = [makeReading(0, null, 7)];
    const resBreezy = analyzeInversion(hourlyBreezy, 0);
    expect(resBreezy.basis).toBe('wind_only');
    expect(resBreezy.trappedNow).toBe(false);

    // Current BLH is null, wind is null -> not trapped
    const hourlyNullWind: HourlyReading[] = [makeReading(0, null, null)];
    const resNullWind = analyzeInversion(hourlyNullWind, 0);
    expect(resNullWind.basis).toBe('wind_only');
    expect(resNullWind.trappedNow).toBe(false);
  });

  it('returns clearsAtHour null if boundary layer height never clears 500 m', () => {
    const hourly: HourlyReading[] = [
      makeReading(0, 150, 3),
      makeReading(1, 160, 4),
      makeReading(2, 170, 3),
    ];
    const res = analyzeInversion(hourly, 0);
    expect(res.clearsAtHour).toBeNull();
  });

  it('handles out-of-bounds nowIndex gracefully', () => {
    const res = analyzeInversion([], 0);
    expect(res.trappedNow).toBe(false);
    expect(res.basis).toBe('wind_only');
  });

  it('handles null wind in boundary layer basis', () => {
    const hourly: HourlyReading[] = [makeReading(0, 150, null)];
    const res = analyzeInversion(hourly, 0);
    expect(res.trappedNow).toBe(false);
  });
});
