/** What every recommendation generator shares: the plan context and the candidate shape. */
import type { AirData } from '../../shared/air.js';
import type { CleanestHour, IndexReading, Sensitivity, Severity } from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import type { OutdoorAdvice, Recommendation } from '../../shared/recommendation.js';
import type { ActivityWindow } from '../windows.js';

/** Everything the generators need, computed once per plan. */
export interface PlanContext {
  readonly profile: Profile;
  readonly air: AirData;
  readonly index: IndexReading;
  readonly sensitivity: Sensitivity;
  readonly advice: OutdoorAdvice;
  readonly severity: Severity;
  /** Members in a sensitive group, who get personal alerts. */
  readonly sensitiveIds: readonly string[];
  /**
   * The 24-hour mean of outdoor PM2.5: the baseline for the home, where the family spends all day.
   * Activities at a known time use that time's air instead (`commutePm25`, `exerciseWindow`).
   */
  readonly ambientPm25: number;
  /** Outdoor PM2.5 at the household's usual commuting hours. */
  readonly commutePm25: number;
  /** Cleanest daylight window for the household's exercise, if any. */
  readonly exerciseWindow: ActivityWindow | null;
  readonly ventilation: CleanestHour | null;
}

/** Leaves out the priority of each member of a union separately, so every id keeps its facts. */
type WithoutPriority<R> = R extends unknown ? Omit<R, 'priority'> : never;

/** A recommendation before ranking has given it a priority. */
export type UnrankedRecommendation = WithoutPriority<Recommendation>;

/** A recommendation before ranking, plus the clock hours it belongs at on the day's timeline. */
export interface Candidate {
  readonly recommendation: UnrankedRecommendation;
  readonly hours: readonly number[];
}

/** Wrap a recommendation as a ranking candidate. */
export function candidate(
  recommendation: UnrankedRecommendation,
  hours: readonly number[] = [],
): Candidate {
  return { recommendation, hours };
}
