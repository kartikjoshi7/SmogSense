import type { Audience, TextSource } from '../../shared/api.js';
import type { Language, UiLanguage } from '../../shared/languages.js';
import type { AqiCategory, Plan, RecommendationId, RecommendationOf } from '../../shared/plan.js';
import { pack as en } from './en.js';
import type { Explanation, LanguagePack } from './format.js';
import { pack as hi } from './hi.js';

export type { Explanation } from './format.js';

const PACKS: Readonly<Record<UiLanguage, LanguagePack>> = { en, hi };

/** The language standard guidance is written in for a request: Hindi or English for the rest. */
function guidanceLanguage(lang: Language): UiLanguage {
  return lang === 'hi' ? 'hi' : 'en';
}

/** The language a reply is written in: the one asked for when the AI wrote it, else the guidance's. */
export function replyLanguage(source: TextSource, lang: Language): Language {
  return source === 'ai' ? lang : guidanceLanguage(lang);
}

function packFor(lang: Language): LanguagePack {
  return PACKS[guidanceLanguage(lang)];
}

/** Title, reasoning and steps for one recommendation, using the engine's numbers. */
export function explainRecommendation<Id extends RecommendationId>(
  rec: RecommendationOf<Id>,
  lang: Language,
): Explanation {
  return packFor(lang).recommendations[rec.id](rec);
}

/** A one-line headline for the day, from the plan's severity. */
export function planHeadline(plan: Plan, lang: Language): string {
  return packFor(lang).headlines[plan.severity];
}

/** The index reading plus the most useful timing fact (inversion clearing or cleanest hour). */
export function planSummary(plan: Plan, lang: Language): string {
  return packFor(lang).summary(plan);
}

/** The display name of an AQI category. */
export function categoryLabel(category: AqiCategory, lang: Language): string {
  return packFor(lang).categories[category];
}

/** The chat answer used when the AI is unavailable: the day's summary and top three actions. */
export function fallbackChatAnswer(plan: Plan, lang: Language): string {
  const titles = plan.recommendations
    .slice(0, 3)
    .map((rec) => explainRecommendation(rec, lang).title);
  return packFor(lang).chatFallback(plan, titles);
}

/** A ready-to-share community notice written without AI. */
export function fallbackCommunityNotice(plan: Plan, audience: Audience, lang: Language): string {
  return packFor(lang).communityNotice(plan, audience);
}
