import type { HourlyReading } from '../shared/air.js';
import type { Inversion } from '../shared/plan.js';
import {
  INVERSION_CLEARED_BLH_M,
  INVERSION_STAGNANT_WIND_KMH,
  INVERSION_TRAPPED_BLH_M,
  PLAN_HORIZON_HOURS,
} from './constants.js';

function isStagnant(reading: HourlyReading): boolean {
  return reading.windKmh !== null && reading.windKmh < INVERSION_STAGNANT_WIND_KMH;
}

/**
 * Whether winter-inversion conditions trap pollution near the ground now, and the hour in the
 * next 24 when daytime mixing (boundary layer ≥ 500 m) should clear it. Without boundary-layer
 * data it falls back to wind speed alone and says so in `basis`.
 */
export function analyzeInversion(hourly: readonly HourlyReading[], nowIndex: number): Inversion {
  const horizon = hourly.slice(nowIndex, nowIndex + PLAN_HORIZON_HOURS);
  const current = horizon[0];
  if (current === undefined || current.blhM === null) {
    return {
      trappedNow: current !== undefined && isStagnant(current),
      clearsAtHour: null,
      minBlhM: null,
      maxBlhM: null,
      basis: 'wind_only',
    };
  }
  const heights = horizon.map((h) => h.blhM).filter((v): v is number => v !== null);
  const clears = horizon.slice(1).find((h) => h.blhM !== null && h.blhM >= INVERSION_CLEARED_BLH_M);
  return {
    trappedNow: current.blhM < INVERSION_TRAPPED_BLH_M && isStagnant(current),
    clearsAtHour: clears?.hour ?? null,
    minBlhM: Math.min(...heights),
    maxBlhM: Math.max(...heights),
    basis: 'boundary_layer',
  };
}
