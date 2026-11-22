/** The API under test: the real app with fakes, and the helpers its tests share. */
import { z } from 'zod';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { fail, ok } from '../../core/result.js';
import { createAiService } from '../ai/ai-service.js';
import { createApp, type AppDeps } from '../app.js';
import { parseConfig } from '../config.js';
import { fakeAir } from './fake-air.js';

export const ORIGIN = 'https://smog-sense-sigma.vercel.app';

/** Every error response: a safe, human-readable message, plus field issues for bad input. */
export const errorResponseSchema = z.strictObject({
  error: z.string(),
  issues: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
});

/** The real app with the fake air service and a model that never answers. */
export function app(overrides: Partial<AppDeps> = {}) {
  return createApp({
    config: parseConfig({ ALLOWED_ORIGIN: ORIGIN }),
    air: fakeAir(),
    ai: createAiService({
      client: { generate: () => Promise.resolve(fail('unavailable')) },
      now: () => 0,
    }),
    now: () => 0,
    ...overrides,
  });
}

/** POST a JSON body to /api/plan. */
export function postPlan(body: unknown, init: RequestInit = {}) {
  return app().request('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
}

export const validPlanRequest = { profile: SHARMA_FAMILY, location: { lat: 28.61, lon: 77.21 } };

/** A chat reply with plain advice, parsed by the schema the model was given (or a failure). */
export function parsedOrDown<T>(schema: z.ZodType<T>) {
  const parsed = schema.safeParse({ answer: 'Stay inside and keep the windows shut.' });
  return parsed.success ? ok(parsed.data) : fail('unavailable' as const);
}
