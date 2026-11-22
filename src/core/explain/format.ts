import type { Audience } from '../../shared/api.js';
import type { AqiCategory, AqiScale, Plan, Severity } from '../../shared/plan.js';
import type {
  IndoorImpact,
  RecommendationId,
  RecommendationOf,
  SwapImpact,
} from '../../shared/recommendation.js';

/** Plain-language text for one recommendation. */
export interface Explanation {
  readonly title: string;
  readonly why: string;
  readonly steps: readonly string[];
}

/** The text for one kind of recommendation, written from that id's own facts and impact. */
type Template<Id extends RecommendationId> = (rec: RecommendationOf<Id>) => Explanation;

/** Everything the app says without AI, in one language. */
export interface LanguagePack {
  readonly recommendations: { readonly [Id in RecommendationId]: Template<Id> };
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

/** The sentences each language supplies for the recommendation shapes every pack shares. */
export interface ImpactPhrases {
  /** Indoor PM2.5 before and after, in µg/m³, and the percentage cut. */
  readonly indoorChange: (before: number, after: number, percent: number) => string;
  /** Weekly CO₂ saved by a commute swap, followed by the exposure clause (may be empty). */
  readonly co2Saved: (kg: number, exposureClause: string) => string;
  /** Clause for a swap that cuts the PM2.5 breathed on the way, by `percent`. */
  readonly exposureDown: (percent: number) => string;
  /** Clause for a swap that raises in-transit exposure, by `percent`. */
  readonly exposureUp: (percent: number) => string;
  /** A swap that saves no CO₂ but cuts the PM2.5 breathed on the way, and the CO₂ it adds. */
  readonly saferCommute: (percent: number, extraKg: number) => string;
}

/** The sentences each language supplies for the one-line summary of the day. */
export interface DayPhrases {
  /** The index reading: scale name, value and category name. */
  readonly reading: (scale: string, value: number, category: string) => string;
  /** Pollution trapped near the ground until a clock time. */
  readonly trappedUntil: (time: string) => string;
  /** The cleanest hour and its PM2.5. */
  readonly cleanestAt: (time: string, pm25: number) => string;
}

/** Template builders for the shapes every language shares, worded with that language's phrases. */
export function templateKit(phrases: ImpactPhrases) {
  const exposureClause = (impact: SwapImpact): string => {
    const change = impact.exposureReductionPct;
    if (change > 0) {
      return phrases.exposureDown(change);
    }
    return change < 0 ? phrases.exposureUp(-change) : '';
  };
  return {
    /** An indoor hack: a lead sentence, then the modelled before and after. */
    indoor:
      (title: string, lead: string, steps: readonly string[]) =>
      ({ impact }: { readonly impact: IndoorImpact }): Explanation => {
        const { indoorBeforeUgM3: before, indoorAfterUgM3: after, exposureReductionPct } = impact;
        return {
          title,
          why: `${lead} ${phrases.indoorChange(before, after, exposureReductionPct)}`,
          steps,
        };
      },
    /** A commute swap: CO₂ saved and the exposure on the way, or only the exposure it cuts. */
    swap:
      (title: string, steps: readonly string[]) =>
      ({ impact }: { readonly impact: SwapImpact }): Explanation => ({
        title,
        why:
          impact.co2SavedKgPerWeek > 0
            ? phrases.co2Saved(impact.co2SavedKgPerWeek, exposureClause(impact))
            : phrases.saferCommute(impact.exposureReductionPct, -impact.co2SavedKgPerWeek),
        steps,
      }),
    /** Advice whose benefit is described, not measured. */
    qualitative: (title: string, why: string, steps: readonly string[]) => (): Explanation => ({
      title,
      why,
      steps,
    }),
  };
}

/** The day in a sentence or two: the reading, then when the inversion clears or the cleanest hour. */
function daySummary(
  plan: Plan,
  labels: Pick<LanguagePack, 'scales' | 'categories'>,
  phrases: DayPhrases,
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

/** One language's own text, from which `languagePack` builds everything said without AI. */
export interface LanguageText {
  readonly recommendations: LanguagePack['recommendations'];
  readonly categories: LanguagePack['categories'];
  readonly scales: LanguagePack['scales'];
  readonly headlines: LanguagePack['headlines'];
  readonly dayPhrases: DayPhrases;
  /** How a community notice greets each audience. */
  readonly greetings: Readonly<Record<Audience, string>>;
  /** What a community notice asks everyone to do, by severity. */
  readonly noticeAdvice: Readonly<Record<Severity, string>>;
  /** Opens the chat answer given without AI, saying why it is standard guidance. */
  readonly chatIntro: string;
  /** Introduces the day's top actions in that answer. */
  readonly mostImportant: string;
  /** Ends a notice, naming where it came from. */
  readonly sharedVia: string;
  /** The language's sentence end: "." or "।". */
  readonly fullStop: string;
}

/** Everything the app says without AI in one language, composed the same way for every language. */
export function languagePack(text: LanguageText): LanguagePack {
  const summary = (plan: Plan): string => daySummary(plan, text, text.dayPhrases);
  return {
    recommendations: text.recommendations,
    categories: text.categories,
    scales: text.scales,
    headlines: text.headlines,
    summary,
    chatFallback: (plan, topTitles) =>
      `${text.chatIntro} ${summary(plan)} ${text.mostImportant} ${topTitles.join('; ')}${text.fullStop}`,
    communityNotice: (plan, audience) =>
      `${text.greetings[audience]}, ${summary(plan)} ${text.headlines[plan.severity]}${text.fullStop} ${text.noticeAdvice[plan.severity]} — ${text.sharedVia}`,
  };
}
