import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeAir } from '../core/fixtures/air.js';
import { SHARMA_FAMILY } from '../core/fixtures/profiles.js';
import { z } from 'zod';
import {
  chatResponseSchema,
  communityResponseSchema,
  explainResponseSchema,
  geocodeResponseSchema,
  planResponseSchema,
} from '../shared/api.js';
import type { AirService } from './air/air-service.js';
import { createAiService } from './ai/ai-service.js';
import { createApp, type AppDeps } from './app.js';
import { parseConfig } from './config.js';
import { fail, ok } from '../core/result.js';

const ORIGIN = 'https://smog-sense-sigma.vercel.app';

/** Every error response: a safe, human-readable message, plus field issues for bad input. */
const errorResponseSchema = z.strictObject({
  error: z.string(),
  issues: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
});
const GURUGRAM = { name: 'Gurugram', region: 'Haryana', country: 'India', lat: 28.46, lon: 77.03 };

function fakeAir(overrides: Partial<AirService> = {}): AirService {
  return {
    getAir: () => Promise.resolve(ok(makeAir())),
    searchPlaces: () => Promise.resolve(ok([GURUGRAM])),
    ...overrides,
  };
}

function app(overrides: Partial<AppDeps> = {}) {
  return createApp({
    config: parseConfig({ NODE_ENV: 'production', ALLOWED_ORIGIN: ORIGIN }),
    air: fakeAir(),
    ai: createAiService({
      client: { generate: () => Promise.resolve(fail('unavailable')) },
      now: () => 0,
    }),
    now: () => 0,
    ...overrides,
  });
}

function postPlan(body: unknown, init: RequestInit = {}) {
  return app().request('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
}

const validPlanRequest = { profile: SHARMA_FAMILY, location: { lat: 28.61, lon: 77.21 } };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('health, errors and headers', () => {
  it('reports health with security headers set', async () => {
    const res = await app().request('/api/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('answers unknown routes with a JSON 404', async () => {
    const res = await app().request('/api/nope');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('hides unexpected errors behind a safe 500 and logs them', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = app({
      air: fakeAir({ getAir: () => Promise.reject(new Error('database exploded')) }),
    });

    const res = await broken.request('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPlanRequest),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal error' });
    expect(String(error.mock.calls[0]?.[0])).toContain('database exploded');
  });

  it('rejects malformed JSON and oversized bodies without details', async () => {
    const malformed = await postPlan(undefined, { body: '{not json' });
    const huge = await postPlan({ padding: 'x'.repeat(20_000) });

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'Invalid request' });
    expect(huge.status).toBe(413);
  });
});

describe('CORS', () => {
  it('allows only the configured origin', async () => {
    const allowed = await app().request('/api/health', { headers: { Origin: ORIGIN } });
    const other = await app().request('/api/health', { headers: { Origin: 'https://evil.test' } });

    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('also allows the Vite dev server in development', async () => {
    const dev = app({ config: parseConfig({ NODE_ENV: 'development' }) });
    const res = await dev.request('/api/health', { headers: { Origin: 'http://localhost:5173' } });

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});

describe('GET /api/geocode', () => {
  it('returns matching places with a long CDN cache', async () => {
    const res = await app().request('/api/geocode?q=Gurugram');

    expect(geocodeResponseSchema.parse(await res.json())).toEqual({ places: [GURUGRAM] });
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=86400');
  });

  it.each(['a', '<script>', 'x'.repeat(61)])('rejects the query %j', async (q) => {
    const res = await app().request(`/api/geocode?q=${encodeURIComponent(q)}`);

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).issues?.[0]?.path).toBe('q');
  });

  it('answers 502 when the search service is down', async () => {
    const down = app({ air: fakeAir({ searchPlaces: () => Promise.resolve(fail('timeout')) }) });

    expect((await down.request('/api/geocode?q=Delhi')).status).toBe(502);
  });

  it('rate-limits a client after 60 requests a minute', async () => {
    const limited = app();
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) {
      statuses.push((await limited.request('/api/geocode?q=Delhi')).status);
    }

    expect(statuses.filter((s) => s === 200)).toHaveLength(60);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('POST /api/plan', () => {
  it('returns the household plan', async () => {
    const res = await postPlan(validPlanRequest);
    const { plan } = planResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(plan.index.scale).toBe('naqi');
    expect(plan.recommendations.length).toBeGreaterThan(5);
  });

  it('rejects an invalid profile and says where the problem is', async () => {
    const res = await postPlan({ ...validPlanRequest, location: { lat: 200, lon: 77 } });

    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).issues?.[0]?.path).toBe('location.lat');
  });

  it('answers 502 when air data is unavailable and 503 when it is too sparse', async () => {
    const down = app({ air: fakeAir({ getAir: () => Promise.resolve(fail('network')) }) });
    const sparse = app({
      air: fakeAir({
        getAir: () => Promise.resolve(ok(makeAir({ pm25Day: Array<null>(24).fill(null) }))),
      }),
    });
    const request = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPlanRequest),
    };

    expect((await down.request('/api/plan', request)).status).toBe(502);
    expect((await sparse.request('/api/plan', request)).status).toBe(503);
  });
});

describe('AI routes', () => {
  function post(path: string, body: unknown, target = app()) {
    return target.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('explains the plan with standard guidance when the model is unavailable', async () => {
    const res = await post('/api/explain', { ...validPlanRequest, lang: 'hi' });
    const body = explainResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(body.source).toBe('fallback');
    expect(body.items.length).toBeGreaterThan(5);
  });

  it('answers chat questions and writes community notices', async () => {
    const chat = await post('/api/chat', {
      ...validPlanRequest,
      lang: 'en',
      question: 'Can Aarav play outside at 4 pm?',
      history: [],
    });
    const notice = await post('/api/community', {
      ...validPlanRequest,
      lang: 'en',
      audience: 'housing_society',
    });

    expect(chatResponseSchema.parse(await chat.json()).source).toBe('fallback');
    expect(communityResponseSchema.parse(await notice.json()).notice).toContain('Dear residents');
  });

  it('validates AI requests before doing any work', async () => {
    const badLanguage = await post('/api/explain', { ...validPlanRequest, lang: 'fr' });
    const longQuestion = await post('/api/chat', {
      ...validPlanRequest,
      lang: 'en',
      question: 'x'.repeat(501),
      history: [],
    });

    expect(badLanguage.status).toBe(400);
    expect(longQuestion.status).toBe(400);
  });

  it('reports air-data failures on AI routes too', async () => {
    const down = app({ air: fakeAir({ getAir: () => Promise.resolve(fail('stale')) }) });
    const statuses = await Promise.all([
      post('/api/explain', { ...validPlanRequest, lang: 'en' }, down),
      post('/api/chat', { ...validPlanRequest, lang: 'en', question: 'Hi', history: [] }, down),
      post('/api/community', { ...validPlanRequest, lang: 'en', audience: 'school' }, down),
    ]);

    expect(statuses.map((r) => r.status)).toEqual([502, 502, 502]);
  });

  it('rate-limits AI routes after 10 requests a minute', async () => {
    const limited = app();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await post('/api/explain', { ...validPlanRequest, lang: 'en' }, limited)).status,
      );
    }

    expect(statuses.at(-1)).toBe(429);
    expect(statuses.filter((s) => s === 200)).toHaveLength(10);
  });
});
