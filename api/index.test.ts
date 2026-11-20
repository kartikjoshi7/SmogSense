import { describe, expect, it } from 'vitest';
import { GET, OPTIONS, POST } from './index.js';

const BASE_URL = 'https://smogsense.test';

describe('Vercel API entry', () => {
  it('routes GET /api/health through the Hono app', async () => {
    const response = await GET(new Request(`${BASE_URL}/api/health`));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('returns the JSON 404 for unknown API routes', async () => {
    const response = await POST(new Request(`${BASE_URL}/api/unknown`, { method: 'POST' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('serves every exported method with the same handler', () => {
    expect(POST).toBe(GET);
    expect(OPTIONS).toBe(GET);
  });
});
