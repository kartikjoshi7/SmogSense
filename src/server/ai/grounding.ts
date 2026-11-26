/** The grounding check: AI text may only quote numbers that are facts of the plan. */
import { HOURS_PER_DAY } from '../../shared/limits.js';
import type { Plan } from '../../shared/plan.js';
import { SETTINGS } from '../config.js';
import * as logger from '../logger.js';

/** Numbers inside common terms ("PM2.5", "N95"); "PM10" is covered by the small-number rule. */
const ALWAYS_ALLOWED = new Set([2.5, 95]);

/** Whole numbers up to this are clock hours or counts ("at 14", "3 steps") unless given a unit. */
const MAX_PLAIN_INTEGER = HOURS_PER_DAY;

/**
 * A percent sign, a unit of mass, or the word for "percent" in one of the app's languages right
 * after a number makes it an impact claim.
 */
const MEASURE_AFTER =
  /^\s*(?:%|percent|per cent|kg|mg|µg|μg|ug|प्रतिशत|फ़ीसदी|फीसदी|टक्के|শতাংশ|ਪ੍ਰਤੀਸ਼ਤ|ਫ਼ੀਸਦੀ|ટકા|சதவீதம்|శాతం|ಶೇಕಡಾ|ശതമാനം)/iu;

/** Kannada and Bengali can write "percent" before the number ("ಶೇ 20", "শতকরা ২০"). */
const MEASURE_BEFORE = /(?:ಶೇಕಡಾ|ಶೇಕಡ|ಶೇ|শতকরা)\.?\s*$/u;

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/** A decimal digit in any script: ASCII, Devanagari, Bengali, Gurmukhi, Tamil and the rest. */
const ANY_DIGIT = /\p{Nd}/u;
const ANY_DIGITS = /\p{Nd}/gu;

/** A number in the text and whether a unit or percent sign marks it as a measurement. */
interface Quantity {
  readonly value: number;
  readonly measured: boolean;
  /** Decimal places written, so "1.2" matches 1.24 but not 1.7. */
  readonly decimals: number;
}

/** A quoted number matches a fact rounded to its last written digit: half a unit of that digit. */
const HALF_A_UNIT = 0.5;

/**
 * The value of a decimal digit in any script. Unicode encodes every script's digits as runs of
 * ten consecutive characters from 0 to 9, so the value is the digit's distance from the start of
 * its run of digits, modulo 10.
 */
function digitValue(digit: string): number {
  const code = digit.codePointAt(0) ?? 0;
  let start = code;
  while (ANY_DIGIT.test(String.fromCodePoint(start - 1))) {
    start -= 1;
  }
  return (code - start) % 10;
}

/** Write every decimal digit as ASCII, so numbers are checked whatever script the reply uses. */
function toAsciiDigits(text: string): string {
  return text.replace(ANY_DIGITS, (digit) => String(digitValue(digit)));
}

/**
 * Every number written in the text, reading "1,234" and "12.5" as single numbers, and whether it
 * is a measurement (a %, kg, µg or the word for "percent" next to it).
 */
function extractQuantities(text: string): Quantity[] {
  const ascii = toAsciiDigits(text);
  return Array.from(ascii.matchAll(NUMBER), (match) => ({
    value: Number(match[0].replace(/,/g, '')),
    decimals: match[0].split('.')[1]?.length ?? 0,
    measured:
      MEASURE_AFTER.test(ascii.slice(match.index + match[0].length)) ||
      MEASURE_BEFORE.test(ascii.slice(0, match.index)),
  }));
}

function addNumbers(target: Set<number>, values: readonly unknown[]): void {
  for (const value of values) {
    if (typeof value === 'number') {
      // Text states sizes ("rises by 30%", "0.4 kg more"), so a negative fact allows its size.
      target.add(Math.abs(value));
    }
  }
}

/**
 * Every number the plan supports: the readings, timing, forecast and each recommendation's facts.
 */
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
    addNumbers(allowed, [
      ...Object.values<unknown>(rec.impact),
      ...Object.values<unknown>(rec.facts),
    ]);
  }
  return allowed;
}

function isAllowed({ value, measured, decimals }: Quantity, allowed: ReadonlySet<number>): boolean {
  if (!measured && Number.isInteger(value) && value <= MAX_PLAIN_INTEGER) {
    return true;
  }
  const tolerance = HALF_A_UNIT / 10 ** decimals;
  return [...allowed].some((fact) => Math.abs(fact - value) <= tolerance);
}

/**
 * True when every number in the text is a fact of the plan (allowing for rounding). Small whole
 * numbers pass as clock hours or counts, but never with a percent sign or a unit of mass.
 */
export function isGrounded(text: string, allowed: ReadonlySet<number>): boolean {
  return extractQuantities(text).every((quantity) => isAllowed(quantity, allowed));
}

/** The kinds of text the model writes, each with its own output budget. */
export type ReplyKind = keyof typeof SETTINGS.aiMaxOutputTokens;

/** Log how many parts of an AI reply were dropped for quoting numbers the plan does not contain. */
export function logUngrounded(kind: ReplyKind, rejected: number): void {
  if (rejected > 0) {
    logger.warn('AI text failed the grounding check', { kind, rejected });
  }
}
