import { describe, it, expect } from 'vitest';
import type { AgeGroup, CommuteMode, MaskType } from '../shared/schemas.js';
import {
  getBreathingRate,
  getAgeFactor,
  getMaskReduction,
  getCommuteMultiplier,
  getUrbanSpeedKmh,
  calculateInhaledDose,
  calculateReduction,
} from './exposure.js';

describe('exposure', () => {
  it('reproduces the worked example: 30-minute walk at PM2.5 310 vs 140', () => {
    // 30 minutes = 0.5 hours
    // activity: walk -> breathingRate = 1.6 m3/h
    // adult baseline (ageFactor = 1.0), no mask (maskReduction = 0), microenvironment = 1.0
    const breathingRate = getBreathingRate('walk');
    expect(breathingRate).toBe(1.6);

    const doseBefore = calculateInhaledDose(310, 0.5, breathingRate);
    const doseAfter = calculateInhaledDose(140, 0.5, breathingRate);

    expect(doseBefore).toBe(248);
    expect(doseAfter).toBe(112);

    const reduction = calculateReduction(doseBefore, doseAfter);
    expect(reduction.before).toBe(248);
    expect(reduction.after).toBe(112);
    expect(reduction.percent).toBe(55);
  });

  describe('getBreathingRate', () => {
    it('maps all activities and commute modes accurately', () => {
      expect(getBreathingRate('yoga')).toBe(0.7);
      expect(getBreathingRate('passenger')).toBe(0.7);
      expect(getBreathingRate('light')).toBe(0.7);
      expect(getBreathingRate('auto')).toBe(0.7);
      expect(getBreathingRate('bus')).toBe(0.7);
      expect(getBreathingRate('metro')).toBe(0.7);
      expect(getBreathingRate('two_wheeler')).toBe(0.7);
      expect(getBreathingRate('car_petrol')).toBe(0.7);
      expect(getBreathingRate('car_diesel')).toBe(0.7);
      expect(getBreathingRate('car_cng')).toBe(0.7);
      expect(getBreathingRate('car_ev')).toBe(0.7);

      expect(getBreathingRate('walk')).toBe(1.6);
      expect(getBreathingRate('moderate')).toBe(1.6);

      expect(getBreathingRate('cycle')).toBe(2.5);

      expect(getBreathingRate('run')).toBe(3.0);
      expect(getBreathingRate('sports')).toBe(3.0);
      expect(getBreathingRate('vigorous')).toBe(3.0);

      expect(getBreathingRate('sedentary')).toBe(0.3);
      expect(getBreathingRate('none')).toBe(0.3);
    });
  });

  describe('getAgeFactor', () => {
    it('maps age groups to physiological adjustment factors', () => {
      const groups: Record<AgeGroup, number> = {
        infant: 0.4,
        child: 0.7,
        teen: 0.9,
        adult: 1.0,
        senior: 0.9,
      };
      for (const [group, expected] of Object.entries(groups)) {
        expect(getAgeFactor(group as AgeGroup)).toBe(expected);
      }
    });
  });

  describe('getMaskReduction', () => {
    it('maps masks to conservative reduction factors', () => {
      const masks: Record<MaskType, number> = {
        none: 0.0,
        cloth: 0.2,
        surgical: 0.4,
        n95: 0.8,
      };
      for (const [mask, expected] of Object.entries(masks)) {
        expect(getMaskReduction(mask as MaskType)).toBe(expected);
      }
    });
  });

  describe('getCommuteMultiplier', () => {
    it('maps commute modes to in-transit microenvironment multipliers', () => {
      const modes: Record<CommuteMode, number> = {
        walk: 1.2,
        cycle: 1.2,
        two_wheeler: 1.4,
        auto: 1.5,
        bus: 1.2,
        metro: 0.7,
        car_petrol: 0.6,
        car_diesel: 0.6,
        car_cng: 0.6,
        car_ev: 0.6,
        none: 1.0,
      };
      for (const [mode, expected] of Object.entries(modes)) {
        expect(getCommuteMultiplier(mode as CommuteMode)).toBe(expected);
      }
    });
  });

  describe('getUrbanSpeedKmh', () => {
    it('maps commute modes to average urban speeds', () => {
      const modes: Record<CommuteMode, number> = {
        walk: 5,
        cycle: 12,
        two_wheeler: 25,
        auto: 20,
        bus: 15,
        metro: 30,
        car_petrol: 22,
        car_diesel: 22,
        car_cng: 22,
        car_ev: 22,
        none: 5,
      };
      for (const [mode, expected] of Object.entries(modes)) {
        expect(getUrbanSpeedKmh(mode as CommuteMode)).toBe(expected);
      }
    });
  });

  describe('calculateInhaledDose with options', () => {
    it('factors in mask reduction, age factor, and microenvironment', () => {
      // 1 hour at 100 µg/m³, adult brisk walk (1.6 m3/h), N95 mask (0.8 reduction)
      // dose = 100 * 1.0 * 1.6 * 1.0 * 1.0 * (1 - 0.8) = 160 * 0.2 = 32
      const dose = calculateInhaledDose(100, 1.0, 1.6, 1.0, 1.0, 0.8);
      expect(dose).toBe(32);
    });

    it('handles commute multiplier and child age factor', () => {
      // 0.5 hours auto commute (mult 1.5, br 0.7), child (age 0.7), surgical mask (0.4)
      // dose = 200 * 1.5 * 0.7 * 0.7 * 0.5 * (1 - 0.4) = 147 * 0.5 * 0.6 = 44.1
      const dose = calculateInhaledDose(200, 0.5, 0.7, 1.5, 0.7, 0.4);
      expect(dose).toBe(44.1);
    });
  });

  describe('calculateReduction edge cases', () => {
    it('handles before = 0 without dividing by zero', () => {
      const red = calculateReduction(0, 0);
      expect(red.percent).toBe(0);
    });
  });
});
