import { describe, expect, it } from 'vitest';
import { makeAir } from '../core/fixtures/air.js';
import { airDataSchema } from './air.js';

describe('airDataSchema', () => {
  it('accepts three days of hourly data', () => {
    const air = makeAir();

    expect(airDataSchema.parse(air)).toEqual(air);
  });

  it('rejects a current-hour index outside the data', () => {
    const air = makeAir();

    expect(airDataSchema.safeParse({ ...air, nowIndex: air.hourly.length }).success).toBe(false);
  });

  it('rejects timestamps that are not local Open-Meteo times', () => {
    const air = makeAir();
    const hourly = air.hourly.map((h, i) => (i === 0 ? { ...h, time: '2026-11-19T00:00:00Z' } : h));

    expect(airDataSchema.safeParse({ ...air, hourly }).success).toBe(false);
  });

  it('rejects negative concentrations and lowercase country codes', () => {
    const air = makeAir();
    const hourly = air.hourly.map((h, i) => (i === 0 ? { ...h, pm25: -1 } : h));

    expect(airDataSchema.safeParse({ ...air, hourly }).success).toBe(false);
    expect(airDataSchema.safeParse({ ...air, countryCode: 'in' }).success).toBe(false);
  });
});
