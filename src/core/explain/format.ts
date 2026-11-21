import type { Audience } from '../../shared/api.js';
import type {
  AqiCategory,
  AqiScale,
  Plan,
  Recommendation,
  RecommendationId,
  Severity,
} from '../../shared/plan.js';

/** Plain-language text for one recommendation. */
export interface Explanation {
  readonly title: string;
  readonly why: string;
  readonly steps: readonly string[];
}

export type Template = (rec: Recommendation) => Explanation;

/** Everything the app says without AI, in one language. */
export interface LanguagePack {
  readonly recommendations: Readonly<Record<RecommendationId, Template>>;
  readonly categories: Readonly<Record<AqiCategory, string>>;
  readonly scales: Readonly<Record<AqiScale, string>>;
  readonly headlines: Readonly<Record<Severity, string>>;
  readonly summary: (plan: Plan) => string;
  readonly chatFallback: (plan: Plan, topTitles: readonly string[]) => string;
  readonly communityNotice: (plan: Plan, audience: Audience) => string;
}

/** A clock hour as `HH:00`. */
export function clock(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** A numeric fact, or 0 when the engine did not provide it. */
export function num(rec: Recommendation, key: string): number {
  const value = rec.facts[key];
  return typeof value === 'number' ? value : 0;
}

/** A text fact, or an empty string when the engine did not provide it. */
export function text(rec: Recommendation, key: string): string {
  const value = rec.facts[key];
  return typeof value === 'string' ? value : '';
}

type NumericImpact = Exclude<keyof Recommendation['impact'], 'level'>;

/** A numeric impact value, or 0 when it does not apply. */
export function impact(rec: Recommendation, field: NumericImpact): number {
  return rec.impact[field] ?? 0;
}

/** A label for a key, or the fallback for keys the table does not know. */
export function lookup(
  table: Readonly<Record<string, string>>,
  key: string,
  fallback: string,
): string {
  return table[key] ?? fallback;
}

/** The measured exposure cut in percent (0 when not measured). */
export function pct(rec: Recommendation): number {
  return rec.impact.exposureReductionPct ?? 0;
}

/** CO₂ saved per week in kg (0 when not applicable). */
export function kg(rec: Recommendation): number {
  return rec.impact.co2SavedKgPerWeek ?? 0;
}
