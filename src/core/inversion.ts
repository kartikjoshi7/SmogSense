/** Winter inversion: whether pollution is trapped near the ground now, and when it clears. */
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
 * data it falls back to stagnant wind alone, and with no weather data at all it says so: `basis`
 * is then "none" and nothing is reported as trapped.
 */
export function analyzeInversion(hourly: readonly HourlyReading[], nowIndex: number): Inversion {
  const horizon = hourly.slice(nowIndex, nowIndex + PLAN_HORIZON_HOURS);
  const current = horizon[0];
  if (current === undefined || current.blhM === null) {
    const hasWind = current !== undefined && current.windKmh !== null;
    return {
      trappedNow: hasWind && isStagnant(current),
      clearsAtHour: null,
      minBlhM: null,
      maxBlhM: null,
      basis: hasWind ? 'wind_only' : 'none',
    };
  }
  const heights = horizon.map((h) => h.blhM).filter((v): v is number => v !== null);
  const clears = horizon.slice(1).find((h) => h.blhM !== null && h.blhM >= INVERSION_CLEARED_BLH_M);
  return {
    trappedNow: current.blhM < INVERSION_TRAPPED_BLH_M,
    clearsAtHour: clears?.hour ?? null,
    minBlhM: Math.min(...heights),
    maxBlhM: Math.max(...heights),
    basis: 'boundary_layer',
  };
}
