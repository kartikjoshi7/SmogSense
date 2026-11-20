import { describe, it, expect } from 'vitest';
import { createGeminiClient } from './gemini.ts';

describe('createGeminiClient', () => {
  it('returns undefined when no API key is provided', () => {
    expect(createGeminiClient()).toBeUndefined();
    expect(createGeminiClient('')).toBeUndefined();
  });

  it('creates a GoogleGenAI instance when an API key is provided', () => {
    const client = createGeminiClient('test-api-key');
    expect(client).toBeDefined();
  });
});
