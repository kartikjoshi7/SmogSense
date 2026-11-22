import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chatResponseSchema,
  communityResponseSchema,
  explainResponseSchema,
} from '../../shared/api.js';
import { createAiService } from '../ai/ai-service.js';
import { fail } from '../../core/result.js';
import { fakeAir } from '../test/fake-air.js';
import { app, parsedOrDown, validPlanRequest } from '../test/app-harness.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI routes', () => {
  function post(path: string, body: unknown, target = app(), ip = '1.1.1.1') {
    return target.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify(body),
    });
  }

  it('explains the plan with standard guidance when the model is unavailable', async () => {
    const res = await post('/api/explain', { ...validPlanRequest, lang: 'hi' });
    const body = explainResponseSchema.parse(await res.json());

    expect(res.status).toBe(200);
    expect(body.introSource).toBe('fallback');
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

  it('gives each client IP a daily allowance of 30 model answers, then standard guidance', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let clock = 0;
    const answering = createAiService({
      client: { generate: (request) => Promise.resolve(parsedOrDown(request.schema)) },
      now: () => clock,
    });
    const limited = app({ ai: answering, now: () => clock });
    const ask = async (question: string, ip: string) => {
      const body = { ...validPlanRequest, lang: 'en', question, history: [] };
      const res = await post('/api/chat', body, limited, ip);
      return { status: res.status, ...chatResponseSchema.parse(await res.json()) };
    };
    for (let i = 1; i <= 30; i++) {
      clock += 10 * 60_000; // spread out, so the per-minute limit never applies
      expect(await ask(`Question ${String(i)}?`, '1.1.1.1')).toMatchObject({ source: 'ai' });
    }
    clock += 10 * 60_000;

    expect(await ask('Question 31?', '1.1.1.1')).toMatchObject({ status: 200, source: 'fallback' });
    expect(await ask('Question 31?', '2.2.2.2')).toMatchObject({ status: 200, source: 'ai' });
    clock += 24 * 60 * 60_000;
    expect(await ask('Question 32?', '1.1.1.1')).toMatchObject({ source: 'ai' });
  });
});
