import {
  ApiError,
  ThinkingLevel,
  type GenerateContentConfig,
  type GenerateContentParameters,
} from '@google/genai';
import { z, type ZodType } from 'zod';
import { API_STATUS } from '../../shared/api.js';
import { SETTINGS, type EnvConfig } from '../config.js';
import * as logger from '../logger.js';
import { fail, ok, type Result } from '../../core/result.js';

/**
 * No model gave a usable answer: no key, budget spent, every model rate-limited or failing, or
 * replies that broke the schema. Callers fall back to standard guidance either way; the reason
 * for each model is logged.
 */
type AiFailure = 'unavailable';

interface AiRequest<T> {
  readonly system: string;
  readonly prompt: string;
  /** The JSON shape the model must return; also used to validate the reply. */
  readonly schema: ZodType<T>;
  readonly maxOutputTokens: number;
}

/** The only way the rest of the server talks to a language model. */
export interface AiClient {
  generate<T>(request: AiRequest<T>): Promise<Result<T, AiFailure>>;
}

/** The one SDK call the client needs, injected so tests never reach the real API. */
export type GenerateContent = (
  params: GenerateContentParameters,
) => Promise<{ readonly text: string | undefined }>;

export interface GeminiOptions {
  /** Null when no API key is configured. */
  readonly generate: GenerateContent | null;
  readonly models: readonly string[];
  readonly thinkingLevel: EnvConfig['GEMINI_THINKING_LEVEL'];
  /** Calls allowed per UTC day on this instance (the free tier is small). */
  readonly dailyBudget: number;
  readonly now: () => number;
}

/** Why one model's attempt failed: a 429 (the model cools down) or anything else. */
type ModelFailure = 'rate_limited' | 'failed';

/** Why a reply was rejected, for the logs. */
type ReplyProblem = 'empty' | 'not_json' | 'off_schema';

/** Each reply schema in JSON Schema form, converted on first use: the schemas never change. */
const jsonSchemas = new WeakMap<ZodType, object>();

function jsonSchemaOf(schema: ZodType): object {
  const known = jsonSchemas.get(schema);
  if (known !== undefined) {
    return known;
  }
  const { $schema: _schemaUri, ...jsonSchema } = z.toJSONSchema(schema);
  jsonSchemas.set(schema, jsonSchema);
  return jsonSchema;
}

function requestConfig<T>(
  request: AiRequest<T>,
  thinking: GeminiOptions['thinkingLevel'],
): GenerateContentConfig {
  return {
    systemInstruction: request.system,
    responseMimeType: 'application/json',
    responseJsonSchema: jsonSchemaOf(request.schema),
    temperature: SETTINGS.aiTemperature,
    maxOutputTokens: request.maxOutputTokens,
    abortSignal: AbortSignal.timeout(SETTINGS.aiTimeoutMs),
    ...(thinking === 'OFF' ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel[thinking] } }),
  };
}

function parseReply<T>(text: string | undefined, schema: ZodType<T>): Result<T, ReplyProblem> {
  if (text === undefined) {
    return fail('empty');
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('not_json');
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? ok(parsed.data) : fail('off_schema');
}

/** One attempt with one model: the validated reply, or why it failed (each failure is logged). */
async function callModel<T>(
  generate: GenerateContent,
  model: string,
  request: AiRequest<T>,
  thinking: GeminiOptions['thinkingLevel'],
): Promise<Result<T, ModelFailure>> {
  let text: string | undefined;
  try {
    const reply = await generate({
      model,
      contents: request.prompt,
      config: requestConfig(request, thinking),
    });
    text = reply.text;
  } catch (error: unknown) {
    const rateLimited = error instanceof ApiError && error.status === API_STATUS.tooManyRequests;
    logger.warn('Gemini call failed', {
      model,
      reason: rateLimited ? 'rate_limited' : errorName(error),
    });
    return fail(rateLimited ? 'rate_limited' : 'failed');
  }
  const parsed = parseReply(text, request.schema);
  if (!parsed.ok) {
    logger.warn('Gemini reply rejected', { model, reason: parsed.error });
    return fail('failed');
  }
  return parsed;
}

/** The error's class name for logs — never its message, which could echo the prompt. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/** A daily call counter that resets at midnight UTC. */
function dailyBudget(limit: number, now: () => number): () => boolean {
  let day = '';
  let used = 0;
  return () => {
    const today = new Date(now()).toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      used = 0;
    }
    used += 1;
    return used <= limit;
  };
}

/**
 * A Gemini client built for the free tier: it walks the model list in order, skips a model for
 * 10 minutes after a 429, stops at the daily budget, and validates every reply against its schema.
 */
export function createGeminiClient(options: GeminiOptions): AiClient {
  const coolingUntil = new Map<string, number>();
  const takeBudget = dailyBudget(options.dailyBudget, options.now);

  async function tryModels<T>(
    generate: GenerateContent,
    request: AiRequest<T>,
  ): Promise<Result<T, AiFailure>> {
    const ready = options.models.filter((m) => (coolingUntil.get(m) ?? 0) <= options.now());
    if (ready.length === 0) {
      logger.warn('Gemini skipped', { reason: 'all_cooling_down' });
    }
    for (const model of ready) {
      if (!takeBudget()) {
        logger.warn('Gemini skipped', { reason: 'budget_spent' });
        break;
      }
      const reply = await callModel(generate, model, request, options.thinkingLevel);
      if (reply.ok) {
        return reply;
      }
      if (reply.error === 'rate_limited') {
        coolingUntil.set(model, options.now() + SETTINGS.aiCooldownMs);
      }
    }
    return fail('unavailable');
  }

  return {
    generate(request) {
      const { generate } = options;
      if (generate === null) {
        logger.warn('Gemini skipped', { reason: 'no_key' });
        return Promise.resolve(fail('unavailable'));
      }
      return tryModels(generate, request);
    },
  };
}
