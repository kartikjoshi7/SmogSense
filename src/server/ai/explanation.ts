/** The plan's explanation: only the parts of Gemini's wording that pass the grounding check. */
import { z } from 'zod';
import type { AiExplanation } from '../../shared/api.js';
import type { Plan } from '../../shared/plan.js';
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

/**
 * The AI's items that can be shown: one per recommendation in the plan, with at least one step,
 * and with every number in it a fact of the plan.
 */
function groundedItems(
  plan: Plan,
  reply: ExplanationReply,
  allowed: ReadonlySet<number>,
): AiExplanation['items'] {
  return plan.recommendations.flatMap((rec) => {
    const written = reply.items.find((item) => item.id === rec.id);
    const usable =
      written !== undefined &&
      written.steps.length > 0 &&
      isGrounded([written.why, ...written.steps].join(' '), allowed);
    return usable ? [{ id: rec.id, why: written.why, steps: written.steps }] : [];
  });
}

/** The reply's headline and summary when every number in them is a plan fact, else null. */
function groundedIntro(
  reply: ExplanationReply,
  allowed: ReadonlySet<number>,
): AiExplanation['intro'] {
  const { headline, summary } = reply;
  return isGrounded(`${headline} ${summary}`, allowed) ? { headline, summary } : null;
}

/** Keep only the grounded parts of a Gemini reply (none without one); log what was dropped. */
function composeExplanation(plan: Plan, reply: ExplanationReply | null): AiExplanation {
  if (reply === null) {
    return { intro: null, items: [] };
  }
  const allowed = allowedNumbers(plan);
  const items = groundedItems(plan, reply, allowed);
  const intro = groundedIntro(reply, allowed);
  const planIds = new Set<string>(plan.recommendations.map((rec) => rec.id));
  const droppedItems = reply.items.filter(
    (written) => planIds.has(written.id) && !items.some((item) => item.id === written.id),
  ).length;
  logUngrounded('explain', droppedItems + (intro === null ? 1 : 0));
  return { intro, items };
}

/** Gemini's wording for a plan, keeping only the parts that pass the grounding check. */
export async function writeExplanation(
  client: AiClient,
  input: ExplainInput,
): Promise<AiExplanation> {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt: explainPrompt(input),
    schema: explanationReply,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens.explain,
  });
  return composeExplanation(input.plan, reply.ok ? reply.value : null);
}
