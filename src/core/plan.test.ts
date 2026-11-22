import { describe, expect, it } from 'vitest';
import { makeAir, MODERATE, POOR, SEVERE } from './fixtures/air.js';
import {
  findRecommendation as find,
  idsOf as ids,
  planFor as plan,
} from './fixtures/recommendations.js';
import { HEALTHY_COUPLE, HOMEBOUND_SENIOR, SHARMA_FAMILY } from './fixtures/profiles.js';
import { planHeadline } from './explain/index.js';
import { communityPlan } from './plan.js';

const MUMBAI = { lat: 19.07, lon: 72.88 };

describe('buildPlan — the Sharma family in Delhi', () => {
  it('declares a smog emergency on a Severe day and puts protection first', () => {
    const p = plan(SHARMA_FAMILY, makeAir({ scale: SEVERE }));

    expect(p.index).toMatchObject({ scale: 'naqi', category: 'severe', band: 5 });
    expect(p).toMatchObject({
      severity: 'emergency',
      householdSensitivity: 'high',
      outdoorAdvice: 'stay_indoors',
    });
    expect(ids(p).slice(0, 3)).toEqual(['run_purifier', 'n95_outdoors', 'exercise_indoors']);
    expect(p.current.pm25).toBe(p.forecast[0]?.pm25);
    expect(ids(p)).toEqual(expect.arrayContaining(['check_on_neighbours', 'ncr_grap_check']));
    expect(ids(p)).not.toContain('exercise_window');
  });

  it("quantifies the purifier in the family's 12 m² room: 201 → 28 µg/m³", () => {
    const p = plan(SHARMA_FAMILY, makeAir({ scale: SEVERE }));

    expect(find(p, 'run_purifier')).toMatchObject({
      effort: 'high',
      impact: { indoorBeforeUgM3: 201, indoorAfterUgM3: 28, exposureReductionPct: 86 },
    });
  });

  it("moves Dadaji's walk indoors and lays the day out from now", () => {
    const p = plan(SHARMA_FAMILY, makeAir({ scale: SEVERE }));

    expect(find(p, 'exercise_indoors')).toMatchObject({
      memberIds: ['m3'],
      facts: { usualHour: 6, outdoorPm25: 317, indoorPm25: 211 },
    });
    expect(p.timeline).toEqual([
      { hour: 6, recommendationId: 'exercise_indoors' },
      { hour: 8, recommendationId: 'commute_protection' },
      { hour: 14, recommendationId: 'ventilate_briefly' },
      { hour: 18, recommendationId: 'commute_protection' },
      { hour: 21, recommendationId: 'run_purifier' },
    ]);
  });

  it('is already in emergency mode on a Very Poor day because of Aarav and Dadaji', () => {
    const p = plan(SHARMA_FAMILY, makeAir());

    expect(p.index.category).toBe('very_poor');
    expect(p.severity).toBe('emergency');
  });

  it('moves the walk to 14:00 on a Moderate day and alerts the sensitive members', () => {
    const p = plan(SHARMA_FAMILY, makeAir({ scale: MODERATE }));

    expect(p).toMatchObject({ severity: 'caution', outdoorAdvice: 'reduce' });
    expect(find(p, 'exercise_window')).toMatchObject({
      memberIds: ['m3'],
      facts: { usualHour: 6, bestHour: 14 },
      impact: { exposureReductionPct: 56 },
    });
    expect(find(p, 'sensitive_members')?.memberIds).toEqual(['m2', 'm3']);
    expect(ids(p)).toContain('n95_outdoors');
    expect(ids(p)).not.toContain('check_on_neighbours');
  });

  it('offers the metro and carpooling with their weekly CO₂ savings', () => {
    const p = plan(SHARMA_FAMILY, makeAir());

    expect(find(p, 'switch_to_metro')?.impact).toMatchObject({ co2SavedKgPerWeek: 27 });
    expect(find(p, 'carpool')?.impact).toMatchObject({ co2SavedKgPerWeek: 20.4 });
    expect(ids(p)).toEqual(expect.arrayContaining(['engine_off_at_signals', 'stop_incense']));
  });
});

