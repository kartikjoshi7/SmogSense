import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { jsonResponse } from '../test/fake-fetch.js';
import { fetchJson } from './fetch-json.js';

const schema = z.object({ value: z.number() });
const url = new URL('https://api.example.test/data?secret-query=1');

function deps(fetch: typeof globalThis.fetch) {
  return { fetch, timeoutMs: 1000, retries: 1 };
}

function sequence(...steps: (() => Response)[]) {
  let call = 0;
  return vi.fn<typeof fetch>(() => {
    const step = steps[Math.min(call++, steps.length - 1)];
    return Promise.resolve().then(() => (step === undefined ? jsonResponse({}) : step()));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchJson', () => {
  it('returns the validated body', async () => {
    const fetch = sequence(() => jsonResponse({ value: 7 }));

    expect(await fetchJson(url, schema, deps(fetch))).toEqual({ ok: true, value: { value: 7 } });
  });

  it('retries once after a 5xx and succeeds', async () => {
    const fetch = sequence(
      () => jsonResponse({}, 503),
      () => jsonResponse({ value: 1 }),
    );

    expect(await fetchJson(url, schema, deps(fetch))).toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry and logs the host only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = sequence(() => jsonResponse({}, 500));

    expect(await fetchJson(url, schema, deps(fetch))).toEqual({ ok: false, error: 'http' });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0]?.[0])).toContain('api.example.test');
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('secret-query');
  });

  it('does not retry a 4xx', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = sequence(() => jsonResponse({}, 404));

    expect(await fetchJson(url, schema, deps(fetch))).toEqual({ ok: false, error: 'http' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries network errors but not timeouts', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const offline = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('fetch failed')));
    const slow = vi.fn<typeof fetch>(() =>
      Promise.reject(new DOMException('The operation timed out.', 'TimeoutError')),
    );

    expect(await fetchJson(url, schema, deps(offline))).toEqual({ ok: false, error: 'network' });
    expect(offline).toHaveBeenCalledTimes(2);
    expect(await fetchJson(url, schema, deps(slow))).toEqual({ ok: false, error: 'timeout' });
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed JSON and bodies that do not match the schema', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const notJson = sequence(() => new Response('<html>', { status: 200 }));
    const wrongShape = sequence(() => jsonResponse({ value: 'seven' }));

    expect(await fetchJson(url, schema, deps(notJson))).toEqual({
      ok: false,
      error: 'invalid_response',
    });
    expect(await fetchJson(url, schema, deps(wrongShape))).toEqual({
      ok: false,
      error: 'invalid_response',
    });
  });
});
