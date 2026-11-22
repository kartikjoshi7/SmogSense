import { z } from 'zod';
import { explainRecommendation, planHeadline, planSummary } from '../../core/explain/index.js';
import type { ExplainResponse, TextSource } from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import type { Plan } from '../../shared/plan.js';
import type { Recommendation } from '../../shared/recommendation.js';
import { SETTINGS } from '../config.js';
import type { AiClient } from './gemini-client.js';
import { allowedNumbers, isGrounded, logUngrounded } from './grounding.js';
import { SYSTEM_INSTRUCTION, explainPrompt, type ExplainInput } from './prompts.js';

const LIMITS = SETTINGS.aiReplyChars;

const explanationReply = z.object({
  headline: z.string().min(1).max(LIMITS.headline),
  summary: z.string().min(1).max(LIMITS.summary),
  items: z.array(
    z.object({
      id: z.string(),
      why: z.string().min(1).max(LIMITS.why),
      steps: z.array(z.string().min(1).max(LIMITS.step)).max(SETTINGS.aiMaxSteps),
    }),
  ),
});
type ExplanationReply = z.infer<typeof explanationReply>;

function explainItem(
  rec: Recommendation,
  lang: Language,
  ai: { readonly reply: ExplanationReply | null; readonly allowed: ReadonlySet<number> },
): ExplainResponse['items'][number] {
  const standard = explainRecommendation(rec, lang);
  const written = ai.reply?.items.find((item) => item.id === rec.id);
  return written !== undefined && isGrounded([written.why, ...written.steps].join(' '), ai.allowed)
    ? { id: rec.id, title: standard.title, why: written.why, steps: written.steps, source: 'ai' }
    : { id: rec.id, ...standard, steps: [...standard.steps], source: 'fallback' };
}

/** The reply's headline and summary when every number in them is a plan fact, else null. */
function groundedIntro(
  reply: ExplanationReply | null,
  allowed: ReadonlySet<number>,
): Pick<ExplanationReply, 'headline' | 'summary'> | null {
  return reply !== null && isGrounded(`${reply.headline} ${reply.summary}`, allowed) ? reply : null;
}

/** How many parts of a reply were written but dropped by the grounding check. */
function droppedParts(
  reply: ExplanationReply,
  items: readonly ExplainResponse['items'][number][],
  introSource: TextSource,
): number {
  const droppedItems = items.filter(
    (item) => item.source === 'fallback' && reply.items.some((written) => written.id === item.id),
  ).length;
  return droppedItems + (introSource === 'fallback' ? 1 : 0);
}

/** Merge a Gemini reply (or none) with standard guidance, keeping only grounded AI text. */
function composeExplanation(
  plan: Plan,
  lang: Language,
  reply: ExplanationReply | null,
): ExplainResponse {
  const allowed = allowedNumbers(plan);
  const items = plan.recommendations.map((rec) => explainItem(rec, lang, { reply, allowed }));
  const intro = groundedIntro(reply, allowed);
  const introSource: TextSource = intro === null ? 'fallback' : 'ai';
  if (reply !== null) {
    logUngrounded('explain', droppedParts(reply, items, introSource));
  }
  return {
    headline: intro?.headline ?? planHeadline(plan, lang),
    summary: intro?.summary ?? planSummary(plan, lang),
    introSource,
    items,
  };
}

/**
 * The explanation of a plan: Gemini's wording where it is grounded, standard guidance elsewhere.
 */
export async function writeExplanation(
  client: AiClient,
  input: ExplainInput,
): Promise<ExplainResponse> {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt: explainPrompt(input),
    schema: explanationReply,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens.explain,
  });
  return composeExplanation(input.plan, input.lang, reply.ok ? reply.value : null);
}
