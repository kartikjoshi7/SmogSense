import type { Sensitivity, Severity } from '../shared/plan.js';

/**
 * How strongly the plan should react: bands 0–1 normal, 2 caution, 3–4 restrict, 5 smog
 * emergency. A highly sensitive household is already in emergency mode at band 4.
 */
export function severityMode(band: number, sensitivity: Sensitivity): Severity {
  if (band >= 5 || (band === 4 && sensitivity === 'high')) {
    return 'emergency';
  }
  if (band >= 3) {
    return 'restrict';
  }
  return band === 2 ? 'caution' : 'normal';
}
