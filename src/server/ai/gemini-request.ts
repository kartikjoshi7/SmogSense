/** The Gemini request a call sends, and how its reply is checked. */
import { ThinkingLevel, type GenerateContentConfig } from '@google/genai';
import { z, type ZodType } from 'zod';
import { fail, ok, type Result } from '../../core/result.js';
import { SETTINGS, type EnvConfig } from '../config.js';

/** What the rest of the server asks a model for: instructions, a prompt and the reply's shape. */
export interface AiRequest<T> {
  readonly system: string;
  readonly prompt: string;
  /** The JSON shape the model must return; also used to validate the reply. */
  readonly schema: ZodType<T>;
  readonly maxOutputTokens: number;
}

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

/** The SDK settings for one request: JSON output in the reply's schema, limits and thinking. */
export function requestConfig<T>(
  request: AiRequest<T>,
  thinking: EnvConfig['GEMINI_THINKING_LEVEL'],
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

/** The model's reply checked against its schema, or why it was rejected. */
export function parseReply<T>(
  text: string | undefined,
  schema: ZodType<T>,
): Result<T, ReplyProblem> {
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
