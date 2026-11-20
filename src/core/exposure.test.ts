import { describe, expect, it } from 'vitest';
import { inhaledDoseUg, reduction } from './exposure.js';

describe('inhaledDoseUg', () => {
  it('reproduces the worked example: a 30-minute walk at 310 vs 140 µg/m³ is 248 vs 112 µg', () => {
    const walk = { hours: 0.5, breathingM3h: 1.6 };

    expect(inhaledDoseUg({ ...walk, concentration: 310 })).toBe(248);
    expect(inhaledDoseUg({ ...walk, concentration: 140 })).toBe(112);
    expect(reduction(248, 112).percent).toBe(55);
  });

  it('applies the in-transit multiplier, age factor and mask together', () => {
    const dose = inhaledDoseUg({
      concentration: 200,
      hours: 1,
      breathingM3h: 0.7,
      exposureMultiplier: 1.5,
      ageFactor: 0.7,
      maskReduction: 0.8,
    });

    expect(dose).toBe(29.4);
  });
});

describe('reduction', () => {
  it('reports the percentage drop, negative when exposure rises', () => {
    expect(reduction(100, 25)).toEqual({ before: 100, after: 25, percent: 75 });
    expect(reduction(100, 120).percent).toBe(-20);
  });

  it('is 0% when there was nothing to reduce', () => {
    expect(reduction(0, 0).percent).toBe(0);
  });
});
