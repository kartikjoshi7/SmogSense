import { describe, it, expect } from 'vitest';
import {
  NAQI_PM25_BREAKPOINTS,
  NAQI_PM10_BREAKPOINTS,
  NAQI_CATEGORIES,
  US_AQI_PM25_BREAKPOINTS,
  US_AQI_PM10_BREAKPOINTS,
  US_AQI_CATEGORIES,
  AQI_MAX,
  AQI_MIN_HOURLY_READINGS_24H,
  AQI_TRAILING_HOURS,
  INVERSION_BLH_TRAPPED_THRESHOLD_M,
  INVERSION_WIND_TRAPPED_THRESHOLD_KMH,
  INVERSION_BLH_CLEARS_THRESHOLD_M,
  BREATHING_RATE_SEDENTARY,
  BREATHING_RATE_LIGHT,
  BREATHING_RATE_MODERATE,
  BREATHING_RATE_VIGOROUS,
  BREATHING_RATE_CYCLE,
  AGE_FACTOR_INFANT,
  AGE_FACTOR_CHILD,
  AGE_FACTOR_TEEN,
  AGE_FACTOR_ADULT,
  AGE_FACTOR_SENIOR,
  MASK_REDUCTION_NONE,
  MASK_REDUCTION_CLOTH,
  MASK_REDUCTION_SURGICAL,
  MASK_REDUCTION_N95,
  COMMUTE_MULTIPLIER_WALK,
  COMMUTE_MULTIPLIER_CYCLE,
  COMMUTE_MULTIPLIER_TWO_WHEELER,
  COMMUTE_MULTIPLIER_AUTO,
  COMMUTE_MULTIPLIER_BUS,
  COMMUTE_MULTIPLIER_METRO,
  COMMUTE_MULTIPLIER_CAR,
  COMMUTE_MULTIPLIER_DEFAULT,
  URBAN_SPEED_WALK_KMH,
  URBAN_SPEED_CYCLE_KMH,
  URBAN_SPEED_TWO_WHEELER_KMH,
  URBAN_SPEED_AUTO_KMH,
  URBAN_SPEED_BUS_KMH,
  URBAN_SPEED_METRO_KMH,
  URBAN_SPEED_CAR_KMH,
} from './constants.js';

describe('constants', () => {
  it('defines valid NAQI breakpoints and categories', () => {
    expect(NAQI_PM25_BREAKPOINTS).toHaveLength(6);
    expect(NAQI_PM10_BREAKPOINTS).toHaveLength(6);
    expect(NAQI_CATEGORIES).toEqual([
      'Good',
      'Satisfactory',
      'Moderate',
      'Poor',
      'Very Poor',
      'Severe',
    ]);
    expect(AQI_MAX).toBe(500);
    expect(AQI_MIN_HOURLY_READINGS_24H).toBe(16);
    expect(AQI_TRAILING_HOURS).toBe(24);
  });

  it('defines valid US AQI breakpoints and categories', () => {
    expect(US_AQI_PM25_BREAKPOINTS).toHaveLength(6);
    expect(US_AQI_PM10_BREAKPOINTS).toHaveLength(6);
    expect(US_AQI_CATEGORIES).toEqual([
      'Good',
      'Moderate',
      'Unhealthy for Sensitive Groups',
      'Unhealthy',
      'Very Unhealthy',
      'Hazardous',
    ]);
  });

  it('defines inversion thresholds', () => {
    expect(INVERSION_BLH_TRAPPED_THRESHOLD_M).toBe(200);
    expect(INVERSION_WIND_TRAPPED_THRESHOLD_KMH).toBe(5);
    expect(INVERSION_BLH_CLEARS_THRESHOLD_M).toBe(500);
  });

  it('defines breathing rates', () => {
    expect(BREATHING_RATE_SEDENTARY).toBe(0.3);
    expect(BREATHING_RATE_LIGHT).toBe(0.7);
    expect(BREATHING_RATE_MODERATE).toBe(1.6);
    expect(BREATHING_RATE_VIGOROUS).toBe(3.0);
    expect(BREATHING_RATE_CYCLE).toBe(2.5);
  });

  it('defines age factors', () => {
    expect(AGE_FACTOR_INFANT).toBe(0.4);
    expect(AGE_FACTOR_CHILD).toBe(0.7);
    expect(AGE_FACTOR_TEEN).toBe(0.9);
    expect(AGE_FACTOR_ADULT).toBe(1.0);
    expect(AGE_FACTOR_SENIOR).toBe(0.9);
  });

  it('defines mask reduction factors', () => {
    expect(MASK_REDUCTION_NONE).toBe(0.0);
    expect(MASK_REDUCTION_CLOTH).toBe(0.2);
    expect(MASK_REDUCTION_SURGICAL).toBe(0.4);
    expect(MASK_REDUCTION_N95).toBe(0.8);
  });

  it('defines commute multipliers', () => {
    expect(COMMUTE_MULTIPLIER_WALK).toBe(1.2);
    expect(COMMUTE_MULTIPLIER_CYCLE).toBe(1.2);
    expect(COMMUTE_MULTIPLIER_TWO_WHEELER).toBe(1.4);
    expect(COMMUTE_MULTIPLIER_AUTO).toBe(1.5);
    expect(COMMUTE_MULTIPLIER_BUS).toBe(1.2);
    expect(COMMUTE_MULTIPLIER_METRO).toBe(0.7);
    expect(COMMUTE_MULTIPLIER_CAR).toBe(0.6);
    expect(COMMUTE_MULTIPLIER_DEFAULT).toBe(1.0);
  });

  it('defines urban speeds', () => {
    expect(URBAN_SPEED_WALK_KMH).toBe(5);
    expect(URBAN_SPEED_CYCLE_KMH).toBe(12);
    expect(URBAN_SPEED_TWO_WHEELER_KMH).toBe(25);
    expect(URBAN_SPEED_AUTO_KMH).toBe(20);
    expect(URBAN_SPEED_BUS_KMH).toBe(15);
    expect(URBAN_SPEED_METRO_KMH).toBe(30);
    expect(URBAN_SPEED_CAR_KMH).toBe(22);
  });
});
