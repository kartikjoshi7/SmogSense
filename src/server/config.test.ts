import { describe, it, expect } from 'vitest';
import {
  parseConfig,
  env,
  BODY_LIMIT_BYTES,
  OUTBOUND_TIMEOUT_MS,
  CACHE_TTL_MS,
  RATE_LIMIT_DAILY,
} from './config.js';

describe('Server config', () => {
  it('parses defaults when no env vars are set', () => {
    const config = parseConfig({});
    expect(config.NODE_ENV).toBe('development');
    expect(config.GEMINI_DAILY_BUDGET).toBe(200);
    expect(config.GEMINI_MODELS).toEqual(['gemini-3.5-flash-lite', 'gemini-3.8-flash']);
    expect(config.GEMINI_API_KEY).toBeUndefined();
    expect(config.ALLOWED_ORIGIN).toBeUndefined();
  });

  it('treats empty string env values as undefined defaults', () => {
    const config = parseConfig({
      GEMINI_API_KEY: '',
      GEMINI_MODELS: '',
      GEMINI_DAILY_BUDGET: '',
      ALLOWED_ORIGIN: '',
      NODE_ENV: '',
    });
    expect(config.NODE_ENV).toBe('development');
    expect(config.GEMINI_DAILY_BUDGET).toBe(200);
    expect(config.GEMINI_MODELS).toEqual(['gemini-3.5-flash-lite', 'gemini-3.8-flash']);
    expect(config.GEMINI_API_KEY).toBeUndefined();
    expect(config.ALLOWED_ORIGIN).toBeUndefined();
  });

  it('parses provided env values', () => {
    const config = parseConfig({
      GEMINI_API_KEY: 'test-key-123',
      GEMINI_MODELS: 'model-a,model-b',
      GEMINI_DAILY_BUDGET: '500',
      ALLOWED_ORIGIN: 'https://example.com',
      NODE_ENV: 'production',
    });
    expect(config.GEMINI_API_KEY).toBe('test-key-123');
    expect(config.GEMINI_MODELS).toEqual(['model-a', 'model-b']);
    expect(config.GEMINI_DAILY_BUDGET).toBe(500);
    expect(config.ALLOWED_ORIGIN).toBe('https://example.com');
    expect(config.NODE_ENV).toBe('production');
  });

  it('exports named constants for timeouts and limits', () => {
    expect(BODY_LIMIT_BYTES).toBe(16_384);
    expect(OUTBOUND_TIMEOUT_MS).toBe(10_000);
    expect(CACHE_TTL_MS).toBe(300_000);
    expect(RATE_LIMIT_DAILY).toBe(50);
  });

  it('exports parsed env singleton', () => {
    expect(env).toBeDefined();
    expect(env.GEMINI_DAILY_BUDGET).toBeGreaterThan(0);
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() => parseConfig({ NODE_ENV: 'invalid' })).toThrow();
  });

  it('rejects invalid ALLOWED_ORIGIN', () => {
    expect(() => parseConfig({ ALLOWED_ORIGIN: 'not-a-valid-url' })).toThrow();
  });

  it('rejects non-numeric GEMINI_DAILY_BUDGET', () => {
    expect(() => parseConfig({ GEMINI_DAILY_BUDGET: 'invalid-number' })).toThrow();
  });
});
