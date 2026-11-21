import type { OutdoorAdvice, Sensitivity } from '../shared/plan.js';
import type { Member } from '../shared/profile.js';
import { OUTDOOR_ADVICE_BAND, SENSITIVE_ADVICE_SHIFT } from './constants.js';

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

/** A household is as sensitive as its most sensitive member. */
export function householdSensitivity(members: readonly Member[]): Sensitivity {
  const levels = members.map(memberSensitivity);
  if (levels.includes('high')) {
    return 'high';
  }
  return levels.includes('elevated') ? 'elevated' : 'normal';
}

/** Ids of members with high sensitivity, who get personal alerts. */
export function highRiskMemberIds(members: readonly Member[]): string[] {
  return members.filter((m) => memberSensitivity(m) === 'high').map((m) => m.id);
}

/**
 * Outdoor-activity advice for an AQI band (0–5) and sensitivity. Highly sensitive people get
 * each step one band sooner; at the worst band everyone stays indoors.
 */
export function outdoorAdvice(band: number, sensitivity: Sensitivity): OutdoorAdvice {
  const felt = sensitivity === 'high' ? band + SENSITIVE_ADVICE_SHIFT : band;
  if (felt >= OUTDOOR_ADVICE_BAND.stayIndoors) {
    return 'stay_indoors';
  }
  if (felt >= OUTDOOR_ADVICE_BAND.avoid) {
    return 'avoid';
  }
  return felt >= OUTDOOR_ADVICE_BAND.reduce ? 'reduce' : 'ok';
}
