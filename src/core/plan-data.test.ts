import { describe, expect, it } from 'vitest';
import { buildCommunityPlan } from './community-plan.js';
import { makeAir, MODERATE, SEVERE } from './fixtures/air.js';
import { SHARMA_FAMILY } from './fixtures/profiles.js';
import {
  findRecommendation as find,
  idsOf as ids,
  planFor as plan,
} from './fixtures/recommendations.js';
import { buildPlan } from './plan.js';

describe('current pollutants', () => {
  it('reads every pollutant at the current hour', () => {
    const air = makeAir({ pm10Day: Array.from({ length: 24 }, () => 210) });

    expect(plan(SHARMA_FAMILY, air).current).toEqual({
      pm25: air.hourly[air.nowIndex]?.pm25,
      pm10: 210,
      no2: null,
      o3: null,
      co: null,
      so2: null,
    });
  });

  it('reports no readings when the current hour is missing from the data', () => {
    const air = makeAir();
    const pastTheEnd = { ...air, nowIndex: air.hourly.length };

    expect(plan(SHARMA_FAMILY, pastTheEnd).current).toEqual({
      pm25: null,
      pm10: null,
      no2: null,
      o3: null,
      co: null,
      so2: null,
    });
  });
});

describe('buildPlan — gaps in the data', () => {
  it('reports insufficient data instead of guessing, for a household or a community', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h < 12 ? null : 100));
    const failure = { ok: false, error: 'insufficient_data' };

    expect(buildPlan(SHARMA_FAMILY, makeAir({ pm25Day }))).toEqual(failure);
    expect(buildCommunityPlan(makeAir({ pm25Day }))).toEqual(failure);
  });

  it('falls back to the daily mean when no clean window can be found', () => {
    const p = plan(SHARMA_FAMILY, { ...makeAir({ scale: SEVERE }), daylight: [] });

    expect(find(p, 'exercise_indoors')?.facts.outdoorPm25).toBe(Math.round(p.index.pm25Mean24h));
    expect(ids(p)).not.toContain('ventilate_briefly');
    expect(p.cleanestHour).toBeNull();
  });

  it('skips the clean-window advice when the usual hour has no reading', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h === 6 ? null : 40 + h));
    const p = plan(SHARMA_FAMILY, makeAir({ pm25Day }));

    expect(ids(p)).not.toContain('exercise_window');
  });

  it('gives no exercise-timing advice when there is no daylight in the forecast', () => {
    const p = plan(SHARMA_FAMILY, { ...makeAir({ scale: MODERATE }), daylight: [] });

    expect(ids(p)).not.toContain('exercise_window');
    expect(ids(p)).not.toContain('exercise_indoors');
  });

  it('does not move a routine whose usual hour is already clean', () => {
    const pm25Day = Array.from({ length: 24 }, (_, h) => (h === 6 ? 0 : 40));

    expect(ids(plan(SHARMA_FAMILY, makeAir({ pm25Day })))).not.toContain('exercise_window');
  });

  it('notes when the boundary-layer height is unavailable', () => {
    expect(plan(SHARMA_FAMILY, makeAir({ blhDay: null })).inversion.basis).toBe('wind_only');
  });

  it('keeps timeline hours that fall beyond the forecast, ordered by id', () => {
    const air = makeAir({ scale: SEVERE });
    const p = plan(SHARMA_FAMILY, { ...air, nowIndex: air.hourly.length - 1 });

    expect(p.forecast).toHaveLength(1);
    expect(p.timeline.map((t) => t.recommendationId)).toEqual([
      'commute_protection',
      'commute_protection',
      'exercise_indoors',
      'run_purifier',
    ]);
  });
});
