import { describe, it, expect } from 'vitest';
import { severityMode } from './severity.js';

describe('severity', () => {
  it('maps bands 0 and 1 to normal mode', () => {
    expect(severityMode(0)).toBe('normal');
    expect(severityMode(1)).toBe('normal');
    expect(severityMode(0, 'high')).toBe('normal');
    expect(severityMode(1, 'high')).toBe('normal');
  });

  it('maps band 2 to caution mode', () => {
    expect(severityMode(2)).toBe('caution');
    expect(severityMode(2, 'normal')).toBe('caution');
    expect(severityMode(2, 'elevated')).toBe('caution');
    expect(severityMode(2, 'high')).toBe('caution');
  });

  it('maps band 3 to restrict mode', () => {
    expect(severityMode(3)).toBe('restrict');
    expect(severityMode(3, 'normal')).toBe('restrict');
    expect(severityMode(3, 'high')).toBe('restrict');
  });

  it('maps band 4 to restrict for normal/elevated and emergency for high sensitivity', () => {
    expect(severityMode(4)).toBe('restrict');
    expect(severityMode(4, 'normal')).toBe('restrict');
    expect(severityMode(4, 'elevated')).toBe('restrict');
    expect(severityMode(4, 'high')).toBe('emergency');
  });

  it('maps band 5 (and above) to emergency mode for all sensitivities', () => {
    expect(severityMode(5)).toBe('emergency');
    expect(severityMode(5, 'normal')).toBe('emergency');
    expect(severityMode(5, 'elevated')).toBe('emergency');
    expect(severityMode(5, 'high')).toBe('emergency');
    expect(severityMode(6, 'normal')).toBe('emergency');
  });
});
