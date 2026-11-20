/**
 * Breakpoint interval for AQI linear interpolation.
 */
export interface AqiBreakpoint {
  readonly bpLo: number;
  readonly bpHi: number;
  readonly iLo: number;
  readonly iHi: number;
}

// --- India NAQI (CPCB 2014) ---
// Source: Central Pollution Control Board (CPCB), National Air Quality Index (NAQI) Technical Report, 2014.
// Documented assumption: only the PM pollutants (PM2.5, PM10) are used for headline calculation.

/**
 * India NAQI 24-hour breakpoints for PM2.5 in µg/m³.
 * Note: The open-ended Severe band's upper reference of 380 µg/m³ is a documented assumption (estimate).
 */
export const NAQI_PM25_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { bpLo: 0, bpHi: 30, iLo: 0, iHi: 50 },
  { bpLo: 30, bpHi: 60, iLo: 51, iHi: 100 },
  { bpLo: 60, bpHi: 90, iLo: 101, iHi: 200 },
  { bpLo: 90, bpHi: 120, iLo: 201, iHi: 300 },
  { bpLo: 120, bpHi: 250, iLo: 301, iHi: 400 },
  { bpLo: 250, bpHi: 380, iLo: 401, iHi: 500 }, // 380 is a documented assumption (estimate)
];

/**
 * India NAQI 24-hour breakpoints for PM10 in µg/m³.
 * Source: CPCB NAQI Technical Report, 2014.
 */
export const NAQI_PM10_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { bpLo: 0, bpHi: 50, iLo: 0, iHi: 50 },
  { bpLo: 50, bpHi: 100, iLo: 51, iHi: 100 },
  { bpLo: 100, bpHi: 250, iLo: 101, iHi: 200 },
  { bpLo: 250, bpHi: 350, iLo: 201, iHi: 300 },
  { bpLo: 350, bpHi: 430, iLo: 301, iHi: 400 },
  { bpLo: 430, bpHi: 510, iLo: 401, iHi: 500 },
];

/** India NAQI category descriptors corresponding to bands 0 through 5. */
export const NAQI_CATEGORIES = [
  'Good',
  'Satisfactory',
  'Moderate',
  'Poor',
  'Very Poor',
  'Severe',
] as const;

// --- US AQI (EPA 2024) ---
// Source: US Environmental Protection Agency (EPA), Air Quality Index (AQI) Reporting, Feb 2024 update.

/**
 * US AQI breakpoints for PM2.5 in µg/m³ (truncated to 0.1 µg/m³ per EPA standard).
 * Source: EPA PM2.5 AQI breakpoints update (Feb 2024).
 */
export const US_AQI_PM25_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { bpLo: 0.0, bpHi: 9.0, iLo: 0, iHi: 50 },
  { bpLo: 9.1, bpHi: 35.4, iLo: 51, iHi: 100 },
  { bpLo: 35.5, bpHi: 55.4, iLo: 101, iHi: 150 },
  { bpLo: 55.5, bpHi: 125.4, iLo: 151, iHi: 200 },
  { bpLo: 125.5, bpHi: 225.4, iLo: 201, iHi: 300 },
  { bpLo: 225.5, bpHi: 325.4, iLo: 301, iHi: 500 },
];

/**
 * US AQI breakpoints for PM10 in µg/m³ (truncated to integer per EPA standard).
 * Source: US EPA AQI breakpoints for PM10.
 */
export const US_AQI_PM10_BREAKPOINTS: readonly AqiBreakpoint[] = [
  { bpLo: 0, bpHi: 54, iLo: 0, iHi: 50 },
  { bpLo: 55, bpHi: 154, iLo: 51, iHi: 100 },
  { bpLo: 155, bpHi: 254, iLo: 101, iHi: 150 },
  { bpLo: 255, bpHi: 354, iLo: 151, iHi: 200 },
  { bpLo: 355, bpHi: 424, iLo: 201, iHi: 300 },
  { bpLo: 425, bpHi: 604, iLo: 301, iHi: 500 },
];

/** US AQI category descriptors corresponding to bands 0 through 5. */
export const US_AQI_CATEGORIES = [
  'Good',
  'Moderate',
  'Unhealthy for Sensitive Groups',
  'Unhealthy',
  'Very Unhealthy',
  'Hazardous',
] as const;

/** Maximum index cap for both NAQI and US AQI scales. */
export const AQI_MAX = 500;

/** Minimum valid hourly observations required out of 24 hours (75% data completeness rule). */
export const AQI_MIN_HOURLY_READINGS_24H = 16;

/** Number of hours in a full trailing daily window. */
export const AQI_TRAILING_HOURS = 24;

// --- Inversion thresholds ---
// Source: Atmospheric boundary layer meteorology for urban winter inversion trapping.

/** Boundary layer height threshold (m) below which air pollutants are trapped in a surface layer. */
export const INVERSION_BLH_TRAPPED_THRESHOLD_M = 200;

/** Surface wind speed threshold (km/h) below which dispersion is stagnant. */
export const INVERSION_WIND_TRAPPED_THRESHOLD_KMH = 5;