describe('buildPlan — other households and places', () => {
  it('lets a healthy couple keep running outdoors, at the cleanest hour, on a Poor day', () => {
    const p = plan(HEALTHY_COUPLE, makeAir({ scale: POOR }));

    expect(p).toMatchObject({ severity: 'restrict', outdoorAdvice: 'reduce' });
    expect(find(p, 'exercise_window')).toMatchObject({ memberIds: [], facts: { bestHour: 14 } });
    expect(ids(p)).toEqual(
      expect.arrayContaining(['switch_to_metro', 'switch_to_cycle', 'work_from_home']),
    );
    expect(ids(p)).not.toContain('switch_to_walk');
    expect(ids(p)).not.toContain('carpool');
    expect(ids(p)).not.toContain('sensitive_members');
  });

  it('flags smoky cooking and indoor smoking', () => {
    const p = plan(HEALTHY_COUPLE, makeAir({ scale: POOR }));

    expect(find(p, 'cooking_ventilation')?.impact.level).toBe('high');
    expect(ids(p)).toEqual(
      expect.arrayContaining(['clean_cooking_fuel', 'no_indoor_smoking', 'seal_gaps']),
    );
  });

  it('asks for extra planning when exercise cannot move indoors', () => {
    const p = plan(HEALTHY_COUPLE, makeAir({ scale: SEVERE }));

    expect(find(p, 'exercise_indoors')?.effort).toBe('medium');
  });

  it('gives every family the same plan for a community notice', () => {
    const air = makeAir({ scale: 1.5 });
    const sharma = communityPlan(plan(SHARMA_FAMILY, air));
    const couple = communityPlan(plan(HEALTHY_COUPLE, air));

    expect(plan(SHARMA_FAMILY, air).severity).not.toBe(plan(HEALTHY_COUPLE, air).severity);
    expect(sharma).toEqual(couple);
    expect(ids(sharma)).not.toContain('sensitive_members');
  });

  it('uses the US AQI in London and keeps a moderate day calm', () => {
    const air = makeAir({
      pm25Day: Array<number>(24).fill(12),
      timezone: 'Europe/London',
      lat: 51.5,
      lon: -0.12,
    });
    const p = plan(SHARMA_FAMILY, air);

    expect(p).toMatchObject({ severity: 'normal', index: { scale: 'us_aqi', value: 56 } });
    for (const id of ['exercise_window', 'n95_outdoors', 'sensitive_members'] as const) {
      expect(ids(p), id).not.toContain(id);
    }
    expect(ids(p)).not.toContain('ncr_grap_check');
    expect(planHeadline(p, 'en')).toBe('A normal day: no extra precautions needed');
  });

  it('heads a US day unhealthy for sensitive groups with care for them, not "moderate"', () => {
    const air = makeAir({
      pm25Day: Array<number>(24).fill(40),
      timezone: 'Europe/London',
      lat: 51.5,
      lon: -0.12,
    });
    const p = plan(SHARMA_FAMILY, air);

    expect(p).toMatchObject({
      severity: 'caution',
      index: { scale: 'us_aqi', category: 'unhealthy_sensitive' },
    });
    expect(planHeadline(p, 'en')).toBe('People in sensitive groups should take it easy today');
  });

  it('gives a homebound senior with N95s only indoor and community advice', () => {
    const p = plan(HOMEBOUND_SENIOR, makeAir());

    expect(p.recommendations.map((r) => r.category)).not.toContain('alternative');
    for (const id of ['n95_outdoors', 'commute_protection', 'cooking_ventilation'] as const) {
      expect(ids(p), id).not.toContain(id);
    }
    expect(find(p, 'run_purifier')?.effort).toBe('low');
  });

  it('leaves out the GRAP check outside Delhi NCR', () => {
    const p = plan(SHARMA_FAMILY, makeAir({ scale: SEVERE, ...MUMBAI }));

    expect(ids(p)).not.toContain('ncr_grap_check');
  });

  it('suggests an exhaust fan for LPG kitchens without one', () => {
    const noExhaust = {
      ...SHARMA_FAMILY,
      home: { ...SHARMA_FAMILY.home, hasExhaustOrChimney: false },
    };
    const withExhaust = {
      ...HEALTHY_COUPLE,
      home: { ...HEALTHY_COUPLE.home, hasExhaustOrChimney: true },
    };

    expect(find(plan(noExhaust, makeAir()), 'cooking_ventilation')).toMatchObject({
      impact: { level: 'medium' },
      facts: { hasExhaust: false },
    });
    expect(find(plan(withExhaust, makeAir()), 'cooking_ventilation')?.facts.hasExhaust).toBe(true);
  });
});
