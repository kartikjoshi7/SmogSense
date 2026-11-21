import type { RecommendationId, Sensitivity, Severity } from '../../shared/plan.js';
import {
  CO2_RANK_WEIGHT,
  EFFORT_PENALTY,
  EMERGENCY_BOOST,
  QUALITATIVE_BENEFIT_PCT,
  SENSITIVITY_WEIGHT,
} from '../constants.js';
import type { UnrankedRecommendation } from './context.js';

export interface RankingContext {
  readonly band: number;
  readonly sensitivity: Sensitivity;
  readonly severity: Severity;
}

/** What ranking reads from a recommendation. */
type Rankable = Pick<UnrankedRecommendation, 'id' | 'category' | 'effort' | 'impact'>;

/** Actions that always come first in a smog emergency, together with every protection action. */
const EMERGENCY_FIRST: ReadonlySet<RecommendationId> = new Set([
  'run_purifier',
  'exercise_indoors',
]);

/** Health benefit in exposure-percentage points: measured when known, else from the qualitative level. */
function healthBenefit({ impact }: Rankable): number {
  return 'level' in impact
    ? QUALITATIVE_BENEFIT_PCT[impact.level]
    : Math.max(impact.exposureReductionPct, 0);
}

/** CO₂ avoided per week, for the swaps that measure it. */
function co2Saved({ impact }: Rankable): number {
  return 'co2SavedKgPerWeek' in impact ? impact.co2SavedKgPerWeek : 0;
}

/**
 * Ranking score: health benefit weighted by how bad the air is and how sensitive the household
 * is, plus CO₂ avoided, minus effort. In an emergency, protective actions jump the queue.
 */
function score(rec: Rankable, ctx: RankingContext): number {
  const healthWeight = (ctx.band + 1) * SENSITIVITY_WEIGHT[ctx.sensitivity];
  const co2 = co2Saved(rec) * CO2_RANK_WEIGHT;
  const urgent = rec.category === 'protection' || EMERGENCY_FIRST.has(rec.id);
  const boost = ctx.severity === 'emergency' && urgent ? EMERGENCY_BOOST : 0;
  return healthWeight * healthBenefit(rec) + co2 - EFFORT_PENALTY[rec.effort] + boost;
}

/** Code-unit order of two ids: the same on every runtime, whatever its locale. */
export function compareIds(a: string, b: string): number {
  return Number(a > b) - Number(a < b);
}

/** Sort by score (highest first, ties by id for stable output) and number the priorities from 1. */
export function rank<R extends Rankable>(
  recs: readonly R[],
  ctx: RankingContext,
): (R & { priority: number })[] {
  return recs
    .map((rec) => ({ rec, points: score(rec, ctx) }))
    .sort((a, b) => b.points - a.points || compareIds(a.rec.id, b.rec.id))
    .map(({ rec }, position) => ({ ...rec, priority: position + 1 }));
}
