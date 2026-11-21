import type { Plan } from '../../shared/plan.js';

const DEVANAGARI_ZERO = '०'.charCodeAt(0);

/** Numbers inside common terms ("PM2.5", "N95"); "PM10" is covered by the small-number rule. */
const ALWAYS_ALLOWED = new Set([2.5, 95]);

/** Whole numbers up to this are clock hours or counts ("at 14", "3 steps") unless given a unit. */
const MAX_PLAIN_INTEGER = 24;

/** A percentage, mass or concentration right after a number makes it an impact claim. */
const MEASURE_AFTER = /^\s*(?:%|percent|per cent|प्रतिशत|kg|mg|µg|μg|ug)/iu;
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/** A number in the text and the characters that follow it. */
interface Quantity {
  readonly value: number;
  readonly measured: boolean;
}

/** How far a quoted number may be from a fact and still count as that fact rounded. */
const ROUNDING_TOLERANCE = 0.5;

/** Replace Devanagari digits (०–९) with ASCII so Hindi answers are checked too. */
function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - DEVANAGARI_ZERO));
}

/**
 * Every number written in the text, reading "1,234" and "12.5" as single numbers, and whether it
 * is a measurement (followed by %, kg, µg and the like).
 */
function extractQuantities(text: string): Quantity[] {
  const ascii = toAsciiDigits(text);
  return Array.from(ascii.matchAll(NUMBER), (match) => ({
    value: Number(match[0].replace(/,/g, '')),
    measured: MEASURE_AFTER.test(ascii.slice(match.index + match[0].length)),
  }));
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

function isAllowed({ value, measured }: Quantity, allowed: ReadonlySet<number>): boolean {
  if (!measured && Number.isInteger(value) && value <= MAX_PLAIN_INTEGER) {
    return true;
  }
  return [...allowed].some((fact) => Math.abs(fact - value) <= ROUNDING_TOLERANCE);
}

/**
 * True when every number in the text is a fact of the plan (allowing for rounding). Small whole
 * numbers pass as clock hours or counts, but never with a percent sign or a unit of mass.
 */
export function isGrounded(text: string, allowed: ReadonlySet<number>): boolean {
  return extractQuantities(text).every((quantity) => isAllowed(quantity, allowed));
}
