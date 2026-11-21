import { makeAir } from '../../core/fixtures/air.js';
import { fail, ok } from '../../core/result.js';
import { createAiService } from '../../server/ai/ai-service.js';
import type { AiClient } from '../../server/ai/gemini-client.js';
import type { AirService } from '../../server/air/air-service.js';
import { createApp } from '../../server/app.js';
import { parseConfig } from '../../server/config.js';

/**
 * The SmogSense API as the Vitest UI tests and the Playwright end-to-end tests see it: the real
 * Hono app (validation, routes, engine, AI composition and the grounding check) with only the
 * outside world replaced. Open-Meteo becomes a Severe day in Delhi; Gemini becomes fixed,
 * labelled replies, or is switched off.
 */

/** A Severe day in Delhi, so the plan has protection, community and emergency content. */
const SEVERE_AIR = makeAir({ scale: 2.4 });

const GURUGRAM = { name: 'Gurugram', region: 'Haryana', country: 'India', lat: 28.46, lon: 77.03 };

/** The wording the fake model writes, so tests can tell it apart from standard guidance. */
export const FAKE_AI = {
  headline: 'AI headline: stay in today',
  summary: 'AI summary of the day.',
  why: 'AI reason.',
  step: 'AI step.',
  answer: 'Keep the children indoors today.',
  notice: 'Dear residents, please stay indoors.',
} as const;

/** One reply per kind of request; each request gets the reply its own schema accepts. */
const MODEL_REPLIES: readonly unknown[] = [
  {
    headline: FAKE_AI.headline,
    summary: FAKE_AI.summary,
    items: [{ id: 'run_purifier', why: FAKE_AI.why, steps: [FAKE_AI.step] }],
  },
  { answer: FAKE_AI.answer },
  { notice: FAKE_AI.notice },
];

function fakeModel(enabled: boolean): AiClient {
  return {
    generate(request) {
      const reply = enabled
        ? MODEL_REPLIES.map((candidate) => request.schema.safeParse(candidate)).find(
            (parsed) => parsed.success,
          )
        : undefined;
      return Promise.resolve(reply?.success ? ok(reply.data) : fail('unavailable'));
    },
  };
}

const ROUTES = ['geocode', 'plan', 'explain', 'chat', 'community'] as const;
type Route = (typeof ROUTES)[number];

export interface FakeApiOptions {
  /** Answer these routes with this status and safe message instead of running them. */
  readonly failures?: Partial<Record<Route, { readonly status: number; readonly error: string }>>;
  /** False when the AI is unavailable: every AI route answers with standard guidance. */
  readonly ai?: boolean;
}

function failureFor(request: Request, options: FakeApiOptions) {
  const path = new URL(request.url).pathname;
  const route = ROUTES.find((name) => path === `/api/${name}`);
  return route === undefined ? undefined : options.failures?.[route];
}

/** A fake API for one test; it keeps the app's caches and rate limits for that test only. */
export function createFakeApi(
  options: FakeApiOptions = {},
): (request: Request) => Promise<Response> {
  const air: AirService = {
    getAir: () => Promise.resolve(ok(SEVERE_AIR)),
    searchPlaces: () => Promise.resolve(ok([GURUGRAM])),
  };
  const app = createApp({
    config: parseConfig({ NODE_ENV: 'test' }),
    air,
    ai: createAiService({ client: fakeModel(options.ai ?? true), now: Date.now }),
    now: Date.now,
  });
  return async (request) => {
    const failure = failureFor(request, options);
    return failure === undefined
      ? app.fetch(request)
      : Response.json({ error: failure.error }, { status: failure.status });
  };
}
