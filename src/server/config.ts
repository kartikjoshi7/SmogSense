import { z } from 'zod';

const emptyToUndefined = (val: unknown): unknown => (val === '' ? undefined : val);

const envSchema = z.object({
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GEMINI_MODELS: z
    .preprocess(emptyToUndefined, z.string().default('gemini-3.5-flash-lite,gemini-3.8-flash'))
    .transform((v) => v.split(',')),
  GEMINI_DAILY_BUDGET: z.preprocess(emptyToUndefined, z.coerce.number().default(200)),
  ALLOWED_ORIGIN: z.preprocess(emptyToUndefined, z.url().optional()),
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'production', 'test']).default('development'),
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables with Zod.
 */
export function parseConfig(raw: Record<string, unknown>): EnvConfig {
  return envSchema.parse(raw);
}

/** Parsed and validated environment configuration. */
export const env = parseConfig(process.env);

/** Request body size limit in bytes (16 KB). */
export const BODY_LIMIT_BYTES = 16_384;

/** Default timeout for outbound HTTP requests in milliseconds. */
export const OUTBOUND_TIMEOUT_MS = 10_000;

/** Time-to-live for cached responses in milliseconds (5 minutes). */
export const CACHE_TTL_MS = 300_000;

/** Maximum number of AI requests per IP per day. */
export const RATE_LIMIT_DAILY = 50;
