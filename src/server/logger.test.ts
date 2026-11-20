import { describe, it, expect, vi } from 'vitest';
import * as logger from './logger.js';

describe('Logger', () => {
  it('info writes structured JSON to stdout', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logger.info('test message', { key: 'value' });

    expect(spy).toHaveBeenCalledOnce();
    const firstCall = spy.mock.calls[0];
    const parsed = JSON.parse(firstCall ? String(firstCall[0]) : '{}') as Record<string, unknown>;
    expect(parsed).toMatchObject({
      level: 'info',
      message: 'test message',
      key: 'value',
    });
    expect(parsed.timestamp).toBeDefined();
    spy.mockRestore();
  });

  it('warn writes to stderr via console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn('warning');

    expect(spy).toHaveBeenCalledOnce();
    const firstCall = spy.mock.calls[0];
    const parsed = JSON.parse(firstCall ? String(firstCall[0]) : '{}') as Record<string, unknown>;
    expect(parsed.level).toBe('warn');
    spy.mockRestore();
  });

  it('error writes to stderr via console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.error('failure', { code: 500 });

    expect(spy).toHaveBeenCalledOnce();
    const firstCall = spy.mock.calls[0];
    const parsed = JSON.parse(firstCall ? String(firstCall[0]) : '{}') as Record<string, unknown>;
    expect(parsed).toMatchObject({ level: 'error', message: 'failure', code: 500 });
    spy.mockRestore();
  });
});
