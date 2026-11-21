import { afterEach, describe, expect, it, vi } from 'vitest';
import * as logger from './logger.js';

const parseLine = (line: unknown): unknown => JSON.parse(String(line));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('writes a warning as one JSON line with a timestamp and the extra fields', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn('Gemini reply rejected', { model: 'lite', reason: 'not_json' });

    expect(spy).toHaveBeenCalledOnce();
    const line = String(spy.mock.calls[0]?.[0]);
    expect(parseLine(line)).toMatchObject({
      level: 'warn',
      message: 'Gemini reply rejected',
      model: 'lite',
      reason: 'not_json',
    });
    expect(line).toMatch(/"timestamp":"\d{4}-\d{2}-\d{2}T/);
  });

  it('writes errors to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.error('failure', { code: 500 });

    expect(parseLine(spy.mock.calls[0]?.[0])).toMatchObject({
      level: 'error',
      message: 'failure',
      code: 500,
    });
  });
});