/** Convective boundary layer height threshold (m) where daytime thermal mixing clears the inversion. */
export const INVERSION_BLH_CLEARS_THRESHOLD_M = 500;

// --- Inhaled dose and exposure coefficients ---
// Source: US EPA Exposure Factors Handbook (2011 Edition, Chapter 6: Inhalation Rates).
// Adult short-term mean breathing rates (m³/h).

/** Sedentary breathing rate in m³/h (EPA 2011 Table 6-1, resting adult). */
export const BREATHING_RATE_SEDENTARY = 0.3;

/** Light activity breathing rate in m³/h (EPA 2011 Table 6-1, e.g. gentle yoga or passenger). */
export const BREATHING_RATE_LIGHT = 0.7;

/** Moderate activity breathing rate in m³/h (EPA 2011 Table 6-1, brisk walk). */
export const BREATHING_RATE_MODERATE = 1.6;

/** Vigorous activity breathing rate in m³/h (EPA 2011 Table 6-1, running or sports). */
export const BREATHING_RATE_VIGOROUS = 3.0;

/** Cycling breathing rate in m³/h (moderate-vigorous commuter/leisure cycling). */
export const BREATHING_RATE_CYCLE = 2.5;

// --- Age adjustment factors ---
// Source: Simplified physiological ventilation volume ratio relative to adult baseline (estimate).

/** Relative inhalation volume ratio for infants (estimate). */
export const AGE_FACTOR_INFANT = 0.4;

/** Relative inhalation volume ratio for children (estimate). */
export const AGE_FACTOR_CHILD = 0.7;

/** Relative inhalation volume ratio for teenagers (estimate). */
export const AGE_FACTOR_TEEN = 0.9;

/** Baseline adult inhalation factor (reference 1.0). */
export const AGE_FACTOR_ADULT = 1.0;

/** Relative inhalation volume ratio for seniors (estimate). */
export const AGE_FACTOR_SENIOR = 0.9;

// --- Mask reduction factors ---
// Source: Particle filtration efficiency combined with typical real-world inward leakage (conservative estimate).

/** Mask reduction factor for no mask (estimate: 0% reduction). */
export const MASK_REDUCTION_NONE = 0.0;

/** Mask reduction factor for cloth masks (conservative estimate: 20% reduction). */
export const MASK_REDUCTION_CLOTH = 0.2;

/** Mask reduction factor for disposable surgical masks (conservative estimate: 40% reduction). */
export const MASK_REDUCTION_SURGICAL = 0.4;

/** Mask reduction factor for fitted N95 respirators (conservative estimate: 80% reduction). */
export const MASK_REDUCTION_N95 = 0.8;

// --- Commute microenvironment exposure multipliers ---
// Source: Delhi on-road exposure and commuter microenvironment studies (e.g. Goel et al. 2015, Atmospheric Environment) (estimate).

/** In-transit PM2.5 ratio relative to ambient for walking along roadways (estimate). */
export const COMMUTE_MULTIPLIER_WALK = 1.2;

/** In-transit PM2.5 ratio relative to ambient for cycling along roadways (estimate). */
export const COMMUTE_MULTIPLIER_CYCLE = 1.2;

/** In-transit PM2.5 ratio relative to ambient on motorized two-wheelers in traffic (estimate). */
export const COMMUTE_MULTIPLIER_TWO_WHEELER = 1.4;

/** In-transit PM2.5 ratio relative to ambient inside open auto-rickshaws (estimate). */
export const COMMUTE_MULTIPLIER_AUTO = 1.5;

/** In-transit PM2.5 ratio relative to ambient inside non-AC / standard buses (estimate). */
export const COMMUTE_MULTIPLIER_BUS = 1.2;

/** In-transit PM2.5 ratio relative to ambient inside underground/elevated metro train cars (estimate). */
export const COMMUTE_MULTIPLIER_METRO = 0.7;

/** In-transit PM2.5 ratio relative to ambient in cars with closed windows and cabin filter recirculation (estimate). */
export const COMMUTE_MULTIPLIER_CAR = 0.6;

/** Default ambient microenvironment multiplier (baseline 1.0). */
export const COMMUTE_MULTIPLIER_DEFAULT = 1.0;

// --- Average urban commute travel speeds ---
// Source: Typical Indian metropolitan commuting speed estimates in traffic congestion (estimate).

/** Average walking speed in km/h (estimate). */
export const URBAN_SPEED_WALK_KMH = 5;

/** Average urban cycling speed in km/h (estimate). */
export const URBAN_SPEED_CYCLE_KMH = 12;

/** Average urban motorized two-wheeler speed in km/h (estimate). */
export const URBAN_SPEED_TWO_WHEELER_KMH = 25;

/** Average urban auto-rickshaw speed in km/h (estimate). */
export const URBAN_SPEED_AUTO_KMH = 20;

/** Average urban city bus speed in km/h (estimate). */
export const URBAN_SPEED_BUS_KMH = 15;

/** Average urban metro rail speed including walking access and dwell times in km/h (estimate). */
export const URBAN_SPEED_METRO_KMH = 30;

/** Average urban private/cab car speed in city traffic in km/h (estimate). */
export const URBAN_SPEED_CAR_KMH = 22;
