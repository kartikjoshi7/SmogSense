/**
 * Air-quality indexes, the forecast window and the winter inversion.
 * Sources: docs/ARCHITECTURE.md › Assumptions behind the numbers.
 */
import type { AqiCategory, AqiScale } from '../../shared/plan.js';

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

/**
 * Decimal places engine figures are rounded to: display precision, not measurement precision.
 * `quotedPm25` is for PM2.5 quoted to people in facts and the summary: whole µg/m³.
 */
export const DECIMALS = { pm25Mean: 1, windowMean: 2, doseUg: 1, co2Kg: 1, quotedPm25: 0 } as const;

/**
 * Decimals a 24-hour mean is first rounded to, so float error cannot push it below a breakpoint
 * (24 readings of 9.1 average to 9.0999…, which must still truncate to 9.1).
 */
export const FLOAT_ERROR_DECIMALS = 6;

// ---------------------------------------------------------------- Winter inversion

/**
 * Boundary-layer height (m) below which pollution is treated as trapped near the ground (estimate).
 */
export const INVERSION_TRAPPED_BLH_M = 200;

/** Wind speed (km/h) below which air is treated as stagnant (estimate). */
export const INVERSION_STAGNANT_WIND_KMH = 5;

/**
 * Boundary-layer height (m) at which daytime mixing is treated as having cleared the inversion
 * (estimate).
 */
export const INVERSION_CLEARED_BLH_M = 500;
