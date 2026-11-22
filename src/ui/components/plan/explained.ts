import { explainRecommendation } from '../../../core/explain/index.js';
import type { ExplainResponse, TextSource } from '../../../shared/api.js';
import type { Plan } from '../../../shared/plan.js';
import type { Recommendation } from '../../../shared/recommendation.js';
import type { UiLanguage } from '../../../shared/languages.js';

/** A recommendation with the text to show for it and where that text came from. */
export interface ShownRecommendation {
  readonly rec: Recommendation;
  readonly title: string;
  readonly why: string;
  readonly steps: readonly string[];
  readonly source: TextSource;
}

/** Pair each recommendation with AI text when the server sent some, else standard guidance. */
export function explainedItems(
  plan: Plan,
  explanation: ExplainResponse | null,
  lang: UiLanguage,
): ShownRecommendation[] {
  return plan.recommendations.map((rec) => {
    const written = explanation?.items.find((item) => item.id === rec.id);
    if (written !== undefined) {
      return { rec, ...written };
    }
    return { rec, ...explainRecommendation(rec, lang), source: 'fallback' };
  });
}
