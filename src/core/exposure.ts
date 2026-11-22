/** How much PM2.5 a person inhales, and how much a change reduces it. */
import { MINUTES_PER_HOUR } from '../shared/limits.js';
import type { Exercise, Member } from '../shared/profile.js';
import { AGE_FACTOR, DECIMALS, EXERCISE_BREATHING_M3H } from './constants.js';
import { roundTo } from './numbers.js';

export interface DoseInput {
  /** Ambient PM2.5, µg/m³. */
  readonly concentration: number;
  readonly hours: number;
  /** Inhalation rate, m³/h. */
  readonly breathingM3h: number;
  /** In-transit or indoor concentration relative to ambient (1 = ambient). */
  readonly exposureMultiplier?: number;
  /** Breathing volume relative to an adult (1 = adult). */
  readonly ageFactor?: number;
  /** Share removed by a mask, 0–1. */
  readonly maskReduction?: number;
}

export interface Reduction {
  readonly before: number;
  readonly after: number;
  /** Percentage drop from before to after; negative when exposure rises. */
  readonly percent: number;
}

/**
 * PM2.5 inhaled, in µg: concentration × exposure multiplier × breathing rate × age factor ×
 * hours × (1 − mask reduction), rounded to 0.1 µg.
 */
export function inhaledDoseUg(input: DoseInput): number {
  const {
    concentration,
    hours,
    breathingM3h,
    exposureMultiplier = 1,
    ageFactor = 1,
    maskReduction = 0,
  } = input;
  const dose =
    concentration * exposureMultiplier * breathingM3h * ageFactor * hours * (1 - maskReduction);
  return roundTo(dose, DECIMALS.doseUg);
}

/**
 * PM2.5 inhaled in one exercise session at a given concentration, by whoever exercises: their
 * age sets the breathing volume (an adult's when the whole family or nobody in particular goes).
 */
export function exerciseDoseUg(
  exercise: Exercise,
  members: readonly Member[],
  concentration: number,
): number {
  const member = members.find((m) => m.id === exercise.memberId);
  return inhaledDoseUg({
    concentration,
    hours: exercise.durationMin / MINUTES_PER_HOUR,
    breathingM3h: EXERCISE_BREATHING_M3H[exercise.activity],
    ageFactor: member === undefined ? AGE_FACTOR.adult : AGE_FACTOR[member.ageGroup],
  });
}

/** Before, after and the percentage drop between them (0 when there was nothing to reduce). */
export function reduction(before: number, after: number): Reduction {
  const percent = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
  return { before, after, percent };
}
