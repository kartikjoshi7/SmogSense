import type { Plan } from '../../shared/plan.js';

const DEVANAGARI_ZERO = '०'.charCodeAt(0);

/** Numbers that appear in ordinary sentences: clock hours, small counts, "PM2.5", "N95", "PM10". */
const ALWAYS_ALLOWED = new Set([2.5, 95]);
const MAX_ALWAYS_ALLOWED_INTEGER = 24;

/** How far a quoted number may be from a fact and still count as that fact rounded. */
const ROUNDING_TOLERANCE = 0.5;

/** Replace Devanagari digits (०–९) with ASCII so Hindi answers are checked too. */
function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - DEVANAGARI_ZERO));
}

/** Every number written in the text, reading "1,234" and "12.5" as single numbers. */
export function extractNumbers(text: string): number[] {
  const matches = toAsciiDigits(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches.map((m) => Number(m.replace(/,/g, '')));
}

function addNumbers(target: Set<number>, values: readonly unknown[]): void {
  for (const value of values) {
    if (typeof value === 'number') {
      target.add(value);
    }
  }
}

/** Every number the plan supports: the readings, timing, forecast and each recommendation's facts. */
export function allowedNumbers(plan: Plan): ReadonlySet<number> {
  const allowed = new Set(ALWAYS_ALLOWED);
  addNumbers(allowed, [plan.index.value, plan.index.pm25Mean24h]);
  addNumbers(allowed, Object.values(plan.current));
  addNumbers(allowed, Object.values(plan.inversion));
  addNumbers(allowed, [plan.cleanestHour?.hour, plan.cleanestHour?.pm25]);
  addNumbers(
    allowed,
    plan.forecast.map((point) => point.pm25),
  );
  for (const rec of plan.recommendations) {
    addNumbers(allowed, [...Object.values(rec.impact), ...Object.values(rec.facts)]);
  }
  return allowed;
}

function isAllowed(value: number, allowed: ReadonlySet<number>): boolean {
  if (Number.isInteger(value) && value <= MAX_ALWAYS_ALLOWED_INTEGER) {
    return true;
  }
  return [...allowed].some((fact) => Math.abs(fact - value) <= ROUNDING_TOLERANCE);
}

/** True when every number in the text matches a supported fact (allowing for rounding). */
export function isGrounded(text: string, allowed: ReadonlySet<number>): boolean {
  return extractNumbers(text).every((value) => isAllowed(value, allowed));
}
