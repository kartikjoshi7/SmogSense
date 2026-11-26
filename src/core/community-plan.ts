/** The plan every family at a place shares: what a community notice is written from. */
import type { AirData } from '../shared/air.js';
import type { Plan } from '../shared/plan.js';
import type { RecommendationId } from '../shared/recommendation.js';
import { EMPTY_PROFILE } from './empty-profile.js';
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
 * The plan as it applies to everyone nearby, for a community notice: the day judged for people of
 * normal sensitivity, with only the recommendations that do not depend on the household (in a
 * fixed order) and no household timeline. It is built for the empty household (one healthy
 * adult), so every family at the same place and hour gets the same plan and no profile is needed.
 */
export function buildCommunityPlan(air: AirData): Result<Plan, 'insufficient_data'> {
  const plan = buildPlan(EMPTY_PROFILE, air);
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
