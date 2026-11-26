import { describe, expect, it } from 'vitest';
import { makeAir } from './fixtures/air.js';
import {
  activityMeanPm25,
  bestActivityWindow,
  roundTripMeanPm25,
  ventilationHour,
} from './windows.js';

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

  it('only starts inside daylight, counting an hour that begins before sunset', () => {
    // Sunrise 06:52 and sunset 17:28: 06:00 and 18:00 are dark however clean they are.
    const pm25Day = Array.from(
      { length: 24 },
      (_, h) => ({ 6: 1, 18: 1, 7: 40, 17: 40 })[h] ?? 100,
    );
    const air = makeAir({ pm25Day });
    const search = { fromIndex: air.nowIndex, daylight: air.daylight, durationMin: 60 };

    expect(bestActivityWindow(air.hourly, { ...search, usualHour: 6 })?.startHour).toBe(7);
    expect(bestActivityWindow(air.hourly, { ...search, usualHour: 16 })?.startHour).toBe(17);
  });

  it('measures closeness to the usual hour the short way round the clock', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h === 1 || h === 20 ? 10 : 100));
    const air = makeAir({ pm25Day });
    const allDay = [{ sunrise: air.hourly[0]?.time ?? '', sunset: air.hourly.at(-1)?.time ?? '' }];
    const result = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: allDay,
      durationMin: 60,
      usualHour: 23,
    });

    // 01:00 is two hours from 23:00 via midnight; 20:00 is three hours back.
    expect(result?.startHour).toBe(1);
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

describe('activityMeanPm25', () => {
  it('gives the same session mean the plan’s best window reports', () => {
    const air = makeAir();
    const best = bestActivityWindow(air.hourly, {
      fromIndex: air.nowIndex,
      daylight: air.daylight,
      durationMin: 90,
      usualHour: 6,
    });
    const start = air.hourly.findIndex((h, i) => i >= air.nowIndex && h.hour === best?.startHour);

    expect(activityMeanPm25(air.hourly, start, 90)).toBe(best?.meanPm25);
  });

  it('is null when the session runs past the readings or over a missing hour', () => {
    const air = makeAir({ pm25Day: Array.from({ length: 24 }, (_, h) => (h === 9 ? null : 50)) });
    const last = air.hourly.length - 1;

    expect(activityMeanPm25(air.hourly, last, 30)).toBe(50);
    expect(activityMeanPm25(air.hourly, last, 90)).toBeNull();
    expect(
      activityMeanPm25(
        air.hourly,
        air.hourly.findIndex((h) => h.hour === 8),
        120,
      ),
    ).toBeNull();
  });
});

describe('roundTripMeanPm25', () => {
  const trip = { departHour: 8, returnHour: 18, tripMin: 45 };

  it('averages the air at the usual hour of each leg (145 at 08:00, 136 at 18:00)', () => {
    expect(roundTripMeanPm25(makeAir(), trip, 125.6)).toBe(140.5);
  });

  it('uses the fallback when a leg starts at an hour with no reading', () => {
    const air = makeAir();
    const gap = {
      ...air,
      hourly: air.hourly.map((r) => (r.hour === 18 ? { ...r, pm25: null } : r)),
    };

    expect(roundTripMeanPm25(gap, trip, 125.6)).toBe(125.6);
  });

  it('uses the fallback when the forecast ends before a leg starts', () => {
    const air = makeAir();
    const short = { ...air, hourly: air.hourly.slice(0, air.nowIndex + 6) };

    expect(roundTripMeanPm25(short, trip, 125.6)).toBe(125.6);
  });
});
