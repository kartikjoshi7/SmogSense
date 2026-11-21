import { describe, expect, it } from 'vitest';
import { SHARMA_FAMILY } from '../core/fixtures/profiles.js';
import { chatRequestSchema } from './api.js';
import { CHAT_LIMITS } from './limits.js';

const REQUEST = {
  profile: SHARMA_FAMILY,
  location: { lat: 28.61, lon: 77.21 },
  lang: 'en',
  question: 'And tomorrow?',
};

describe('chatRequestSchema', () => {
  it('accepts the longest answer the assistant can give, sent back as history', () => {
    const history = [{ role: 'assistant', text: 'a'.repeat(CHAT_LIMITS.turnChars) }];

    expect(chatRequestSchema.safeParse({ ...REQUEST, history }).success).toBe(true);
  });

  it('rejects longer turns, longer questions and longer histories', () => {
    const long = 'a'.repeat(CHAT_LIMITS.turnChars + 1);
    const turns = Array.from({ length: CHAT_LIMITS.historyTurns + 1 }, () => ({
      role: 'user',
      text: 'Hi',
    }));

    expect(
      chatRequestSchema.safeParse({ ...REQUEST, history: [{ role: 'user', text: long }] }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        ...REQUEST,
        question: 'a'.repeat(CHAT_LIMITS.questionChars + 1),
        history: [],
      }).success,
    ).toBe(false);
    expect(chatRequestSchema.safeParse({ ...REQUEST, history: turns }).success).toBe(false);
  });
});
