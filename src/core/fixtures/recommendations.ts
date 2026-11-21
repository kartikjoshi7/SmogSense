import type { AirData } from '../../shared/air.js';
import {
  planSchema,
  type Plan,
  type Recommendation,
  type RecommendationId,
  type RecommendationOf,
} from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import { buildPlan } from '../plan.js';

const BASE: Omit<Recommendation, 'id' | 'impact' | 'facts'> = {
  category: 'routine',
  priority: 1,
  effort: 'low',
  memberIds: [],
};

// One plausible impact of each shape.
const DOSE = { exposureReductionPct: 34, doseBeforeUg: 74.2, doseAfterUg: 49 };
const INDOOR = { exposureReductionPct: 86, indoorBeforeUgM3: 201, indoorAfterUgM3: 28 };
const SWAP = { co2SavedKgPerWeek: 27, exposureReductionPct: 14 };
const SHARE = { exposureReductionPct: 70 };
const LEVEL = { level: 'medium' } as const;

const COMMUTE = { mode: 'car_petrol', oneWayKm: 18, daysPerWeek: 5 } as const;
const ROOM = { outdoorPm25: 301, roomAreaM2: 16 };

/** One recommendation of every kind, with plausible facts and impact. */
export const SAMPLE_RECOMMENDATIONS: { readonly [Id in RecommendationId]: RecommendationOf<Id> } = {
  exercise_window: {
    ...BASE,
    id: 'exercise_window',
    impact: DOSE,
    facts: { usualHour: 6, bestHour: 14, durationMin: 30, usualPm25: 320, bestPm25: 210 },
  },
  exercise_indoors: {
    ...BASE,
    id: 'exercise_indoors',
    impact: DOSE,
    facts: { usualHour: 6, durationMin: 30, outdoorPm25: 317, indoorPm25: 211 },
  },
  commute_protection: {
    ...BASE,
    id: 'commute_protection',
    impact: DOSE,
    facts: {
      mode: 'car_petrol',
      currentMask: 'cloth',
      oneWayKm: 18,
      departHour: 8,
      returnHour: 18,
    },
  },
  ventilate_briefly: {
    ...BASE,
    id: 'ventilate_briefly',
    impact: LEVEL,
    facts: { hour: 14, pm25: 180 },
  },
  run_purifier: {
    ...BASE,
    id: 'run_purifier',
    impact: INDOOR,
    facts: { ...ROOM, purifiersOwned: 0 },
  },
  seal_gaps: { ...BASE, id: 'seal_gaps', impact: INDOOR, facts: ROOM },
  keep_windows_shut: { ...BASE, id: 'keep_windows_shut', impact: INDOOR, facts: ROOM },
  stop_incense: { ...BASE, id: 'stop_incense', impact: INDOOR, facts: ROOM },
  no_indoor_smoking: { ...BASE, id: 'no_indoor_smoking', impact: INDOOR, facts: ROOM },
  safer_heating: {
    ...BASE,
    id: 'safer_heating',
    impact: INDOOR,
    facts: { ...ROOM, heating: 'coal_wood' },
  },
  cooking_ventilation: {
    ...BASE,
    id: 'cooking_ventilation',
    impact: LEVEL,
    facts: { cookingFuel: 'biomass', hasExhaust: true },
  },
  wet_mopping: { ...BASE, id: 'wet_mopping', impact: LEVEL, facts: {} },
  switch_to_metro: { ...BASE, id: 'switch_to_metro', impact: SWAP, facts: COMMUTE },
  switch_to_bus: { ...BASE, id: 'switch_to_bus', impact: SWAP, facts: COMMUTE },
  carpool: { ...BASE, id: 'carpool', impact: SWAP, facts: COMMUTE },
  switch_to_cycle: { ...BASE, id: 'switch_to_cycle', impact: SWAP, facts: COMMUTE },
  switch_to_walk: { ...BASE, id: 'switch_to_walk', impact: SWAP, facts: COMMUTE },
  work_from_home: { ...BASE, id: 'work_from_home', impact: SWAP, facts: COMMUTE },
  engine_off_at_signals: {
    ...BASE,
    id: 'engine_off_at_signals',
    impact: LEVEL,
    facts: { mode: 'car_petrol' },
  },
  combine_errands: { ...BASE, id: 'combine_errands', impact: LEVEL, facts: { mode: 'car_petrol' } },
  clean_cooking_fuel: {
    ...BASE,
    id: 'clean_cooking_fuel',
    impact: LEVEL,
    facts: { cookingFuel: 'kerosene' },
  },
  n95_outdoors: {
    ...BASE,
    id: 'n95_outdoors',
    impact: SHARE,
    facts: { currentMask: 'cloth', inhaledShareNowPct: 80, inhaledShareN95Pct: 20 },
  },
  sensitive_members: {
    ...BASE,
    id: 'sensitive_members',
    impact: LEVEL,
    facts: { indexValue: 420, outdoorAdvice: 'stay_indoors' },
  },
  ncr_grap_check: { ...BASE, id: 'ncr_grap_check', impact: LEVEL, facts: { indexValue: 420 } },
  check_on_neighbours: {
    ...BASE,
    id: 'check_on_neighbours',
    impact: LEVEL,
    facts: { indexValue: 420 },
  },
  report_open_burning: { ...BASE, id: 'report_open_burning', impact: LEVEL, facts: {} },
  share_notice: { ...BASE, id: 'share_notice', impact: LEVEL, facts: { indexValue: 420 } },
};

/** The plan's recommendation with this id, typed with that id's facts, if the plan has one. */
export function findRecommendation<Id extends RecommendationId>(
  plan: Plan,
  id: Id,
): RecommendationOf<Id> | undefined {
  return plan.recommendations.find((rec): rec is RecommendationOf<Id> => rec.id === id);
}

/** The plan for a household and its air data, checked against the API schema; throws if none. */
export function planFor(profile: Profile, air: AirData): Plan {
  const result = buildPlan(profile, air);
  if (!result.ok) {
    throw new Error(`expected a plan, got ${result.error}`);
  }
  return planSchema.parse(result.value);
}

/** The recommendation ids in a plan, in priority order. */
export function idsOf(plan: Plan): RecommendationId[] {
  return plan.recommendations.map((r) => r.id);
}
