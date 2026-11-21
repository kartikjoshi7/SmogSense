import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const envSchema = z.object({
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GEMINI_MODELS: z
    .preprocess(emptyToUndefined, z.string().default('gemini-3.5-flash-lite,gemini-3.8-flash'))
    .transform((list) =>
      list
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean),
    ),
  GEMINI_DAILY_BUDGET: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(200)),
  GEMINI_THINKING_LEVEL: z.preprocess(
    emptyToUndefined,
    z.enum(['OFF', 'MINIMAL', 'LOW']).default('MINIMAL'),
  ),
  ALLOWED_ORIGIN: z.preprocess(emptyToUndefined, z.url().optional()),
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'production', 'test']).default('development'),
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;

/** Validate environment variables; throws with a clear message when one is malformed. */
export function parseConfig(raw: Record<string, unknown>): EnvConfig {
  return envSchema.parse(raw);
}

const MINUTE_MS = 60_000;

/** Runtime limits and timings — every operational number lives here. */
export const SETTINGS = {
  /** Largest accepted request body. */
  bodyLimitBytes: 16_384,
  /** Per-request timeout for Open-Meteo calls. */
  upstreamTimeoutMs: 5_000,
  /** Extra attempts after a network error or 5xx from Open-Meteo. */
  upstreamRetries: 1,
  cacheMaxEntries: 500,
  airCacheTtlMs: 15 * MINUTE_MS,
  geocodeCacheTtlMs: 24 * 60 * MINUTE_MS,
  /** How long the CDN may keep place search results (they change rarely). */
  geocodeCdnMaxAgeSeconds: 24 * 60 * 60,
  /** Decimal places coordinates are rounded to before any lookup (0.1° ≈ 11 km). */
  coordinateDecimals: 1,
  rateLimitWindowMs: MINUTE_MS,
  dataRequestsPerWindow: 60,
  aiRequestsPerWindow: 10,
  /** Distinct clients tracked by the rate limiter before the oldest are forgotten. */
  rateLimitMaxClients: 10_000,
  /** Origin allowed during local development. */
  devOrigin: 'http://localhost:5173',
  /** How long a browser may reuse a CORS preflight answer. */
  corsMaxAgeSeconds: 600,
  /** Per-model timeout for one Gemini call. */
  aiTimeoutMs: 8_000,
  /** How long a model that answered 429 is skipped. */
  aiCooldownMs: 10 * MINUTE_MS,
  aiTemperature: 0.4,
  /** Only the highest-priority recommendations are sent for AI wording, to save tokens. */
  aiExplainTopN: 8,
  aiMaxOutputTokens: { explain: 900, chat: 400, notice: 400 },
  aiCacheTtlMs: 30 * MINUTE_MS,
  chatCacheTtlMs: 10 * MINUTE_MS,
} as const;
