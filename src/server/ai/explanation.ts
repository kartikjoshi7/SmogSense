/** The plan's explanation: only the parts of Gemini's wording that pass the grounding check. */
import { z } from 'zod';
import type { AiExplanation } from '../../shared/api.js';
import { SETTINGS } from '../config.js';
import type { AiClient } from './gemini-client.js';
import { allowedNumbers, isGrounded, logUngrounded } from './grounding.js';
import { SYSTEM_INSTRUCTION, type Prompt, type PromptFacts } from './prompts.js';

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
 * The reply's item for each recommendation the prompt sent, in the plan's order. An item without
 * steps counts as not written: standard text stands in, as it does for an item left out.
 */
function writtenItems(facts: PromptFacts, reply: ExplanationReply): AiExplanation['items'] {
  return facts.recommendations.flatMap(({ id }) => {
    const written = reply.items.find((item) => item.id === id && item.steps.length > 0);
    return written === undefined ? [] : [{ id, why: written.why, steps: written.steps }];
  });
}

/** The reply's headline and summary when every number in them is allowed, else null. */
function groundedIntro(
  reply: ExplanationReply,
  allowed: ReadonlySet<number>,
): AiExplanation['intro'] {
  const { headline, summary } = reply;
  return isGrounded(`${headline} ${summary}`, allowed) ? { headline, summary } : null;
}

/** Keep only the grounded parts of a Gemini reply (none without one); log how many were dropped. */
function composeExplanation(facts: PromptFacts, reply: ExplanationReply | null): AiExplanation {
  if (reply === null) {
    return { intro: null, items: [] };
  }
  const allowed = allowedNumbers(facts);
  const written = writtenItems(facts, reply);
  const items = written.filter((item) => isGrounded([item.why, ...item.steps].join(' '), allowed));
  const intro = groundedIntro(reply, allowed);
  logUngrounded('explain', written.length - items.length + (intro === null ? 1 : 0));
  return { intro, items };
}

/** Gemini's wording for an explain prompt, keeping only the parts that pass the grounding check. */
export async function writeExplanation(client: AiClient, prompt: Prompt): Promise<AiExplanation> {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt: prompt.text,
    schema: explanationReply,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens.explain,
  });
  return composeExplanation(prompt.facts, reply.ok ? reply.value : null);
}
