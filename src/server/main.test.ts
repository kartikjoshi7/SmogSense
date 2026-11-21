import { describe, expect, it } from 'vitest';
import { createServerApp } from './main.js';

describe('createServerApp', () => {
  it('builds a working app from environment variables', async () => {
    const app = createServerApp({ NODE_ENV: 'test' });

    expect((await app.request('/api/health')).status).toBe(200);
  });

  it('builds the Gemini client when a key is configured, without calling the API', async () => {
    const app = createServerApp({ NODE_ENV: 'test', GEMINI_API_KEY: 'test-key' });

    expect((await app.request('/api/health')).status).toBe(200);
  });

  it('refuses to start with a malformed setting', () => {
    expect(() => createServerApp({ ALLOWED_ORIGIN: 'not a url' })).toThrow();
  });
});
