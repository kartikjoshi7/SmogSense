import type { SensitivityLevel } from './risk.js';

export type SeverityMode = 'normal' | 'caution' | 'restrict' | 'emergency';

/**
 * Determine operational action mode from AQI band (0–5) and household sensitivity.
 * - Mode from band: 0–1 normal · 2 caution · 3–4 restrict · 5 emergency.
 * - Also emergency at band 4 when household sensitivity is high.
 */
export function severityMode(band: number, sensitivity: SensitivityLevel = 'normal'): SeverityMode {
  if (band >= 5) {
    return 'emergency';
  }
  if (band === 4) {
    return sensitivity === 'high' ? 'emergency' : 'restrict';
  }
  if (band === 3) {
    return 'restrict';
  }
  if (band === 2) {
    return 'caution';
  }
  return 'normal';
}
