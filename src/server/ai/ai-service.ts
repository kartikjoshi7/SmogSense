/** The AI service: cached, per-client-metered Gemini text, always backed by standard guidance. */
import { fail } from '../../core/result.js';
import type {
  AiExplanation,
  ChatResponse,
  CommunityResponse,
  TextSource,
} from '../../shared/api.js';
import { createAllowance, type Allowance } from '../allowance.js';
import { TtlCache } from '../cache.js';
import { SETTINGS } from '../config.js';
import { digestOf } from '../hash.js';
import * as logger from '../logger.js';
import { writeExplanation } from './explanation.js';
import type { AiClient } from './gemini-client.js';
import {
  chatPrompt,
  communityPrompt,
  explainPrompt,
  type ChatInput,
  type ExplainInput,
  type NoticeInput,
} from './prompts.js';
import { writeAnswer, writeNotice } from './text-replies.js';

/** Gemini-written explanations, answers and notices, always backed by standard guidance. */
export interface AiService {
  explain(input: ExplainInput, caller: string): Promise<AiExplanation>;
  chat(input: ChatInput, caller: string): Promise<ChatResponse>;
  communityNotice(input: NoticeInput, caller: string): Promise<CommunityResponse>;
}

/**
 * Only responses with AI-written text are cached: fallbacks are free to rebuild, and the next
 * request may reach the model again.
 */
const hasAiText = (response: { readonly source: TextSource }): boolean => response.source === 'ai';

const explanationHasAiText = (response: AiExplanation): boolean =>
  response.intro !== null || response.items.length > 0;

/** One cache per kind of response, all sharing the entry cap and the clock. */
function responseCaches(now: () => number) {
  const options = { maxEntries: SETTINGS.cacheMaxEntries, now };
  return {
    explanations: new TtlCache<AiExplanation>({ ...options, ttlMs: SETTINGS.aiCacheTtlMs }),
    notices: new TtlCache<CommunityResponse>({ ...options, ttlMs: SETTINGS.aiCacheTtlMs }),
    answers: new TtlCache<ChatResponse>({ ...options, ttlMs: SETTINGS.chatCacheTtlMs }),
  };
}

/**
 * The model as one caller sees it. Each call spends that caller's share of the day's model calls;
 * only a cache miss gets here, so a cached answer costs nothing. Once the share is spent, the
 * call fails and the caller gets standard text.
 */
function meteredModel(client: AiClient, allowance: Allowance, caller: string): AiClient {
  return {
    generate(request) {
      if (allowance.take(caller).ok) {
        return client.generate(request);
      }
      logger.warn('Gemini skipped', { reason: 'client_allowance_spent' });
      return Promise.resolve(fail('unavailable'));
    },
  };
}

/** Create the AI service with response caches; the Gemini client is injected. */
export function createAiService(deps: {
  readonly client: AiClient;
  readonly now: () => number;
}): AiService {
  const { explanations, notices, answers } = responseCaches(deps.now);
  const allowance = createAllowance({
    limit: SETTINGS.aiRequestsPerClientPerDay,
    windowMs: SETTINGS.aiDailyWindowMs,
    maxClients: SETTINGS.rateLimitMaxClients,
    now: deps.now,
  });
  const modelFor = (caller: string) => meteredModel(deps.client, allowance, caller);

  return {
    // Every cache is keyed on the exact prompt: a reply covers only what its prompt sent, and the
    // route ties an explanation to the caller's own plan by that plan's key.
    explain(input, caller) {
      const prompt = explainPrompt(input);
      const load = () => writeExplanation(modelFor(caller), prompt);
      return explanations.getOrLoad(digestOf('explain', prompt.text), load, explanationHasAiText);
    },
    chat(input, caller) {
      const prompt = chatPrompt(input);
      const load = () => writeAnswer(modelFor(caller), input, prompt);
      return answers.getOrLoad(digestOf('chat', prompt.text), load, hasAiText);
    },
    communityNotice(input, caller) {
      const prompt = communityPrompt(input);
      const load = () => writeNotice(modelFor(caller), input, prompt);
      return notices.getOrLoad(digestOf('notice', prompt.text), load, hasAiText);
    },
  };
}
