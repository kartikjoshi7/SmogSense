import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHARMA_FAMILY } from '../core/fixtures/profiles.js';
import { planResponseSchema } from '../shared/api.js';
import { createServerApp } from './main.js';
import { FIXTURE_NOW, openMeteoFetch, requestUrl } from './test/fake-fetch.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createServerApp', () => {
  it('builds a working app from environment variables', async () => {
    const app = createServerApp({ NODE_ENV: 'test' });

    expect((await app.request('/api/health')).status).toBe(200);
  });

  it('builds the Gemini client when a key is configured, without calling the API', async () => {
    const app = createServerApp({ NODE_ENV: 'test', GEMINI_API_KEY: 'test-key' });

    expect((await app.request('/api/health')).status).toBe(200);
  });

  it('plans with the real air service, clock and fetch, against recorded Open-Meteo data', async () => {
    vi.useFakeTimers({ now: FIXTURE_NOW, toFake: ['Date'] });
    const fetch = openMeteoFetch();
    vi.stubGlobal('fetch', fetch);

    const res = await createServerApp({ NODE_ENV: 'test' }).request('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: SHARMA_FAMILY, location: { lat: 28.6139, lon: 77.209 } }),
    });

    expect(res.status).toBe(200);
    expect(planResponseSchema.parse(await res.json()).plan.index.scale).toBe('naqi');
    expect(requestUrl(fetch.mock.calls[0]?.[0]).searchParams.get('latitude')).toBe('28.6');
  });

  it('refuses to start with a malformed setting', () => {
    expect(() => createServerApp({ ALLOWED_ORIGIN: 'not a url' })).toThrow();
  });
});
