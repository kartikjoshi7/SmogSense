import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  explainRecommendation,
  fallbackChatAnswer,
  fallbackCommunityNotice,
  planHeadline,
  planSummary,
} from '../../core/explain/index.js';
import type {
  ChatResponse,
  CommunityResponse,
  ExplainResponse,
  TextSource,
} from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import { CHAT_LIMITS } from '../../shared/limits.js';
import type { Plan, Recommendation } from '../../shared/plan.js';
import { TtlCache } from '../cache.js';
import { SETTINGS } from '../config.js';
import * as logger from '../logger.js';
import type { AiClient } from './gemini-client.js';
import { allowedNumbers, isGrounded } from './grounding.js';
import {
  SYSTEM_INSTRUCTION,
  chatPrompt,
  communityPrompt,
  explainPrompt,
  type ChatInput,
  type ExplainInput,
  type NoticeInput,
} from './prompts.js';

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

/** An answer may be sent back as chat history, so it is no longer than a history turn. */
const chatReply = z.object({ answer: z.string().min(1).max(CHAT_LIMITS.turnChars) });
const noticeReply = z.object({ notice: z.string().min(1).max(LIMITS.notice) });

/** Gemini-written explanations, answers and notices, always backed by standard guidance. */
export interface AiService {
  explain(input: ExplainInput): Promise<ExplainResponse>;
  chat(input: ChatInput): Promise<ChatResponse>;
  communityNotice(input: NoticeInput): Promise<CommunityResponse>;
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
 * Only responses with AI-written text are cached: fallbacks are free to rebuild, and the next
 * request may reach the model again.
 */
const hasAiText = (response: { readonly source: TextSource }): boolean => response.source === 'ai';

const explanationHasAiText = (response: ExplainResponse): boolean =>
  response.introSource === 'ai' || response.items.some(hasAiText);

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
  };
}

/** The explanation of a plan: Gemini's wording where it is grounded, standard guidance elsewhere. */
async function writeExplanation(client: AiClient, input: ExplainInput): Promise<ExplainResponse> {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt: explainPrompt(input),
    schema: explanationReply,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens.explain,
  });
  return composeExplanation(input.plan, input.lang, reply.ok ? reply.value : null);
}

/** A grounded answer to a chat question, or the day's top actions when there is none. */
async function writeAnswer(client: AiClient, input: ChatInput, prompt: string) {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt,
    schema: chatReply,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens.chat,
  });
  const allowed = allowedNumbers(input.plan);
  const answer = groundedText('chat', reply.ok ? reply.value.answer : null, allowed);
  const response: ChatResponse =
    answer === null
      ? { answer: fallbackChatAnswer(input.plan, input.lang), source: 'fallback' }
      : { answer, source: 'ai' };
  return response;
}

/** A grounded community notice, or the standard notice when there is none. */
async function writeNotice(client: AiClient, input: NoticeInput, prompt: string) {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt,
    schema: noticeReply,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens.notice,
  });
  const allowed = allowedNumbers(input.plan);
  const notice = groundedText('notice', reply.ok ? reply.value.notice : null, allowed);
  const response: CommunityResponse =
    notice === null
      ? {
          notice: fallbackCommunityNotice(input.plan, input.audience, input.lang),
          source: 'fallback',
        }
      : { notice, source: 'ai' };
  return response;
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
    explain(input) {
      // The response carries standard text for every recommendation, so it is keyed on the
      // whole plan, not only on the part the model sees.
      const key = cacheKey('explain', input.lang, input.plan, input.profile.members);
      return explanations.getOrLoad(
        key,
        () => writeExplanation(deps.client, input),
        explanationHasAiText,
      );
    },
    chat(input) {
      const prompt = chatPrompt(input);
      const load = () => writeAnswer(deps.client, input, prompt);
      return answers.getOrLoad(cacheKey('chat', prompt), load, hasAiText);
    },
    communityNotice(input) {
      const prompt = communityPrompt(input);
      const load = () => writeNotice(deps.client, input, prompt);
      return notices.getOrLoad(cacheKey('notice', prompt), load, hasAiText);
    },
  };
}
