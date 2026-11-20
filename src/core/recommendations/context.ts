import type { AirData } from '../../shared/air.js';
import type {
  IndexReading,
  OutdoorAdvice,
  Recommendation,
  Sensitivity,
  Severity,
} from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import type { ActivityWindow } from '../windows.js';

/** Everything the generators need, computed once per plan. */
export interface PlanContext {
  readonly profile: Profile;
  readonly air: AirData;
  readonly index: IndexReading;
  readonly sensitivity: Sensitivity;
  readonly advice: OutdoorAdvice;
  readonly severity: Severity;
  readonly highRiskIds: readonly string[];
  /** Representative outdoor PM2.5 for indoor and commute estimates (24-hour mean). */
  readonly ambientPm25: number;
  /** Cleanest daylight window for the household's exercise, if any. */
  readonly exerciseWindow: ActivityWindow | null;
  readonly ventilation: { readonly hour: number; readonly pm25: number } | null;
}

/** A recommendation before ranking, plus the clock hours it belongs at on the day's timeline. */
export interface Candidate {
  readonly recommendation: Omit<Recommendation, 'priority'>;
  readonly hours: readonly number[];
}

/** Wrap a recommendation as a ranking candidate. */
export function candidate(
  recommendation: Omit<Recommendation, 'priority'>,
  hours: readonly number[] = [],
): Candidate {
  return { recommendation, hours };
}
