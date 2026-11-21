import type { OutdoorAdvice, Sensitivity } from '../shared/plan.js';
import type { Member } from '../shared/profile.js';

/**
 * How sensitive one member is to particulate pollution: "high" with any health condition or
 * as an infant or senior, "elevated" for children, otherwise "normal".
 */
function memberSensitivity(member: Member): Sensitivity {
  if (
    member.conditions.length > 0 ||
    member.ageGroup === 'infant' ||
    member.ageGroup === 'senior'
  ) {
    return 'high';
  }
  return member.ageGroup === 'child' ? 'elevated' : 'normal';
}

const SENSITIVITY_ORDER: readonly Sensitivity[] = ['normal', 'elevated', 'high'];

/** A household is as sensitive as its most sensitive member. */
export function householdSensitivity(members: readonly Member[]): Sensitivity {
  const highest = Math.max(...members.map((m) => SENSITIVITY_ORDER.indexOf(memberSensitivity(m))));
  return SENSITIVITY_ORDER[highest] ?? 'normal';
}

/** Ids of members with high sensitivity, who get personal alerts. */
export function highRiskMemberIds(members: readonly Member[]): string[] {
  return members.filter((m) => memberSensitivity(m) === 'high').map((m) => m.id);
}

/**
 * Outdoor-activity advice for an AQI band (0–5) and sensitivity. Sensitive people move one
 * step sooner; at band 5 everyone stays indoors.
 */
export function outdoorAdvice(band: number, sensitivity: Sensitivity): OutdoorAdvice {
  const isHigh = sensitivity === 'high';
  if (band <= 1) {
    return 'ok';
  }
  if (band === 2) {
    return isHigh ? 'reduce' : 'ok';
  }
  if (band === 3) {
    return isHigh ? 'avoid' : 'reduce';
  }
  if (band === 4) {
    return isHigh ? 'stay_indoors' : 'avoid';
  }
  return 'stay_indoors';
}
