import type { Sensitivity, Severity } from '../shared/plan.js';
import { SEVERITY_BAND } from './constants.js';

/**
 * How strongly the plan should react to an AQI band: normal, caution, restrict or smog
 * emergency. A highly sensitive household reaches emergency mode one band earlier.
 */
export function severityMode(band: number, sensitivity: Sensitivity): Severity {
  const emergencyBand =
    sensitivity === 'high' ? SEVERITY_BAND.sensitiveEmergency : SEVERITY_BAND.emergency;
  if (band >= emergencyBand) {
    return 'emergency';
  }
  if (band >= SEVERITY_BAND.restrict) {
    return 'restrict';
  }
  return band >= SEVERITY_BAND.caution ? 'caution' : 'normal';
}
