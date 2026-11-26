/** Pairs each recommendation with AI text when there is some, else standard guidance. */
import { explainRecommendation } from '../../../core/explain/index.js';
import type { ExplainResponse, TextSource } from '../../../shared/api.js';
import type { UiLanguage } from '../../../shared/languages.js';
import type { Plan } from '../../../shared/plan.js';
import type { Recommendation } from '../../../shared/recommendation.js';

/** A recommendation with the text to show for it and where that text came from. */
export interface ShownRecommendation {
  readonly rec: Recommendation;
  readonly title: string;
  readonly why: string;
  readonly steps: readonly string[];
  readonly source: TextSource;
}

/** Pair each recommendation with the AI's text when it wrote some, else standard guidance. */
export function explainedItems(
  plan: Plan,
  explanation: ExplainResponse | null,
  lang: UiLanguage,
): ShownRecommendation[] {
  return plan.recommendations.map((rec) => {
    const standard = explainRecommendation(rec, lang);
    const written = explanation?.items.find((item) => item.id === rec.id);
    return written === undefined
      ? { rec, ...standard, source: 'fallback' }
      : { rec, title: standard.title, why: written.why, steps: written.steps, source: 'ai' };
  });
}
