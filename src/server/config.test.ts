import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.js';

describe('parseConfig', () => {
  it('applies defaults when nothing is set, including empty strings', () => {
    const expected = {
      GEMINI_DAILY_BUDGET: 200,
      GEMINI_MODELS: ['gemini-3.5-flash-lite', 'gemini-3.8-flash'],
      GEMINI_THINKING_LEVEL: 'MINIMAL',
    };

    expect(parseConfig({})).toEqual(expected);
    expect(parseConfig({ GEMINI_API_KEY: '', GEMINI_MODELS: '', ALLOWED_ORIGIN: '' })).toEqual(
      expected,
    );
  });

  it('reads provided values and tidies the model list', () => {
    const config = parseConfig({
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODELS: ' model-a , model-b ,',
      GEMINI_DAILY_BUDGET: '50',
      GEMINI_THINKING_LEVEL: 'OFF',
      ALLOWED_ORIGIN: 'https://smog-sense-sigma.vercel.app',
    });

    expect(config).toEqual({
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODELS: ['model-a', 'model-b'],
      GEMINI_DAILY_BUDGET: 50,
      GEMINI_THINKING_LEVEL: 'OFF',
      ALLOWED_ORIGIN: 'https://smog-sense-sigma.vercel.app',
    });
  });

  it('keeps only the origin of ALLOWED_ORIGIN, so a trailing slash or path still matches', () => {
    expect(parseConfig({ ALLOWED_ORIGIN: 'https://example.org/app/' }).ALLOWED_ORIGIN).toBe(
      'https://example.org',
    );
  });

  it.each([
    ['an origin without a scheme', { ALLOWED_ORIGIN: 'smog-sense-sigma.vercel.app' }],
    ['a model list with no model in it', { GEMINI_MODELS: ' , ' }],
    ['a non-numeric budget', { GEMINI_DAILY_BUDGET: 'lots' }],
    ['a negative budget', { GEMINI_DAILY_BUDGET: '-1' }],
    ['an unknown thinking level', { GEMINI_THINKING_LEVEL: 'MAX' }],
  ])('rejects %s', (_label, env) => {
    expect(() => parseConfig(env)).toThrow();
  });
});
