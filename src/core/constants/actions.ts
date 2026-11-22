/**
 * When each kind of advice starts, and how recommendations are ranked.
 * Sources: docs/ARCHITECTURE.md › Assumptions behind the numbers.
 */
import type { Sensitivity } from '../../shared/plan.js';
import type { Level } from '../../shared/recommendation.js';

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

/** How many bands sooner sensitive groups (children included) get each outdoor advice. */
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
