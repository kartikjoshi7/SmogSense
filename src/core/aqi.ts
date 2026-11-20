import type { AirData, HourlyReading } from '../shared/schemas.js';
import {
  AQI_MAX,
  AQI_MIN_HOURLY_READINGS_24H,
  AQI_TRAILING_HOURS,
  NAQI_CATEGORIES,
  NAQI_PM10_BREAKPOINTS,
  NAQI_PM25_BREAKPOINTS,
  US_AQI_CATEGORIES,
  US_AQI_PM10_BREAKPOINTS,
  US_AQI_PM25_BREAKPOINTS,
  type AqiBreakpoint,
} from './constants.js';

export type AqiScale = 'naqi' | 'us_aqi';

interface AqiSuccess {
  readonly ok: true;
  readonly scale: AqiScale;
  readonly value: number;
  readonly category: string;
  readonly band: number;
  readonly pm25Mean24h: number;
}

interface AqiInsufficient {
  readonly ok: false;
  readonly error: 'insufficient_data';
}

export type AqiResult = AqiSuccess | AqiInsufficient;

/**
 * Linearly interpolate a pollutant sub-index within a breakpoint band:
 * I = (I_hi − I_lo) / (B_hi − B_lo) × (C − B_lo) + I_lo, rounded to an integer.
 */
export function interpolateSubIndex(concentration: number, bp: AqiBreakpoint): number {
  const fraction = (concentration - bp.bpLo) / (bp.bpHi - bp.bpLo);
  const interpolated = (bp.iHi - bp.iLo) * fraction + bp.iLo;
  return Math.round(interpolated);
}

/**
 * Calculate India NAQI PM2.5 sub-index using CPCB 24-hour half-open breakpoints (previous upper, upper].
 * Upper reference for Severe band is 380 µg/m³ (documented assumption/estimate), capped at 500.
 */
export function computeNaqiPm25(pm25: number): number {
  if (pm25 <= 0) {
    return 0;
  }
  for (const bp of NAQI_PM25_BREAKPOINTS) {
    if (pm25 <= bp.bpHi) {
      return interpolateSubIndex(pm25, bp);
    }
  }
  return AQI_MAX;
}

/**
 * Calculate India NAQI PM10 sub-index using CPCB 24-hour half-open breakpoints.
 * Capped at 500 above 510 µg/m³.
 */
export function computeNaqiPm10(pm10: number): number {
  if (pm10 <= 0) {
    return 0;
  }
  for (const bp of NAQI_PM10_BREAKPOINTS) {
    if (pm10 <= bp.bpHi) {
      return interpolateSubIndex(pm10, bp);
    }
  }
  return AQI_MAX;
}

/**
 * Calculate US AQI PM2.5 sub-index using EPA breakpoints (Feb 2024 update).
 * Concentration truncated to 0.1 µg/m³ per EPA standard.
 */
export function computeUsAqiPm25(rawPm25: number): number {
  const pm25 = Math.floor(rawPm25 * 10 + 1e-9) / 10;
  if (pm25 <= 0) {
    return 0;
  }
  for (const bp of US_AQI_PM25_BREAKPOINTS) {
    if (pm25 <= bp.bpHi) {
      return interpolateSubIndex(pm25, bp);
    }
  }
  return AQI_MAX;
}

/**
 * Calculate US AQI PM10 sub-index using EPA breakpoints.
 * Concentration truncated to integer per EPA standard.
 */
export function computeUsAqiPm10(rawPm10: number): number {
  const pm10 = Math.floor(rawPm10 + 1e-9);
  if (pm10 <= 0) {
    return 0;
  }
  for (const bp of US_AQI_PM10_BREAKPOINTS) {
    if (pm10 <= bp.bpHi) {
      return interpolateSubIndex(pm10, bp);
    }
  }
  return AQI_MAX;
}

/**
 * Map an India NAQI index value (0–500) to standard band 0–5.
 */
