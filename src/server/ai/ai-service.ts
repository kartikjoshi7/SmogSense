import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  explainRecommendation,
  fallbackChatAnswer,
  fallbackCommunityNotice,
  planHeadline,
  planSummary,
} from '../../core/explain/index.js';
import {
  type Audience,
  type ChatResponse,
  type ChatTurn,
  type CommunityResponse,
  type ExplainResponse,
  type TextSource,
} from '../../shared/api.js';
import { CHAT_LIMITS } from '../../shared/limits.js';
import type { Language } from '../../shared/languages.js';
import type { Plan, Recommendation } from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import { TtlCache } from '../cache.js';
import { SETTINGS } from '../config.js';
import * as logger from '../logger.js';
import type { AiClient } from './gemini-client.js';
import { allowedNumbers, isGrounded } from './grounding.js';
import { SYSTEM_INSTRUCTION, chatPrompt, communityPrompt, explainPrompt } from './prompts.js';

const explanationReply = z.object({
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  items: z.array(
    z.object({
      id: z.string(),
      why: z.string().min(1).max(600),
      steps: z.array(z.string().min(1).max(200)).max(3),
    }),
  ),
});
type ExplanationReply = z.infer<typeof explanationReply>;

const chatReply = z.object({ answer: z.string().min(1).max(CHAT_LIMITS.turnChars) });
const noticeReply = z.object({ notice: z.string().min(1).max(CHAT_LIMITS.turnChars) });

interface ChatInput {
  readonly plan: Plan;
  readonly profile: Profile;
  readonly lang: Language;
  readonly question: string;
  readonly history: readonly ChatTurn[];
}

/** Gemini-written explanations, answers and notices, always backed by standard guidance. */
export interface AiService {
  explain(plan: Plan, profile: Profile, lang: Language): Promise<ExplainResponse>;
  chat(input: ChatInput): Promise<ChatResponse>;
  communityNotice(plan: Plan, audience: Audience, lang: Language): Promise<CommunityResponse>;
}

/** Record AI text that was dropped for quoting numbers the plan does not contain. */
function logUngrounded(kind: 'explain' | 'chat' | 'notice', rejected: number): void {
  if (rejected > 0) {
    logger.warn('AI text failed the grounding check', { kind, rejected });
  }
}

/**
 * AI-written text when the model answered and every number in it is a plan fact, else null.
 * A reply dropped by the grounding check is logged.
 */
function groundedText(
  kind: 'chat' | 'notice',
  text: string | null,
  allowed: ReadonlySet<number>,
): string | null {
  if (text === null) {
    return null;
  }
  const passes = isGrounded(text, allowed);
  logUngrounded(kind, passes ? 0 : 1);
  return passes ? text : null;
}

function cacheKey(...parts: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

/**
 * Return a cached response or produce a new one. Only AI-written responses are cached:
 * fallbacks are free to rebuild, and the next request may reach the model again.
 */
async function memo<R extends { readonly source: string }>(
  cache: TtlCache<R>,
  key: string,
  produce: () => Promise<R>,
): Promise<R> {
  const hit = cache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const response = await produce();
  if (response.source !== 'fallback') {
    cache.set(key, response);
  }
  return response;
}

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

/** "ai" when every part (headline and items) is AI-written, "fallback" when none is, else "mixed". */
function overallSource(parts: readonly TextSource[]): ExplainResponse['source'] {
  const aiCount = parts.filter((source) => source === 'ai').length;
  if (aiCount === 0) {
    return 'fallback';
  }
  return aiCount === parts.length ? 'ai' : 'mixed';
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
  const introGrounded = reply !== null && isGrounded(`${reply.headline} ${reply.summary}`, allowed);
  const intro = introGrounded ? reply : null;
  const introSource: TextSource = intro === null ? 'fallback' : 'ai';
  if (reply !== null) {
    logUngrounded('explain', droppedParts(reply, items, introSource));
  }
  return {
    headline: intro?.headline ?? planHeadline(plan, lang),
    summary: intro?.summary ?? planSummary(plan, lang),
    introSource,
    items,
    source: overallSource([introSource, ...items.map((item) => item.source)]),
  };
}

/** Create the AI service with response caches; the Gemini client is injected. */
export function createAiService(deps: {
  readonly client: AiClient;
  readonly now: () => number;
}): AiService {
  const options = { maxEntries: SETTINGS.cacheMaxEntries, now: deps.now };
  const explanations = new TtlCache<ExplainResponse>({ ...options, ttlMs: SETTINGS.aiCacheTtlMs });
  const notices = new TtlCache<CommunityResponse>({ ...options, ttlMs: SETTINGS.aiCacheTtlMs });
  const answers = new TtlCache<ChatResponse>({ ...options, ttlMs: SETTINGS.chatCacheTtlMs });

  return {
    explain(plan, profile, lang) {
      // The response carries standard text for every recommendation, so it is keyed on the
      // whole plan, not only on the part the model sees.
      return memo(explanations, cacheKey('explain', lang, plan, profile.members), async () => {
        const top = plan.recommendations.slice(0, SETTINGS.aiExplainTopN);
        const reply = await deps.client.generate({
          system: SYSTEM_INSTRUCTION,
          prompt: explainPrompt(plan, profile, lang, top),
          schema: explanationReply,
          maxOutputTokens: SETTINGS.aiMaxOutputTokens.explain,
        });
        return composeExplanation(plan, lang, reply.ok ? reply.value : null);
      });
    },

    chat(input) {
      const prompt = chatPrompt(input.plan, input.profile, input.lang, input);
      return memo(answers, cacheKey('chat', prompt), async () => {
        const reply = await deps.client.generate({
          system: SYSTEM_INSTRUCTION,
          prompt,
          schema: chatReply,
          maxOutputTokens: SETTINGS.aiMaxOutputTokens.chat,
        });
        const allowed = allowedNumbers(input.plan);
        const answer = groundedText('chat', reply.ok ? reply.value.answer : null, allowed);
        return answer === null
          ? { answer: fallbackChatAnswer(input.plan, input.lang), source: 'fallback' }
          : { answer, source: 'ai' };
      });
    },

    communityNotice(plan, audience, lang) {
      const prompt = communityPrompt(plan, audience, lang);
      return memo(notices, cacheKey('notice', prompt), async () => {
        const reply = await deps.client.generate({
          system: SYSTEM_INSTRUCTION,
          prompt,
          schema: noticeReply,
          maxOutputTokens: SETTINGS.aiMaxOutputTokens.notice,
        });
        const allowed = allowedNumbers(plan);
        const notice = groundedText('notice', reply.ok ? reply.value.notice : null, allowed);
        return notice === null
          ? { notice: fallbackCommunityNotice(plan, audience, lang), source: 'fallback' }
          : { notice, source: 'ai' };
      });
    },
  };
}
