import { describe, expect, it } from 'vitest';
import type { Commute } from '../shared/profile.js';
import { commuteSwaps, dailyCommuteDoseUg } from './emissions.js';

const carCommute: Commute = {
  mode: 'car_petrol',
  oneWayKm: 18,
  departHour: 8,
  returnHour: 18,
  daysPerWeek: 5,
  alternatives: ['metro', 'carpool', 'wfh', 'cycle'],
};

describe('weekly commute CO₂', () => {
  it('counts a round trip on every commuting day: cycling 5 km saves all 8.5 kg', () => {
    const short: Commute = { ...carCommute, oneWayKm: 5, alternatives: ['cycle'] };

    // 0.17 kg/km × 5 km × 2 trips × 5 days; cycling emits nothing.
    expect(commuteSwaps(short, 125)[0]?.co2SavedKgPerWeek).toBe(8.5);
  });
});

describe('dailyCommuteDoseUg', () => {
  it('is lower in a closed car than on a two-wheeler over the same distance', () => {
    expect(dailyCommuteDoseUg('car_petrol', 10, 150)).toBeLessThan(
      dailyCommuteDoseUg('two_wheeler', 10, 150),
    );
  });

  it('applies the mask reduction', () => {
    const bare = dailyCommuteDoseUg('bus', 10, 150);

    expect(dailyCommuteDoseUg('bus', 10, 150, 0.8)).toBeCloseTo(bare * 0.2, 0);
  });
});

describe('commuteSwaps', () => {
  it('scores metro, carpool and a home-working day for an 18 km car commute', () => {
    expect(commuteSwaps(carCommute, 125)).toEqual([
      { alternative: 'metro', co2SavedKgPerWeek: 27, exposureReductionPct: 14 },
      { alternative: 'carpool', co2SavedKgPerWeek: 20.4, exposureReductionPct: 0 },
      { alternative: 'wfh', co2SavedKgPerWeek: 6.1, exposureReductionPct: 20 },
    ]);
  });

  it('drops cycling beyond 8 km and walking beyond 2 km', () => {
    const near = { ...carCommute, oneWayKm: 5, alternatives: ['cycle', 'walk'] as const };

    expect(
      commuteSwaps({ ...near, alternatives: [...near.alternatives] }, 125).map(
        (s) => s.alternative,
      ),
    ).toEqual(['cycle']);
  });

  it('only offers carpooling to car drivers', () => {
    const scooter: Commute = { ...carCommute, mode: 'two_wheeler', alternatives: ['carpool'] };

    expect(commuteSwaps(scooter, 125)).toEqual([]);
  });

  it('drops swaps to the current mode and swaps that help neither emissions nor exposure', () => {
    const metroRider: Commute = { ...carCommute, mode: 'metro', alternatives: ['metro', 'bus'] };

    expect(commuteSwaps(metroRider, 125)).toEqual([]);
  });

  it('returns nothing for households that do not commute', () => {
    expect(commuteSwaps({ ...carCommute, mode: 'none' }, 125)).toEqual([]);
    expect(commuteSwaps({ ...carCommute, daysPerWeek: 0 }, 125)).toEqual([]);
    expect(commuteSwaps({ ...carCommute, oneWayKm: 0 }, 125)).toEqual([]);
  });
});
