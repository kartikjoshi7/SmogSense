import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from './app.js';

describe('Health route', () => {
  it('GET /api/health returns ok', async () => {
    const app = createApp({});
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; version: string };
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
  });
});

describe('404 handler', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const app = createApp({});
    const res = await app.request('/api/nonexistent');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Not found');
  });
});

describe('onError handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 500 with safe message and logs the error', async () => {
    const app = createApp({});

    app.get('/boom', () => {
      throw new Error('test explosion');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await app.request('/api/boom');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Internal error');
    expect(body).not.toHaveProperty('stack');

    expect(errorSpy).toHaveBeenCalled();
    const firstCall = errorSpy.mock.calls[0];
    const logLine = firstCall ? String(firstCall[0]) : '';
    expect(logLine).toContain('Unhandled error');
    expect(logLine).toContain('test explosion');

    errorSpy.mockRestore();
  });
});
