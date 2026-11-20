import type { HourlyReading } from '../shared/schemas.js';
import {
  INVERSION_BLH_CLEARS_THRESHOLD_M,
  INVERSION_BLH_TRAPPED_THRESHOLD_M,
  INVERSION_WIND_TRAPPED_THRESHOLD_KMH,
} from './constants.js';

export interface InversionResult {
  readonly trappedNow: boolean;
  readonly clearsAtHour: number | null;
  readonly minBlhM: number | null;
  readonly maxBlhM: number | null;
  readonly basis: 'boundary_layer' | 'wind_only';
}

function findClearsAtHour(hourly: readonly HourlyReading[], nowIndex: number): number | null {
  const maxLookahead = Math.min(hourly.length, nowIndex + 24);
  for (let i = nowIndex + 1; i < maxLookahead; i++) {
    const reading = hourly[i];
    if (reading && reading.blhM !== null && reading.blhM >= INVERSION_BLH_CLEARS_THRESHOLD_M) {
      return reading.hour;
    }
  }
  return null;
}

function computeBlhExtremes(
  hourly: readonly HourlyReading[],
  nowIndex: number,
): { minBlhM: number | null; maxBlhM: number | null } {
  const maxLookahead = Math.min(hourly.length, nowIndex + 24);
  const blhValues = hourly
    .slice(nowIndex, maxLookahead)
    .map((h) => h.blhM)
    .filter((v): v is number => v !== null);

  const minBlhM = Math.min(...blhValues);
  const maxBlhM = Math.max(...blhValues);
  return { minBlhM, maxBlhM };
}

/**
 * Analyze surface temperature inversion trapping and boundary layer ventilation.
 * Evaluates conditions at nowIndex and the upcoming 24-hour diurnal cycle.
 * Falls back to wind speed alone when boundary layer height data is missing.
 */
export function analyzeInversion(
  hourly: readonly HourlyReading[],
  nowIndex: number,
): InversionResult {
  const current = hourly[nowIndex];
  if (!current) {
    return {
      trappedNow: false,
      clearsAtHour: null,
      minBlhM: null,
      maxBlhM: null,
      basis: 'wind_only',
    };
  }

  // When boundary-layer data is missing, fall back to wind only
  if (current.blhM === null) {
    const trappedNow =
      current.windKmh !== null && current.windKmh < INVERSION_WIND_TRAPPED_THRESHOLD_KMH;
    return {
      trappedNow,
      clearsAtHour: null,
      minBlhM: null,
      maxBlhM: null,
      basis: 'wind_only',
    };
  }

  const trappedNow =
    current.blhM < INVERSION_BLH_TRAPPED_THRESHOLD_M &&
    current.windKmh !== null &&
    current.windKmh < INVERSION_WIND_TRAPPED_THRESHOLD_KMH;

  const clearsAtHour = findClearsAtHour(hourly, nowIndex);
  const { minBlhM, maxBlhM } = computeBlhExtremes(hourly, nowIndex);

  return {
    trappedNow,
    clearsAtHour,
    minBlhM,
    maxBlhM,
    basis: 'boundary_layer',
  };
}
