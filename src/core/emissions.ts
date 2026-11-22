import type { Commute, CommuteAlternative, CommuteMode } from '../shared/profile.js';
import {
  CAR_MODES,
  CARPOOL_OCCUPANTS,
  COMMUTE_MODES,
  DECIMALS,
  MAX_CYCLE_KM,
  MAX_WALK_KM,
  MIN_WORTHWHILE_REDUCTION_PCT,
  TRIPS_PER_COMMUTE_DAY,
} from './constants.js';
import { inhaledDoseUg, reduction } from './exposure.js';
import { roundTo } from './numbers.js';

/** A realistic change to the commute and what it does to emissions and exposure. */
export interface CommuteSwap {
  readonly alternative: CommuteAlternative;
  readonly co2SavedKgPerWeek: number;
  /** Change in weekly commute PM2.5 dose; negative when exposure rises. */
  readonly exposureReductionPct: number;
}

/** Whether the household commutes at all: a mode, a distance and at least one day a week. */
export function commutes(commute: Commute): boolean {
  return commute.mode !== 'none' && commute.daysPerWeek > 0 && commute.oneWayKm > 0;
}

/** Kilograms at the precision every CO₂ figure is shown at. */
function roundKg(kg: number): number {
  return roundTo(kg, DECIMALS.co2Kg);
}

/** Weekly CO₂ of a commute in kg (round trip on each commuting day). */
function weeklyCommuteCo2Kg(mode: CommuteMode, oneWayKm: number, daysPerWeek: number): number {
  return COMMUTE_MODES[mode].co2KgPerKm * oneWayKm * TRIPS_PER_COMMUTE_DAY * daysPerWeek;
}

/**
 * PM2.5 inhaled on one day's round trip in µg, from mode speed, in-transit levels and breathing.
 */
export function dailyCommuteDoseUg(
  mode: CommuteMode,
  oneWayKm: number,
  ambientPm25: number,
  maskReduction = 0,
): number {
  const factors = COMMUTE_MODES[mode];
  return inhaledDoseUg({
    concentration: ambientPm25,
    hours: (oneWayKm / factors.speedKmh) * TRIPS_PER_COMMUTE_DAY,
    breathingM3h: factors.breathingM3h,
    exposureMultiplier: factors.exposureMultiplier,
    maskReduction,
  });
}

const SWITCH_TARGET: Readonly<Partial<Record<CommuteAlternative, CommuteMode>>> = {
  metro: 'metro',
  bus: 'bus',
  cycle: 'cycle',
  walk: 'walk',
};

const MAX_DISTANCE_KM: Readonly<Partial<Record<CommuteAlternative, number>>> = {
  cycle: MAX_CYCLE_KM,
  walk: MAX_WALK_KM,
};

/** Weekly CO₂ and commute dose if the household made one change, or null if it doesn't apply. */
function evaluateSwap(
  commute: Commute,
  alternative: CommuteAlternative,
  ambientPm25: number,
): CommuteSwap | null {
  const { mode, oneWayKm, daysPerWeek } = commute;
  const co2Now = weeklyCommuteCo2Kg(mode, oneWayKm, daysPerWeek);
  const doseNow = dailyCommuteDoseUg(mode, oneWayKm, ambientPm25) * daysPerWeek;
  if (alternative === 'wfh') {
    return {
      alternative,
      co2SavedKgPerWeek: roundKg(co2Now / daysPerWeek),
      exposureReductionPct: reduction(doseNow, doseNow - doseNow / daysPerWeek).percent,
    };
  }
  if (alternative === 'carpool') {
    const carpooling = CAR_MODES.includes(mode);
    return carpooling
      ? {
          alternative,
          co2SavedKgPerWeek: roundKg(co2Now - co2Now / CARPOOL_OCCUPANTS),
          exposureReductionPct: 0,
        }
      : null;
  }
  const target = SWITCH_TARGET[alternative];
  const tooFar = oneWayKm > (MAX_DISTANCE_KM[alternative] ?? Number.POSITIVE_INFINITY);
  if (target === undefined || target === mode || tooFar) {
    return null;
  }
  const doseThen = dailyCommuteDoseUg(target, oneWayKm, ambientPm25) * daysPerWeek;
  return {
    alternative,
    co2SavedKgPerWeek: roundKg(co2Now - weeklyCommuteCo2Kg(target, oneWayKm, daysPerWeek)),
    exposureReductionPct: reduction(doseNow, doseThen).percent,
  };
}

/**
 * Commute changes the household said it could make, filtered to those that apply (cycling
 * up to 8 km, walking up to 2 km, carpooling only for cars) and that either save CO₂ or cut the
 * commute dose by at least `MIN_WORTHWHILE_REDUCTION_PCT`.
 */
export function commuteSwaps(commute: Commute, ambientPm25: number): CommuteSwap[] {
  if (!commutes(commute)) {
    return [];
  }
  return commute.alternatives
    .map((alternative) => evaluateSwap(commute, alternative, ambientPm25))
    .filter((swap): swap is CommuteSwap => swap !== null)
    .filter(
      (swap) =>
        swap.co2SavedKgPerWeek > 0 || swap.exposureReductionPct >= MIN_WORTHWHILE_REDUCTION_PCT,
    );
}
