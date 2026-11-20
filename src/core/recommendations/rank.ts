import type { Recommendation, RecommendationId, Sensitivity, Severity } from '../../shared/plan.js';
import {
  CO2_RANK_WEIGHT,
  EFFORT_PENALTY,
  EMERGENCY_BOOST,
  QUALITATIVE_BENEFIT_PCT,
  SENSITIVITY_WEIGHT,
} from '../constants.js';

export interface RankingContext {
  readonly band: number;
  readonly sensitivity: Sensitivity;
  readonly severity: Severity;
}

type Unranked = Omit<Recommendation, 'priority'>;

/** Actions that always come first in a smog emergency, together with every protection action. */
const EMERGENCY_FIRST: ReadonlySet<RecommendationId> = new Set([
  'run_purifier',
  'exercise_indoors',
]);

/** Health benefit in exposure-percentage points: measured when known, else from the qualitative level. */
function healthBenefit(rec: Unranked): number {
  const { exposureReductionPct, level } = rec.impact;
  if (exposureReductionPct !== undefined) {
    return Math.max(exposureReductionPct, 0);
  }
  return level === undefined ? 0 : QUALITATIVE_BENEFIT_PCT[level];
}

/**
 * Ranking score: health benefit weighted by how bad the air is and how sensitive the household
 * is, plus CO₂ avoided, minus effort. In an emergency, protective actions jump the queue.
 */
export function score(rec: Unranked, ctx: RankingContext): number {
  const healthWeight = (ctx.band + 1) * SENSITIVITY_WEIGHT[ctx.sensitivity];
  const co2 = (rec.impact.co2SavedKgPerWeek ?? 0) * CO2_RANK_WEIGHT;
  const urgent = rec.category === 'protection' || EMERGENCY_FIRST.has(rec.id);
  const boost = ctx.severity === 'emergency' && urgent ? EMERGENCY_BOOST : 0;
  return healthWeight * healthBenefit(rec) + co2 - EFFORT_PENALTY[rec.effort] + boost;
}

/** Sort by score (highest first, ties by id for stable output) and number the priorities from 1. */
export function rank(recs: readonly Unranked[], ctx: RankingContext): Recommendation[] {
  return recs
    .map((rec) => ({ rec, points: score(rec, ctx) }))
    .sort((a, b) => b.points - a.points || a.rec.id.localeCompare(b.rec.id))
    .map(({ rec }, position) => ({ ...rec, priority: position + 1 }));
}
