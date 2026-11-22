import type { Sensitivity, Severity } from '../shared/plan.js';
import type { OutdoorAdvice } from '../shared/recommendation.js';
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

/** Ids of members in a sensitive group (children, infants, seniors, health conditions): they get personal alerts. */
export function sensitiveMemberIds(members: readonly Member[]): string[] {
  return members.filter((m) => memberSensitivity(m) !== 'normal').map((m) => m.id);
}

const NO_EXERTION: ReadonlySet<OutdoorAdvice> = new Set(['avoid', 'stay_indoors']);

/** Whether exertion outdoors is off today: the advice says avoid it or stay in, or it is an emergency. */
export function outdoorExertionUnsafe(advice: OutdoorAdvice, severity: Severity): boolean {
  return NO_EXERTION.has(advice) || severity === 'emergency';
}

/**
 * Outdoor-activity advice for an AQI band (0–5) and sensitivity. Sensitive groups, children
 * included, get each step one band sooner; at the worst band everyone stays indoors.
 */
export function outdoorAdvice(band: number, sensitivity: Sensitivity): OutdoorAdvice {
  const felt = sensitivity === 'normal' ? band : band + SENSITIVE_ADVICE_SHIFT;
  if (felt >= OUTDOOR_ADVICE_BAND.stayIndoors) {
    return 'stay_indoors';
  }
  if (felt >= OUTDOOR_ADVICE_BAND.avoid) {
    return 'avoid';
  }
  return felt >= OUTDOOR_ADVICE_BAND.reduce ? 'reduce' : 'ok';
}
