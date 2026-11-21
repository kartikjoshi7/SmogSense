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
function kg(rec: Recommendation): number {
  return rec.impact.co2SavedKgPerWeek ?? 0;
}

/** The sentences each language supplies for the template shapes every pack shares. */
export interface Phrases {
  /** Indoor PM2.5 before and after, in µg/m³, and the percentage cut. */
  readonly indoorChange: (before: number, after: number, percent: number) => string;
  /** Weekly CO₂ saved by a commute swap, followed by the exposure clause (may be empty). */
  readonly co2Saved: (kg: number, exposureClause: string) => string;
  /** Clause for a swap that cuts the PM2.5 breathed on the way, by `percent`. */
  readonly exposureDown: (percent: number) => string;
  /** Clause for a swap that raises in-transit exposure, by `percent`. */
  readonly exposureUp: (percent: number) => string;
  /** The index reading: scale name, value and category name. */
  readonly reading: (scale: string, value: number, category: string) => string;
  /** Pollution trapped near the ground until a clock time. */
  readonly trappedUntil: (time: string) => string;
  /** The cleanest hour and its PM2.5. */
  readonly cleanestAt: (time: string, pm25: number) => string;
}

/** Template builders for the shapes every language shares, worded with that language's phrases. */
export function templateKit(phrases: Phrases) {
  const exposureClause = (rec: Recommendation): string => {
    const change = pct(rec);
    if (change > 0) {
      return phrases.exposureDown(change);
    }
    return change < 0 ? phrases.exposureUp(-change) : '';
  };
  return {
    /** An indoor hack: a lead sentence, then the modelled before and after. */
    indoor:
      (title: string, lead: string, steps: readonly string[]): Template =>
      (rec) => {
        const before = impact(rec, 'indoorBeforeUgM3');
        const after = impact(rec, 'indoorAfterUgM3');
        return { title, why: `${lead} ${phrases.indoorChange(before, after, pct(rec))}`, steps };
      },
    /** A commute swap: CO₂ saved, plus what happens to exposure on the way. */
    swap:
      (title: string, steps: readonly string[]): Template =>
      (rec) => ({ title, why: phrases.co2Saved(kg(rec), exposureClause(rec)), steps }),
    /** Advice whose benefit is described, not measured. */
    qualitative:
      (title: string, why: string, steps: readonly string[]): Template =>
      () => ({ title, why, steps }),
  };
}

/** The day in a sentence or two: the reading, then when the inversion clears or the cleanest hour. */
export function daySummary(
  plan: Plan,
  labels: Pick<LanguagePack, 'scales' | 'categories'>,
  phrases: Phrases,
): string {
  const { index, inversion, cleanestHour } = plan;
  const reading = phrases.reading(
    labels.scales[index.scale],
    index.value,
    labels.categories[index.category],
  );
  if (inversion.trappedNow && inversion.clearsAtHour !== null) {
    return `${reading} ${phrases.trappedUntil(clock(inversion.clearsAtHour))}`;
  }
  return cleanestHour === null
    ? reading
    : `${reading} ${phrases.cleanestAt(clock(cleanestHour.hour), cleanestHour.pm25)}`;
}
