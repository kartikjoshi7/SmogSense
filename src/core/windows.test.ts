import { describe, expect, it } from 'vitest';
import { makeAir } from './fixtures/air.js';
import { bestActivityWindow, hourDistance, isDaylight, ventilationHour } from './windows.js';

const daylight = [{ sunrise: '2026-11-20T06:52', sunset: '2026-11-20T17:28' }];

describe('isDaylight', () => {
  it('is true between sunrise and sunset only', () => {
    expect(isDaylight('2026-11-20T06:00', daylight)).toBe(false);
    expect(isDaylight('2026-11-20T07:00', daylight)).toBe(true);
    expect(isDaylight('2026-11-20T17:00', daylight)).toBe(true);
    expect(isDaylight('2026-11-20T18:00', daylight)).toBe(false);
  });
});

describe('hourDistance', () => {
  it('goes the short way round the clock', () => {
    expect(hourDistance(6, 14)).toBe(8);
    expect(hourDistance(23, 1)).toBe(2);
    expect(hourDistance(5, 5)).toBe(0);
  });
});

describe('bestActivityWindow', () => {
  it('moves a 6 am walk to the cleanest daylight hour, 14:00, with 56% less PM2.5', () => {
    const air = makeAir();
    const result = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: air.daylight,
      durationMin: 30,
      usualHour: 6,
    });

    expect(result).toEqual({ startHour: 14, meanPm25: 58, usualMeanPm25: 132, reductionPct: 56 });
  });

  it('averages every hour a longer session covers', () => {
    const air = makeAir();
    const result = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: air.daylight,
      durationMin: 90,
      usualHour: 6,
    });

    expect(result).toMatchObject({ startHour: 14, meanPm25: 60.5 });
  });

  it('breaks ties in favour of the hour closest to the usual time', () => {
    const air = makeAir({ pm25Day: Array<number>(24).fill(80) });
    const result = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: air.daylight,
      durationMin: 60,
      usualHour: 16,
    });

    expect(result).toMatchObject({ startHour: 16, reductionPct: 0 });
  });

  it('keeps the earliest hour on a tie when there is no usual hour', () => {
    const air = makeAir({ pm25Day: Array<number>(24).fill(80) });

    expect(ventilationHour(air.hourly, air.nowIndex, air.daylight)).toEqual({ hour: 7, pm25: 80 });
  });

  it('skips windows with missing hours and reports no comparison when the usual hour is missing', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h === 6 || h === 14 ? null : 100 - h));
    const air = makeAir({ pm25Day });
    const result = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: air.daylight,
      durationMin: 30,
      usualHour: 6,
    });

    expect(result).toEqual({
      startHour: 17,
      meanPm25: 83,
      usualMeanPm25: null,
      reductionPct: null,
    });
  });

  it('reports no reduction when the usual hour is already perfectly clean', () => {
    const air = makeAir({ pm25Day: Array<number>(24).fill(0) });
    const result = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: air.daylight,
      durationMin: 30,
      usualHour: 6,
    });

    expect(result?.reductionPct).toBeNull();
  });

  it('returns null when no daylight falls in the next 24 hours', () => {
    const air = makeAir();

    expect(
      bestActivityWindow(air.hourly, {
        fromIndex: air.nowIndex,
        daylight: [],
        durationMin: 30,
        usualHour: 6,
      }),
    ).toBeNull();
    expect(ventilationHour(air.hourly, air.nowIndex, [])).toBeNull();
  });
});
