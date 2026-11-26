/** The plan every family at a place shares: what a community notice is written from. */
import type { AirData } from '../shared/air.js';
import type { Plan } from '../shared/plan.js';
import type { Profile } from '../shared/profile.js';
import type { RecommendationId } from '../shared/recommendation.js';
import { buildPlan } from './plan.js';
import { ok, type Result } from './result.js';

/** Recommendations that depend only on the air and the place, not on the household, in order. */
const FOR_EVERYONE: readonly RecommendationId[] = [
  'ncr_grap_check',
  'check_on_neighbours',
  'report_open_burning',
  'share_notice',
];

/**
 * Nobody in particular: one healthy adult at home, with no commute, exercise or smoke sources.
 * The community plan is built for this household, so it needs no real family's data.
 */
const ANYONE: Profile = {
  members: [{ id: 'm1', ageGroup: 'adult', conditions: [] }],
  commute: {
    mode: 'none',
    oneWayKm: 0,
    departHour: 9,
    returnHour: 17,
    daysPerWeek: 0,
    alternatives: [],
  },
  exercise: {
    activity: 'none',
    memberId: null,
    usualHour: 7,
    durationMin: 30,
    canMoveIndoors: true,
  },
  home: {
    purifierCount: 0,
    purifierCadrM3h: 250,
    roomAreaM2: 12,
    airtightness: 'average',
    cookingFuel: 'induction',
    hasExhaustOrChimney: true,
    incense: 'never',
    indoorSmoking: false,
    heating: 'none',
  },
  mask: 'none',
};

/**
 * The plan as it applies to everyone nearby, for a community notice: the day judged for people of
 * normal sensitivity, with only the recommendations that do not depend on the household (in a
 * fixed order) and no household timeline. It is built from the air alone, so every family at the
 * same place and hour gets the same plan and the request needs no profile.
 */
export function buildCommunityPlan(air: AirData): Result<Plan, 'insufficient_data'> {
  const plan = buildPlan(ANYONE, air);
  if (!plan.ok) {
    return plan;
  }
  const shared = FOR_EVERYONE.flatMap((id) =>
    plan.value.recommendations.filter((r) => r.id === id),
  );
  return ok({
    ...plan.value,
    recommendations: shared.map((rec, position) => ({ ...rec, priority: position + 1 })),
    timeline: [],
  });
}
