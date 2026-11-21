import { ApiError, type GenerateContentParameters } from '@google/genai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createGeminiClient, type GenerateContent, type GeminiOptions } from './gemini-client.js';

const schema = z.object({ answer: z.string() });
const request = { system: 'rules', prompt: 'question', schema, maxOutputTokens: 100 };
const MINUTE = 60_000;

function reply(text: string | undefined) {
  return Promise.resolve({ text });
}

function client(generate: GenerateContent | null, overrides: Partial<GeminiOptions> = {}) {
  let now = Date.parse('2026-11-21T10:00:00Z');
  return {
    ai: createGeminiClient({
      generate,
      models: ['lite', 'flash'],
      thinkingLevel: 'MINIMAL',
      dailyBudget: 100,
      now: () => now,
      ...overrides,
    }),
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function modelsCalled(generate: ReturnType<typeof vi.fn<GenerateContent>>): string[] {
  return generate.mock.calls.map(([params]) => params.model);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createGeminiClient', () => {
  it('returns the validated JSON reply from the first model', async () => {
    const generate = vi.fn<GenerateContent>(() => reply('{"answer":"Stay in"}'));

    expect(await client(generate).ai.generate(request)).toEqual({
      ok: true,
      value: { answer: 'Stay in' },
    });
    expect(modelsCalled(generate)).toEqual(['lite']);
  });

  it('asks for JSON matching the schema, with the system rules and minimal thinking', async () => {
    const generate = vi.fn<GenerateContent>(() => reply('{"answer":"ok"}'));
    await client(generate).ai.generate(request);
    const params: GenerateContentParameters | undefined = generate.mock.calls[0]?.[0];

    expect(params?.contents).toBe('question');
    expect(params?.config).toMatchObject({
      systemInstruction: 'rules',
      responseMimeType: 'application/json',
      maxOutputTokens: 100,
      thinkingConfig: { thinkingLevel: 'MINIMAL' },
      responseJsonSchema: { type: 'object', required: ['answer'] },
    });
    expect(params?.config?.responseJsonSchema).not.toHaveProperty('$schema');
    expect(params?.config?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('leaves thinking settings out when they are turned off', async () => {
    const generate = vi.fn<GenerateContent>(() => reply('{"answer":"ok"}'));
    await client(generate, { thinkingLevel: 'OFF' }).ai.generate(request);

    expect(generate.mock.calls[0]?.[0].config).not.toHaveProperty('thinkingConfig');
  });

  it('skips a rate-limited model for ten minutes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const generate = vi.fn<GenerateContent>(({ model }) =>
      model === 'lite'
        ? Promise.reject(new ApiError({ message: 'quota for key abc', status: 429 }))
        : reply('{"answer":"from flash"}'),
    );
    const { ai, advance } = client(generate);

    expect(await ai.generate(request)).toMatchObject({ value: { answer: 'from flash' } });
    await ai.generate(request);
    advance(10 * MINUTE + 1);
    await ai.generate(request);

    expect(modelsCalled(generate)).toEqual(['lite', 'flash', 'flash', 'lite', 'flash']);
    expect(String(warn.mock.calls[0]?.[0])).toContain('rate_limited');
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('abc');
  });

  it('tries the next model after any other failure and reports unavailable when all fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const generate = vi.fn<GenerateContent>(() => Promise.reject(new Error('socket hang up')));

    expect(await client(generate).ai.generate(request)).toEqual({
      ok: false,
      error: 'unavailable',
    });
    expect(modelsCalled(generate)).toEqual(['lite', 'flash']);
  });

  it.each([
    ['not JSON', 'Stay in'],
    ['the wrong shape', '{"reply":"Stay in"}'],
    ['an empty reply', undefined],
  ])('reports invalid output for %s', async (_label, text) => {
    const generate = vi.fn<GenerateContent>(() => reply(text));

    expect(await client(generate).ai.generate(request)).toEqual({
      ok: false,
      error: 'invalid_output',
    });
  });

  it('never calls the API without a key', async () => {
    expect(await client(null).ai.generate(request)).toEqual({ ok: false, error: 'unavailable' });
  });

  it('stops at the daily budget and starts again the next day', async () => {
    const generate = vi.fn<GenerateContent>(() => reply('{"answer":"ok"}'));
    const { ai, advance } = client(generate, { dailyBudget: 1 });

    await ai.generate(request);
    expect(await ai.generate(request)).toEqual({ ok: false, error: 'unavailable' });
    advance(24 * 60 * MINUTE);
    expect(await ai.generate(request)).toMatchObject({ ok: true });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
