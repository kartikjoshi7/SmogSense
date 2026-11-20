import { describe, expect, it } from 'vitest';
import { severityMode } from './severity.js';

describe('severityMode', () => {
  it.each([
    [0, 'high', 'normal'],
    [1, 'normal', 'normal'],
    [2, 'high', 'caution'],
    [3, 'normal', 'restrict'],
    [4, 'elevated', 'restrict'],
    [4, 'high', 'emergency'],
    [5, 'normal', 'emergency'],
  ] as const)('band %d with %s sensitivity → %s', (band, sensitivity, expected) => {
    expect(severityMode(band, sensitivity)).toBe(expected);
  });
});