export function getNaqiBand(value: number): number {
  if (value <= 50) {
    return 0;
  }
  if (value <= 100) {
    return 1;
  }
  if (value <= 200) {
    return 2;
  }
  if (value <= 300) {
    return 3;
  }
  if (value <= 400) {
    return 4;
  }
  return 5;
}

/**
 * Map a US AQI index value (0–500) to standard band 0–5.
 */
export function getUsAqiBand(value: number): number {
  if (value <= 50) {
    return 0;
  }
  if (value <= 100) {
    return 1;
  }
  if (value <= 150) {
    return 2;
  }
  if (value <= 200) {
    return 3;
  }
  if (value <= 300) {
    return 4;
  }
  return 5;
}

/**
 * Select active AQI scale (NAQI for India, otherwise US AQI).
 * Choice: NAQI when countryCode is "IN", or when countryCode is null and timezone is Asia/Kolkata or Asia/Calcutta.
 */
export function selectAqiScale(countryCode: string | null, timezone: string): AqiScale {
  if (countryCode?.toUpperCase() === 'IN') {
    return 'naqi';
  }
  if (countryCode === null && (timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta')) {
    return 'naqi';
  }
  return 'us_aqi';
}

function extractHourlyTrailing(
  hourly: readonly HourlyReading[],
  nowIndex: number,
): { pm25: number[]; pm10: number[] } {
  const startIndex = Math.max(0, nowIndex - (AQI_TRAILING_HOURS - 1));
  const slice = hourly.slice(startIndex, nowIndex + 1);

  const pm25: number[] = [];
  const pm10: number[] = [];
  for (const h of slice) {
    if (h.pm25 !== null) {
      pm25.push(h.pm25);
    }
    if (h.pm10 !== null) {
      pm10.push(h.pm10);
    }
  }
  return { pm25, pm10 };
}

export function getCategoryName(categories: readonly [string, ...string[]], band: number): string {
  const name = categories[band];
  if (name !== undefined) {
    return name;
  }
  return categories[0];
}

function resolveScaleValue(
  scale: AqiScale,
  pm25Mean: number,
  pm10Values: readonly number[],
): { value: number; band: number; category: string } {
  const isNaqi = scale === 'naqi';
  const pm25Sub = isNaqi ? computeNaqiPm25(pm25Mean) : computeUsAqiPm25(pm25Mean);

  let pm10Sub: number | null = null;
  if (pm10Values.length >= AQI_MIN_HOURLY_READINGS_24H) {
    const pm10Mean = pm10Values.reduce((acc, v) => acc + v, 0) / pm10Values.length;
    pm10Sub = isNaqi ? computeNaqiPm10(pm10Mean) : computeUsAqiPm10(pm10Mean);
  }

  const value = pm10Sub !== null ? Math.max(pm25Sub, pm10Sub) : pm25Sub;
  const band = isNaqi ? getNaqiBand(value) : getUsAqiBand(value);
  const categories = isNaqi ? NAQI_CATEGORIES : US_AQI_CATEGORIES;
  const category = getCategoryName(categories, band);

  return { value, band, category };
}

/**
 * Compute headline air quality index from trailing 24-hour mean ending at nowIndex.
 * Requires at least 16 non-null hourly PM2.5 readings.
 */
export function computeIndex(air: AirData): AqiResult {
  const { pm25, pm10 } = extractHourlyTrailing(air.hourly, air.nowIndex);

  if (pm25.length < AQI_MIN_HOURLY_READINGS_24H) {
    return { ok: false, error: 'insufficient_data' };
  }

  const pm25Mean24h = pm25.reduce((acc, v) => acc + v, 0) / pm25.length;
  const scale = selectAqiScale(air.countryCode, air.timezone);
  const { value, band, category } = resolveScaleValue(scale, pm25Mean24h, pm10);

  return {
    ok: true,
    scale,
    value,
    category,
    band,
    pm25Mean24h,
  };
}
