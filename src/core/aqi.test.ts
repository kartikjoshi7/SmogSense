import { describe, expect, it } from 'vitest';
import { computeIndex } from './aqi.js';
import { makeAir } from './fixtures/air.js';

/** The headline index for a day of constant concentrations, in India or elsewhere. */
function steadyDay(pm25: number, options: { readonly pm10?: number; readonly us?: boolean } = {}) {
  const result = computeIndex(
    makeAir({
      pm25Day: Array<number>(24).fill(pm25),
      pm10Day: options.pm10 === undefined ? null : Array<number>(24).fill(options.pm10),
      timezone: options.us === true ? 'America/New_York' : 'Asia/Kolkata',
    }),
  );
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('sub-indexes at the official breakpoints', () => {
  it.each([
    [0, 0],
    [30, 50],
    [30.5, 52],
    [60, 100],
    [90, 200],
    [120, 300],
    [250, 400],
    [380, 500],
    [450, 500],
  ])('NAQI PM2.5 %d µg/m³ → %d', (concentration, expected) => {
    expect(steadyDay(concentration).value).toBe(expected);
  });

  it.each([
    [50, 50],
    [100, 100],
    [250, 200],
    [350, 300],
    [430, 400],
    [510, 500],
    [600, 500],
  ])('NAQI PM10 %d µg/m³ → %d', (concentration, expected) => {
    expect(steadyDay(0, { pm10: concentration }).value).toBe(expected);
  });

  it.each([
    [9.0, 50],
    [9.1, 51],
    [12, 56],
    [35.4, 100],
    [35.5, 101],
    [55.4, 150],
    [55.5, 151],
    [125.4, 200],
    [125.5, 201],
    [225.4, 300],
    [225.5, 301],
    [325.4, 500],
  ])('US AQI PM2.5 %d µg/m³ → %d (Feb 2024 breakpoints)', (concentration, expected) => {
    expect(steadyDay(concentration, { us: true }).value).toBe(expected);
  });

  it.each([
    [54, 50],
    [55, 51],
    [154, 100],
    [155, 101],
    [254, 150],
    [255, 151],
    [354, 200],
    [355, 201],
    [424, 300],
    [425, 301],
    [604, 500],
  ])('US AQI PM10 %d µg/m³ → %d', (concentration, expected) => {
    expect(steadyDay(0, { pm10: concentration, us: true }).value).toBe(expected);
  });
});

describe('categories', () => {
  it('maps index values to their band and category on each scale', () => {
    expect(steadyDay(0)).toMatchObject({ band: 0, category: 'good' });
    expect(steadyDay(125)).toMatchObject({ value: 305, band: 4, category: 'very_poor' });
    expect(steadyDay(55.4, { us: true })).toMatchObject({
      band: 2,
      category: 'unhealthy_sensitive',
    });
  });

  it('keeps values beyond the table in the worst band', () => {
    expect(steadyDay(900, { us: true })).toMatchObject({
      value: 500,
      band: 5,
      category: 'hazardous',
    });
  });
});

describe('scale choice', () => {
  it.each([
    ['Asia/Kolkata', 'naqi'],
    ['Asia/Calcutta', 'naqi'],
    ['Europe/London', 'us_aqi'],
    ['America/New_York', 'us_aqi'],
    ['Asia/Dhaka', 'us_aqi'],
  ] as const)('%s uses %s', (timezone, expected) => {
    expect(computeIndex(makeAir({ timezone }))).toMatchObject({ value: { scale: expected } });
  });
});

describe('computeIndex', () => {
  it('rates a Delhi winter day as NAQI Very Poor from the trailing 24-hour mean', () => {
    const result = computeIndex(makeAir());

    expect(result).toEqual({
      ok: true,
      value: { scale: 'naqi', value: 305, band: 4, category: 'very_poor', pm25Mean24h: 125.6 },
    });
  });

  it('rates the same pattern at 2.4× as Severe', () => {
    const result = computeIndex(makeAir({ scale: 2.4 }));

    expect(result.ok && result.value).toMatchObject({ value: 440, band: 5, category: 'severe' });
  });

  it('uses the US AQI outside India', () => {
    const air = makeAir({
      pm25Day: Array<number>(24).fill(12),
      timezone: 'Europe/London',
    });

    expect(computeIndex(air)).toEqual({
      ok: true,
      value: { scale: 'us_aqi', value: 56, band: 1, category: 'moderate', pm25Mean24h: 12 },
    });
  });

  it('truncates US PM2.5 to one decimal before the lookup', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h % 2 === 0 ? 35.4 : 35.5));
    const air = makeAir({ pm25Day, timezone: 'America/Denver' });

    expect(computeIndex(air).ok && computeIndex(air)).toMatchObject({ value: { value: 100 } });
  });

  it('lets PM10 set the index when it is worse than PM2.5', () => {
    const air = makeAir({
      pm25Day: Array<number>(24).fill(20),
      pm10Day: Array<number>(24).fill(300),
    });

    expect(computeIndex(air)).toMatchObject({ value: { value: 251, category: 'poor' } });
  });

  it('ignores PM10 with fewer than 16 valid hours', () => {
    const pm10Day = Array.from({ length: 24 }, (_, h) => (h < 10 ? 500 : null));
    const air = makeAir({ pm25Day: Array<number>(24).fill(20), pm10Day });

    expect(computeIndex(air)).toMatchObject({ value: { value: 33, category: 'good' } });
  });

  it('reports insufficient data with fewer than 16 valid PM2.5 hours', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h < 9 ? null : 100));

    expect(computeIndex(makeAir({ pm25Day }))).toEqual({ ok: false, error: 'insufficient_data' });
  });
});
