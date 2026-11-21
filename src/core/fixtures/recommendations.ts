import type {
  Plan,
  Recommendation,
  RecommendationId,
  RecommendationOf,
} from '../../shared/plan.js';

const BASE: Omit<Recommendation, 'id' | 'facts'> = {
  category: 'routine',
  priority: 1,
  effort: 'low',
  memberIds: [],
  impact: {},
};

const COMMUTE = { mode: 'car_petrol', oneWayKm: 18, daysPerWeek: 5 } as const;
const ROOM = { outdoorPm25: 301, roomAreaM2: 16 };

/** One recommendation of every kind, with plausible facts and no measured impact. */
export const SAMPLE_RECOMMENDATIONS: { readonly [Id in RecommendationId]: RecommendationOf<Id> } = {
  exercise_window: {
    ...BASE,
    id: 'exercise_window',
    facts: { usualHour: 6, bestHour: 14, durationMin: 30, usualPm25: 320, bestPm25: 210 },
  },
  exercise_indoors: {
    ...BASE,
    id: 'exercise_indoors',
    facts: { usualHour: 6, durationMin: 30, outdoorPm25: 317, indoorPm25: 211 },
  },
  commute_protection: {
    ...BASE,
    id: 'commute_protection',
    facts: {
      mode: 'car_petrol',
      currentMask: 'cloth',
      oneWayKm: 18,
      departHour: 8,
      returnHour: 18,
    },
  },
  ventilate_briefly: { ...BASE, id: 'ventilate_briefly', facts: { hour: 14, pm25: 180 } },
  run_purifier: { ...BASE, id: 'run_purifier', facts: { ...ROOM, purifiersOwned: 0 } },
  seal_gaps: { ...BASE, id: 'seal_gaps', facts: ROOM },
  keep_windows_shut: { ...BASE, id: 'keep_windows_shut', facts: ROOM },
  stop_incense: { ...BASE, id: 'stop_incense', facts: ROOM },
  no_indoor_smoking: { ...BASE, id: 'no_indoor_smoking', facts: ROOM },
  cooking_ventilation: {
    ...BASE,
    id: 'cooking_ventilation',
    facts: { cookingFuel: 'biomass', hasExhaust: true },
  },
  wet_mopping: { ...BASE, id: 'wet_mopping', facts: {} },
  switch_to_metro: { ...BASE, id: 'switch_to_metro', facts: COMMUTE },
  switch_to_bus: { ...BASE, id: 'switch_to_bus', facts: COMMUTE },
  carpool: { ...BASE, id: 'carpool', facts: COMMUTE },
  switch_to_cycle: { ...BASE, id: 'switch_to_cycle', facts: COMMUTE },
  switch_to_walk: { ...BASE, id: 'switch_to_walk', facts: COMMUTE },
  work_from_home: { ...BASE, id: 'work_from_home', facts: COMMUTE },
  engine_off_at_signals: { ...BASE, id: 'engine_off_at_signals', facts: { mode: 'car_petrol' } },
  combine_errands: { ...BASE, id: 'combine_errands', facts: { mode: 'car_petrol' } },
  clean_cooking_fuel: { ...BASE, id: 'clean_cooking_fuel', facts: { cookingFuel: 'kerosene' } },
  n95_outdoors: {
    ...BASE,
    id: 'n95_outdoors',
    facts: { currentMask: 'cloth', inhaledShareNowPct: 80, inhaledShareN95Pct: 20 },
  },
  sensitive_members: {
    ...BASE,
    id: 'sensitive_members',
    facts: { indexValue: 420, outdoorAdvice: 'stay_indoors' },
  },
  ncr_grap_check: { ...BASE, id: 'ncr_grap_check', facts: { indexValue: 420 } },
  check_on_neighbours: { ...BASE, id: 'check_on_neighbours', facts: { indexValue: 420 } },
  report_open_burning: { ...BASE, id: 'report_open_burning', facts: {} },
  share_notice: { ...BASE, id: 'share_notice', facts: { indexValue: 420 } },
};

/** The plan's recommendation with this id, typed with that id's facts, if the plan has one. */
export function findRecommendation<Id extends RecommendationId>(
  plan: Plan,
  id: Id,
): RecommendationOf<Id> | undefined {
  return plan.recommendations.find((rec): rec is RecommendationOf<Id> => rec.id === id);
}
