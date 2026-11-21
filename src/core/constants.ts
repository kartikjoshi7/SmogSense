/**
 * Domain coefficients for the SmogSense engine — the only place numbers live.
 * Values marked "estimate" are rounded simplifications for planning guidance, not
 * measurements; README › Assumptions lists each one with its source.
 */
import type { AqiCategory, AqiScale, Level, Sensitivity } from '../shared/plan.js';
import type {
  AgeGroup,
  Airtightness,
  CommuteMode,
  CookingFuel,
  ExerciseActivity,
  MaskType,
} from '../shared/profile.js';

// ---------------------------------------------------------------- Air-quality indexes

/** A concentration range in µg/m³; values in (cLo, cHi] belong to the band. */
interface ConcentrationRange {
  readonly cLo: number;
  readonly cHi: number;
}

/** One row of an official AQI table: a category, its index range and the PM ranges behind it. */
export interface AqiBand {
  readonly category: AqiCategory;
  readonly iLo: number;
  readonly iHi: number;
  readonly pm25: ConcentrationRange;
  readonly pm10: ConcentrationRange;
}

export interface AqiScaleDefinition {
  /** Bands from best to worst; the band's position is its 0–5 band number. */
  readonly bands: readonly [AqiBand, ...AqiBand[]];
  /** Decimal places a concentration is truncated to before lookup; null = no truncation. */
  readonly pm25Decimals: number | null;
  readonly pm10Decimals: number | null;
}

function band(
  category: AqiCategory,
  [iLo, iHi]: readonly [number, number],
  [pm25Lo, pm25Hi]: readonly [number, number],
  [pm10Lo, pm10Hi]: readonly [number, number],
): AqiBand {
  return {
    category,
    iLo,
    iHi,
    pm25: { cLo: pm25Lo, cHi: pm25Hi },
    pm10: { cLo: pm10Lo, cHi: pm10Hi },
  };
}

/**
 * India: CPCB National Air Quality Index (2014), 24-hour PM breakpoints.
 * US: EPA AQI Technical Assistance Document, PM2.5 rows from the February 2024 update.
 * CPCB's Severe band is open-ended; its upper references (380 PM2.5, 510 PM10) are an
 * assumption so the index can rise to 500.
 */
export const AQI_SCALES: Readonly<Record<AqiScale, AqiScaleDefinition>> = {
  naqi: {
    bands: [
      band('good', [0, 50], [0, 30], [0, 50]),
      band('satisfactory', [51, 100], [30, 60], [50, 100]),
      band('moderate', [101, 200], [60, 90], [100, 250]),
      band('poor', [201, 300], [90, 120], [250, 350]),
      band('very_poor', [301, 400], [120, 250], [350, 430]),
      band('severe', [401, 500], [250, 380], [430, 510]),
    ],
    pm25Decimals: null,
    pm10Decimals: null,
  },
  us_aqi: {
    bands: [
      band('good', [0, 50], [0, 9.0], [0, 54]),
      band('moderate', [51, 100], [9.1, 35.4], [55, 154]),
      band('unhealthy_sensitive', [101, 150], [35.5, 55.4], [155, 254]),
      band('unhealthy', [151, 200], [55.5, 125.4], [255, 354]),
      band('very_unhealthy', [201, 300], [125.5, 225.4], [355, 424]),
      band('hazardous', [301, 500], [225.5, 325.4], [425, 604]),
    ],
    pm25Decimals: 1,
    pm10Decimals: 0,
  },
};

/** Hours in the averaging window for the headline index (CPCB and EPA use 24-hour PM means). */
export const INDEX_WINDOW_HOURS = 24;

/** Minimum valid hours for a 24-hour mean (CPCB's 16-of-24-hours completeness rule). */
export const INDEX_MIN_VALID_HOURS = 16;

/** Time zones of Indian locations. Open-Meteo returns the IANA zone of the coordinates. */
export const INDIA_TIMEZONES: readonly string[] = ['Asia/Kolkata', 'Asia/Calcutta'];

// ---------------------------------------------------------------- Forecast horizon and precision

/** How far ahead the plan looks, in hours. */
export const PLAN_HORIZON_HOURS = 24;

/** Decimal places engine figures are rounded to: display precision, not measurement precision. */
export const DECIMALS = { pm25Mean: 1, windowMean: 2, doseUg: 1, co2Kg: 1 } as const;

/**
 * Decimals a 24-hour mean is first rounded to, so float error cannot push it below a breakpoint
 * (24 readings of 9.1 average to 9.0999…, which must still truncate to 9.1).
 */
export const FLOAT_ERROR_DECIMALS = 6;

// ---------------------------------------------------------------- Winter inversion

/** Boundary-layer height (m) below which pollution is treated as trapped near the ground (estimate). */
export const INVERSION_TRAPPED_BLH_M = 200;

/** Wind speed (km/h) below which air is treated as stagnant (estimate). */
export const INVERSION_STAGNANT_WIND_KMH = 5;

