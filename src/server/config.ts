import { z } from 'zod';
import { HOURS_PER_DAY, MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from '../shared/limits.js';

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
    )
    .pipe(z.array(z.string()).min(1, 'GEMINI_MODELS needs at least one model id')),
  GEMINI_DAILY_BUDGET: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(200)),
  GEMINI_THINKING_LEVEL: z.preprocess(
    emptyToUndefined,
    z.enum(['OFF', 'MINIMAL', 'LOW']).default('MINIMAL'),
  ),
  ALLOWED_ORIGIN: z.preprocess(emptyToUndefined, z.url().optional()),
  /** Production unless the platform says otherwise, so a missing value never loosens CORS. */
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'production', 'test']).default('production'),
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;

/** Validate environment variables; throws with a clear message when one is malformed. */
export function parseConfig(raw: Record<string, unknown>): EnvConfig {
  return envSchema.parse(raw);
}

export const SECOND_MS = 1000;
const MINUTE_MS = SECONDS_PER_MINUTE * SECOND_MS;
const DAY_SECONDS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

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
  geocodeCacheTtlMs: DAY_SECONDS * SECOND_MS,
  /** How long the CDN may keep place search results (they change rarely). */
  geocodeCdnMaxAgeSeconds: DAY_SECONDS,
  /** Places one city search returns. */
  geocodeResults: 5,
  /** Days of air data asked for: yesterday, for the trailing 24-hour index, and two days ahead. */
  airPastDays: 1,
  airForecastDays: 2,
  /** Decimal places coordinates are rounded to before any lookup (0.1° ≈ 11 km). */
  coordinateDecimals: 1,
  rateLimitWindowMs: MINUTE_MS,
  dataRequestsPerWindow: 60,
  aiRequestsPerWindow: 10,
  /**
   * AI requests one client may make in a day. A request can try both models, so one client
   * spends at most 60 calls of the default daily budget of 200; a family uses far fewer.
   */
  aiRequestsPerClientPerDay: 30,
  aiDailyWindowMs: DAY_SECONDS * SECOND_MS,
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
  /** Only the highest-priority recommendations go into explain and chat prompts, to save tokens. */
  aiPromptTopN: 8,
  aiMaxOutputTokens: { explain: 900, chat: 400, notice: 400 },
  /** Longest text the model may return for each part of a reply, in characters. */
  aiReplyChars: { headline: 120, summary: 600, why: 600, step: 200, notice: 1200 },
  /** Longest chat answer and community notice the prompts ask for. */
  aiAnswerSentences: 4,
  aiNoticeWords: 120,
  /** Most steps the model may write for one recommendation. */
  aiMaxSteps: 3,
  aiCacheTtlMs: 30 * MINUTE_MS,
  chatCacheTtlMs: 10 * MINUTE_MS,
} as const;
