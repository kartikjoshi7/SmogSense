import type { Member } from '../shared/schemas.js';

export type SensitivityLevel = 'normal' | 'elevated' | 'high';
export type OutdoorAdvice = 'ok' | 'reduce' | 'avoid' | 'stay_indoors';

/**
 * Determine vulnerability sensitivity of an individual household member:
 * - "high" if the member has any health condition, or is an infant or senior.
 * - "elevated" if child age group.
 * - "normal" otherwise.
 */
export function memberSensitivity(member: Member): SensitivityLevel {
  if (
    member.conditions.length > 0 ||
    member.ageGroup === 'infant' ||
    member.ageGroup === 'senior'
  ) {
    return 'high';
  }
  if (member.ageGroup === 'child') {
    return 'elevated';
  }
  return 'normal';
}

/**
 * Household sensitivity is the highest sensitivity across all members.
 */
export function householdSensitivity(members: readonly Member[]): SensitivityLevel {
  let hasElevated = false;
  for (const m of members) {
    const s = memberSensitivity(m);
    if (s === 'high') {
      return 'high';
    }
    if (s === 'elevated') {
      hasElevated = true;
    }
  }
  return hasElevated ? 'elevated' : 'normal';
}

/**
 * Outdoor activity advice based on AQI band (0–5) and member/household sensitivity:
 * - band 0–1: ok.
 * - band 2: reduce for high, ok otherwise.
 * - band 3: avoid for high, reduce otherwise.
 * - band 4: stay_indoors for high, avoid otherwise.
 * - band 5: stay_indoors for everyone.
 */
export function outdoorAdvice(band: number, sensitivity: SensitivityLevel): OutdoorAdvice {
  if (band <= 1) {
    return 'ok';
  }
  if (band === 2) {
    return sensitivity === 'high' ? 'reduce' : 'ok';
  }
  if (band === 3) {
    return sensitivity === 'high' ? 'avoid' : 'reduce';
  }
  if (band === 4) {
    return sensitivity === 'high' ? 'stay_indoors' : 'avoid';
  }
  return 'stay_indoors';
}
