import type { AgeGroup, CommuteMode, ExerciseActivity, MaskType } from '../shared/schemas.js';
import {
  AGE_FACTOR_ADULT,
  AGE_FACTOR_CHILD,
  AGE_FACTOR_INFANT,
  AGE_FACTOR_SENIOR,
  AGE_FACTOR_TEEN,
  BREATHING_RATE_CYCLE,
  BREATHING_RATE_LIGHT,
  BREATHING_RATE_MODERATE,
  BREATHING_RATE_SEDENTARY,
  BREATHING_RATE_VIGOROUS,
  COMMUTE_MULTIPLIER_AUTO,
  COMMUTE_MULTIPLIER_BUS,
  COMMUTE_MULTIPLIER_CAR,
  COMMUTE_MULTIPLIER_CYCLE,
  COMMUTE_MULTIPLIER_DEFAULT,
  COMMUTE_MULTIPLIER_METRO,
  COMMUTE_MULTIPLIER_TWO_WHEELER,
  COMMUTE_MULTIPLIER_WALK,
  MASK_REDUCTION_CLOTH,
  MASK_REDUCTION_N95,
  MASK_REDUCTION_NONE,
  MASK_REDUCTION_SURGICAL,
  URBAN_SPEED_AUTO_KMH,
  URBAN_SPEED_BUS_KMH,
  URBAN_SPEED_CAR_KMH,
  URBAN_SPEED_CYCLE_KMH,
  URBAN_SPEED_METRO_KMH,
  URBAN_SPEED_TWO_WHEELER_KMH,
  URBAN_SPEED_WALK_KMH,
} from './constants.js';

export type ActivityType =
  ExerciseActivity | CommuteMode | 'passenger' | 'sedentary' | 'light' | 'moderate' | 'vigorous';

export interface ReductionResult {
  readonly before: number;
  readonly after: number;
  readonly percent: number;
}

const BREATHING_RATE_MAP: Readonly<Record<ActivityType, number>> = {
  yoga: BREATHING_RATE_LIGHT,
  passenger: BREATHING_RATE_LIGHT,
  light: BREATHING_RATE_LIGHT,
  auto: BREATHING_RATE_LIGHT,
  bus: BREATHING_RATE_LIGHT,
  metro: BREATHING_RATE_LIGHT,
  two_wheeler: BREATHING_RATE_LIGHT,
  car_petrol: BREATHING_RATE_LIGHT,
  car_diesel: BREATHING_RATE_LIGHT,
  car_cng: BREATHING_RATE_LIGHT,
  car_ev: BREATHING_RATE_LIGHT,
  walk: BREATHING_RATE_MODERATE,
  moderate: BREATHING_RATE_MODERATE,
  cycle: BREATHING_RATE_CYCLE,
  run: BREATHING_RATE_VIGOROUS,
  sports: BREATHING_RATE_VIGOROUS,
  vigorous: BREATHING_RATE_VIGOROUS,
  sedentary: BREATHING_RATE_SEDENTARY,
  none: BREATHING_RATE_SEDENTARY,
};

const AGE_FACTOR_MAP: Readonly<Record<AgeGroup, number>> = {
  infant: AGE_FACTOR_INFANT,
  child: AGE_FACTOR_CHILD,
  teen: AGE_FACTOR_TEEN,
  adult: AGE_FACTOR_ADULT,
  senior: AGE_FACTOR_SENIOR,
};

const MASK_REDUCTION_MAP: Readonly<Record<MaskType, number>> = {
  none: MASK_REDUCTION_NONE,
  cloth: MASK_REDUCTION_CLOTH,
  surgical: MASK_REDUCTION_SURGICAL,
  n95: MASK_REDUCTION_N95,
};

const COMMUTE_MULTIPLIER_MAP: Readonly<Record<CommuteMode, number>> = {
  walk: COMMUTE_MULTIPLIER_WALK,
  cycle: COMMUTE_MULTIPLIER_CYCLE,
  two_wheeler: COMMUTE_MULTIPLIER_TWO_WHEELER,
  auto: COMMUTE_MULTIPLIER_AUTO,
  bus: COMMUTE_MULTIPLIER_BUS,
  metro: COMMUTE_MULTIPLIER_METRO,
  car_petrol: COMMUTE_MULTIPLIER_CAR,
  car_diesel: COMMUTE_MULTIPLIER_CAR,
  car_cng: COMMUTE_MULTIPLIER_CAR,
  car_ev: COMMUTE_MULTIPLIER_CAR,
  none: COMMUTE_MULTIPLIER_DEFAULT,
};

const URBAN_SPEED_MAP: Readonly<Record<CommuteMode, number>> = {
  walk: URBAN_SPEED_WALK_KMH,
  cycle: URBAN_SPEED_CYCLE_KMH,
  two_wheeler: URBAN_SPEED_TWO_WHEELER_KMH,
  auto: URBAN_SPEED_AUTO_KMH,
  bus: URBAN_SPEED_BUS_KMH,
  metro: URBAN_SPEED_METRO_KMH,
  car_petrol: URBAN_SPEED_CAR_KMH,
  car_diesel: URBAN_SPEED_CAR_KMH,
  car_cng: URBAN_SPEED_CAR_KMH,
  car_ev: URBAN_SPEED_CAR_KMH,
  none: URBAN_SPEED_WALK_KMH,
};

/**
 * Resolve inhalation breathing rate in m³/h for a physical activity, commute, or intensity level.
 */
export function getBreathingRate(activity: ActivityType): number {
  return BREATHING_RATE_MAP[activity];
}

/**
 * Resolve physiological age factor relative to adult baseline.
 */
export function getAgeFactor(ageGroup: AgeGroup): number {
  return AGE_FACTOR_MAP[ageGroup];
}

/**
 * Resolve mask reduction factor based on filtration efficiency and leakage.
 */
export function getMaskReduction(mask: MaskType): number {
  return MASK_REDUCTION_MAP[mask];
}

/**
 * Resolve commute microenvironment in-transit PM2.5 multiplier relative to ambient air.
 */
export function getCommuteMultiplier(mode: CommuteMode): number {
  return COMMUTE_MULTIPLIER_MAP[mode];
}

/**
 * Resolve average urban commute travel speed in km/h.
 */
export function getUrbanSpeedKmh(mode: CommuteMode): number {
  return URBAN_SPEED_MAP[mode];
}

/**
 * Calculate total inhaled particulate dose in micrograms (µg):
 * inhaledDoseUg = concentration × microenvironmentMultiplier × breathingRate × ageFactor × hours × (1 − maskReduction).
 */
export function calculateInhaledDose(
  concentration: number,
  hours: number,
  breathingRate: number,
  ...modifiers: [microMultiplier?: number, ageFactor?: number, maskReduction?: number]
): number {
  const microMultiplier = modifiers[0] ?? 1.0;
  const ageFactor = modifiers[1] ?? 1.0;
  const maskReduction = modifiers[2] ?? 0.0;
  const dose =
    concentration * microMultiplier * breathingRate * ageFactor * hours * (1 - maskReduction);
  return Math.round(dose * 100) / 100;
}

/**
 * Calculate reduction difference and percentage between before and after values:
 * percent = round((before - after) / before * 100).
 */
export function calculateReduction(before: number, after: number): ReductionResult {
  const percent = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
  return {
    before,
    after,
    percent,
  };
}
