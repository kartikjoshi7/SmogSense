/**
 * Breathing rates, masks and commute modes: what a person inhales and emits on the move.
 * Sources: docs/ARCHITECTURE.md › Assumptions behind the numbers.
 */
import type {
  AgeGroup,
  CommuteAlternative,
  CommuteMode,
  ExerciseActivity,
  MaskType,
} from '../../shared/profile.js';

// ---------------------------------------------------------------- Breathing and exposure

/**
 * Adult inhalation rates in m³/h, rounded from the US EPA Exposure Factors Handbook (2011),
 * chapter 6, short-term rates by activity level. "cycling" sits between moderate and high.
 */
const BREATHING_RATE_M3H = {
  sedentary: 0.3,
  light: 0.7,
  moderate: 1.6,
  cycling: 2.5,
  vigorous: 3.0,
} as const;

/** Breathing rate for each exercise type. */
export const EXERCISE_BREATHING_M3H: Readonly<Record<ExerciseActivity, number>> = {
  walk: BREATHING_RATE_M3H.moderate,
  run: BREATHING_RATE_M3H.vigorous,
  cycle: BREATHING_RATE_M3H.cycling,
  yoga: BREATHING_RATE_M3H.light,
  sports: BREATHING_RATE_M3H.vigorous,
  none: BREATHING_RATE_M3H.sedentary,
};

/** Breathing volume relative to an adult doing the same activity (estimate, simplified). */
export const AGE_FACTOR: Readonly<Record<AgeGroup, number>> = {
  infant: 0.4,
  child: 0.7,
  teen: 0.9,
  adult: 1.0,
  senior: 0.9,
};

/** Share of PM2.5 a mask removes in real use: filtration × typical fit (conservative estimate). */
export const MASK_REDUCTION: Readonly<Record<MaskType, number>> = {
  none: 0,
  cloth: 0.2,
  surgical: 0.4,
  n95: 0.8,
};

export interface CommuteModeFactors {
  /**
   * In-transit PM2.5 relative to ambient air (estimate, informed by Delhi on-road studies such as
   * Goel et al. 2015, Atmospheric Environment).
   */
  readonly exposureMultiplier: number;
  /** Typical urban door-to-door speed in km/h (estimate). */
  readonly speedKmh: number;
  /**
   * Tailpipe/grid CO₂ in kg per km — per vehicle for private modes, per passenger for bus and metro
   * (estimate, India GHG Program road-transport factors).
   */
  readonly co2KgPerKm: number;
  /** Breathing rate while travelling, m³/h. */
  readonly breathingM3h: number;
  /** True for modes whose traveller controls the engine (engine-off and errand advice apply). */
  readonly isPrivateMotor: boolean;
}

const CAR = { exposureMultiplier: 0.6, speedKmh: 22, isPrivateMotor: true } as const;
const PASSENGER_BREATHING = BREATHING_RATE_M3H.light;

/** Every commute mode's exposure, speed and emission factors in one table. */
export const COMMUTE_MODES: Readonly<Record<CommuteMode, CommuteModeFactors>> = {
  walk: {
    exposureMultiplier: 1.2,
    speedKmh: 5,
    co2KgPerKm: 0,
    breathingM3h: BREATHING_RATE_M3H.moderate,
    isPrivateMotor: false,
  },
  cycle: {
    exposureMultiplier: 1.2,
    speedKmh: 12,
    co2KgPerKm: 0,
    breathingM3h: BREATHING_RATE_M3H.cycling,
    isPrivateMotor: false,
  },
  two_wheeler: {
    exposureMultiplier: 1.4,
    speedKmh: 25,
    co2KgPerKm: 0.05,
    breathingM3h: PASSENGER_BREATHING,
    isPrivateMotor: true,
  },
  auto: {
    exposureMultiplier: 1.5,
    speedKmh: 20,
    co2KgPerKm: 0.08,
    breathingM3h: PASSENGER_BREATHING,
    isPrivateMotor: false,
  },
  bus: {
    exposureMultiplier: 1.2,
    speedKmh: 15,
    co2KgPerKm: 0.03,
    breathingM3h: PASSENGER_BREATHING,
    isPrivateMotor: false,
  },
  metro: {
    exposureMultiplier: 0.7,
    speedKmh: 30,
    co2KgPerKm: 0.02,
    breathingM3h: PASSENGER_BREATHING,
    isPrivateMotor: false,
  },
  car_petrol: { ...CAR, co2KgPerKm: 0.17, breathingM3h: PASSENGER_BREATHING },
  car_diesel: { ...CAR, co2KgPerKm: 0.16, breathingM3h: PASSENGER_BREATHING },
  car_cng: { ...CAR, co2KgPerKm: 0.13, breathingM3h: PASSENGER_BREATHING },
  car_ev: { ...CAR, co2KgPerKm: 0.08, breathingM3h: PASSENGER_BREATHING },
  none: {
    exposureMultiplier: 1.0,
    speedKmh: 5,
    co2KgPerKm: 0,
    breathingM3h: BREATHING_RATE_M3H.sedentary,
    isPrivateMotor: false,
  },
};

/** Modes that are cars, where carpooling applies. */
export const CAR_MODES: readonly CommuteMode[] = ['car_petrol', 'car_diesel', 'car_cng', 'car_ev'];

/** Trips on each commuting day: there and back. */
export const TRIPS_PER_COMMUTE_DAY = 2;

/** People sharing a car when carpooling (estimate). */
export const CARPOOL_OCCUPANTS = 3;

/** Longest one-way distance (km) suggested for cycling and walking commutes (estimate). */
export const MAX_CYCLE_KM = 8;
export const MAX_WALK_KM = 2;

/** Swaps that mean exertion outdoors, so they are not suggested when that is unsafe. */
export const ACTIVE_ALTERNATIVES: readonly CommuteAlternative[] = ['cycle', 'walk'];
