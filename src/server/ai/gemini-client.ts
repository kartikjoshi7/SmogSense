import {
  ApiError,
  ThinkingLevel,
  type GenerateContentConfig,
  type GenerateContentParameters,
} from '@google/genai';
import { z, type ZodType } from 'zod';
import { SETTINGS, type EnvConfig } from '../config.js';
import * as logger from '../logger.js';
import { fail, ok, type Result } from '../result.js';

/** No model could answer (no key, budget spent, all failing), or answers broke the schema. */
type AiFailure = 'unavailable' | 'invalid_output';

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

type ModelFailure = 'rate_limited' | 'failed' | 'invalid_output';

function requestConfig<T>(
  request: AiRequest<T>,
  thinking: GeminiOptions['thinkingLevel'],
): GenerateContentConfig {
  const { $schema: _schemaUri, ...jsonSchema } = z.toJSONSchema(request.schema);
  return {
    systemInstruction: request.system,
    responseMimeType: 'application/json',
    responseJsonSchema: jsonSchema,
    temperature: SETTINGS.aiTemperature,
    maxOutputTokens: request.maxOutputTokens,
    abortSignal: AbortSignal.timeout(SETTINGS.aiTimeoutMs),
    ...(thinking === 'OFF' ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel[thinking] } }),
  };
}

function parseReply<T>(text: string | undefined, schema: ZodType<T>): Result<T, ModelFailure> {
  if (text === undefined) {
    return fail('invalid_output');
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('invalid_output');
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? ok(parsed.data) : fail('invalid_output');
}

async function callModel<T>(
  generate: GenerateContent,
  model: string,
  request: AiRequest<T>,
  thinking: GeminiOptions['thinkingLevel'],
): Promise<Result<T, ModelFailure>> {
  try {
    const reply = await generate({
      model,
      contents: request.prompt,
      config: requestConfig(request, thinking),
    });
    return parseReply(reply.text, request.schema);
  } catch (error: unknown) {
    const rateLimited = error instanceof ApiError && error.status === 429;
    logger.warn('Gemini call failed', {
      model,
      reason: rateLimited ? 'rate_limited' : errorName(error),
    });
    return fail(rateLimited ? 'rate_limited' : 'failed');
  }
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
    let failure: AiFailure = 'unavailable';
    const ready = options.models.filter((m) => (coolingUntil.get(m) ?? 0) <= options.now());
    for (const model of ready) {
      if (!takeBudget()) {
        break;
      }
      const reply = await callModel(generate, model, request, options.thinkingLevel);
      if (reply.ok) {
        return reply;
      }
      if (reply.error === 'rate_limited') {
        coolingUntil.set(model, options.now() + SETTINGS.aiCooldownMs);
      }
      failure = reply.error === 'invalid_output' ? 'invalid_output' : failure;
    }
    return fail(failure);
  }

  return {
    generate(request) {
      const { generate } = options;
      return generate === null
        ? Promise.resolve(fail('unavailable'))
        : tryModels(generate, request);
    },
  };
}