/** Boundary-layer height (m) at which daytime mixing is treated as having cleared the inversion (estimate). */
export const INVERSION_CLEARED_BLH_M = 500;

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
  /** In-transit PM2.5 relative to ambient air (estimate, informed by Delhi on-road studies such as Goel et al. 2015, Atmospheric Environment). */
  readonly exposureMultiplier: number;
  /** Typical urban door-to-door speed in km/h (estimate). */
  readonly speedKmh: number;
  /** Tailpipe/grid CO₂ in kg per km — per vehicle for private modes, per passenger for bus and metro (estimate, India GHG Program road-transport factors). */
  readonly co2KgPerKm: number;
  /** Breathing rate while travelling, m³/h. */
  readonly breathingM3h: number;
  /** True for modes the traveller drives (engine-off and carpool advice apply). */
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

/** People sharing a car when carpooling (estimate). */
export const CARPOOL_OCCUPANTS = 3;

/** Longest one-way distance (km) suggested for cycling and walking commutes (estimate). */
export const MAX_CYCLE_KM = 8;
export const MAX_WALK_KM = 2;

// ---------------------------------------------------------------- Indoor air (mass-balance model)

/** Share of outdoor PM2.5 that penetrates the building envelope (estimate; typical 0.6–1.0). */
export const INDOOR_PENETRATION = 0.8;

/** PM2.5 loss to indoor surfaces, per hour (estimate; typical 0.1–0.4). */
export const INDOOR_DEPOSITION_PER_H = 0.2;

/** Air changes per hour for each envelope, plus windows open (estimates). */
export const AIR_CHANGES_PER_H: Readonly<Record<Airtightness | 'windows_open', number>> = {
  leaky: 1.5,
  average: 1.0,
  sealed: 0.5,
  windows_open: 5.0,
};

/** One step tighter for the "seal gaps" advice. */
export const TIGHTER_ENVELOPE: Readonly<Record<Airtightness, Airtightness>> = {
  leaky: 'average',
  average: 'sealed',
  sealed: 'sealed',
};

/** Ceiling height used to turn floor area into room volume, in metres (estimate). */
export const CEILING_HEIGHT_M = 2.8;

/** Clean-air delivery rate assumed for a typical home purifier, m³/h (estimate). */
export const DEFAULT_PURIFIER_CADR_M3H = 250;

/** Cooking fuels that fill the home with smoke: solid biomass and kerosene (WHO household-energy guidance). */
export const SMOKY_FUELS: readonly CookingFuel[] = ['biomass', 'kerosene'];

/** PM2.5 emitted while burning, µg/h (order-of-magnitude estimates). */
export const INDOOR_SOURCE_UG_PER_H = {
  incense: 20_000,
  smoking: 25_000,
} as const;

// ---------------------------------------------------------------- How strongly to react

/**
 * The AQI band (0–5) at which each severity mode starts. A household with high sensitivity (an
 * infant, a senior or anyone with a heart or lung condition or a pregnancy) is in emergency mode
 * one band earlier.
 */
export const SEVERITY_BAND = {
  caution: 2,
  restrict: 3,
  emergency: 5,
  sensitiveEmergency: 4,
} as const;

/** The AQI band at which each outdoor advice starts for most people. */
export const OUTDOOR_ADVICE_BAND = { reduce: 3, avoid: 4, stayIndoors: 5 } as const;

/** How many bands sooner highly sensitive people get each outdoor advice. */
export const SENSITIVE_ADVICE_SHIFT = 1;

// ---------------------------------------------------------------- When actions apply

/**
 * The AQI band (0–5) at which each action starts to apply. Band 2 is Moderate (India) or
 * Unhealthy for Sensitive Groups (US); 3 is Poor / Unhealthy; 4 is Very Poor / Very Unhealthy.
 */
export const ACTION_BAND = {
  commuteMask: 2,
  alertSensitive: 2,
  maskEveryone: 3,
  reportOpenBurning: 3,
  checkOnNeighbours: 4,
  grapCheck: 4,
} as const;

// ---------------------------------------------------------------- Ranking

/** How much each household sensitivity amplifies health benefits when ranking. */
export const SENSITIVITY_WEIGHT: Readonly<Record<Sensitivity, number>> = {
  normal: 1,
  elevated: 1.5,
  high: 2,
};

/** Ranking points per kg of CO₂ avoided each week. */
export const CO2_RANK_WEIGHT = 2;

/** Ranking points deducted for the effort an action takes. */
export const EFFORT_PENALTY: Readonly<Record<Level, number>> = {
  low: 0,
  medium: 5,
  high: 15,
};

/** Exposure-equivalent points for benefits that are described, not measured. */
export const QUALITATIVE_BENEFIT_PCT: Readonly<Record<Level, number>> = {
  low: 5,
  medium: 15,
  high: 30,
};

/** Added to protective actions in smog-emergency mode so they always rank first. */
export const EMERGENCY_BOOST = 1000;

/** Clean windows that cut exposure by less than this (%) are not worth moving a routine for. */
export const MIN_WORTHWHILE_REDUCTION_PCT = 10;

/** Hour the purifier timeline entry is shown at (bedtime). */
export const PURIFIER_NIGHT_HOUR = 21;

// ---------------------------------------------------------------- Delhi NCR

/** Approximate bounding box of the National Capital Region (CAQM's jurisdiction). */
export const NCR_BOUNDS = { latMin: 27.9, latMax: 29.2, lonMin: 76.8, lonMax: 77.9 } as const;
