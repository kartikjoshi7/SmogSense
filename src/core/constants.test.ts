import { describe, it, expect } from 'vitest';
import {
  AQI_GOOD_MAX,
  AQI_MODERATE_MAX,
  AQI_USG_MAX,
  AQI_UNHEALTHY_MAX,
  AQI_VERY_UNHEALTHY_MAX,
} from './constants.ts';

describe('AQI constants', () => {
  it('defines ascending breakpoint thresholds', () => {
    expect(AQI_GOOD_MAX).toBeLessThan(AQI_MODERATE_MAX);
    expect(AQI_MODERATE_MAX).toBeLessThan(AQI_USG_MAX);
    expect(AQI_USG_MAX).toBeLessThan(AQI_UNHEALTHY_MAX);
    expect(AQI_UNHEALTHY_MAX).toBeLessThan(AQI_VERY_UNHEALTHY_MAX);
  });

  it('matches EPA standard values', () => {
    expect(AQI_GOOD_MAX).toBe(50);
    expect(AQI_MODERATE_MAX).toBe(100);
    expect(AQI_USG_MAX).toBe(150);
    expect(AQI_UNHEALTHY_MAX).toBe(200);
    expect(AQI_VERY_UNHEALTHY_MAX).toBe(300);
  });
});
