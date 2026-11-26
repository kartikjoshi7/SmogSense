/** Clean-air windows: when to exercise and when to air the home, from the hourly forecast. */
import type { AirData, Daylight, HourlyReading } from '../shared/air.js';
import { HOURS_PER_DAY, MINUTES_PER_HOUR } from '../shared/limits.js';
import type { CleanestHour } from '../shared/plan.js';
import { DECIMALS, PLAN_HORIZON_HOURS } from './constants.js';
import { reduction } from './exposure.js';
import { mean, roundTo } from './numbers.js';

export interface WindowSearch {
  /** Index of the current hour; the search covers the next 24 hours from here. */
  readonly fromIndex: number;
  readonly daylight: readonly Daylight[];
  readonly durationMin: number;
  /** The household's usual start hour, used for comparison and tie-breaks; null if none. */
  readonly usualHour: number | null;
}

/** The best window for an activity. Both means are rounded to `DECIMALS.windowMean` places. */
export interface ActivityWindow {
  readonly startHour: number;
  readonly meanPm25: number;
  /** Mean PM2.5 at the usual time, or null when there is no usual hour in the forecast. */
  readonly usualMeanPm25: number | null;
  readonly reductionPct: number | null;
}

interface Candidate {
  readonly time: string;
  readonly hour: number;
  readonly mean: number;
}

/** Whether a local timestamp falls inside any daylight interval (all times share one zone). */
function isDaylight(time: string, daylight: readonly Daylight[]): boolean {
  return daylight.some((d) => time >= d.sunrise && time <= d.sunset);
}

/** Distance between two clock hours, going the short way round (0–12). */
function hourDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, HOURS_PER_DAY - diff);
}

/** Whole clock hours an activity occupies: a part hour counts as a whole one, and at least one. */
function spanHours(durationMin: number): number {
  return Math.max(1, Math.ceil(durationMin / MINUTES_PER_HOUR));
}

/** Mean PM2.5 over `span` hours from `start`, or null if any of those hours is missing. */
function spanMean(
  readings: readonly Pick<HourlyReading, 'pm25'>[],
  start: number,
  span: number,
): number | null {
  const values = readings
    .slice(start, start + span)
    .map((h) => h.pm25)
    .filter((v): v is number => v !== null);
  return values.length < span ? null : mean(values);
}

/**
 * Mean PM2.5 over an activity of `durationMin` starting at `readings[start]`, as the plan's
 * exercise window computes it; null when any hour it covers is missing or beyond the readings.
 */
export function activityMeanPm25(
  readings: readonly Pick<HourlyReading, 'pm25'>[],
  start: number,
  durationMin: number,
): number | null {
  const windowPm25 = spanMean(readings, start, spanHours(durationMin));
  return windowPm25 === null ? null : roundTo(windowPm25, DECIMALS.windowMean);
}

/** The usual times of a round trip, and how long each way takes. */
export interface RoundTrip {
  readonly departHour: number;
  readonly returnHour: number;
  readonly tripMin: number;
}

/**
 * Mean PM2.5 over both legs of a round trip, each starting at its usual hour in the next 24 hours.
 * Returns `fallback` (the 24-hour mean) when the forecast lacks either leg's hours.
 */
export function roundTripMeanPm25(
  air: Pick<AirData, 'hourly' | 'nowIndex'>,
  trip: RoundTrip,
  fallback: number,
): number {
  const legMean = (hour: number): number | null => {
    const ahead = air.hourly.slice(air.nowIndex, air.nowIndex + PLAN_HORIZON_HOURS);
    const offset = ahead.findIndex((reading) => reading.hour === hour);
    return offset < 0 ? null : activityMeanPm25(air.hourly, air.nowIndex + offset, trip.tripMin);
  };
  const there = legMean(trip.departHour);
  const back = legMean(trip.returnHour);
  return there === null || back === null ? fallback : (there + back) / 2;
}

/** Every complete window starting in the next 24 hours, with its mean PM2.5. */
function candidates(hourly: readonly HourlyReading[], from: number, span: number): Candidate[] {
  return hourly.slice(from, from + PLAN_HORIZON_HOURS).flatMap((reading, offset) => {
    const windowPm25 = spanMean(hourly, from + offset, span);
    return windowPm25 === null
      ? []
      : [{ time: reading.time, hour: reading.hour, mean: windowPm25 }];
  });
}

/**
 * Lower mean wins; on a tie, the start closer to the usual hour wins (else the earlier one stays).
 */
function isBetter(candidate: Candidate, best: Candidate, usualHour: number | null): boolean {
  if (candidate.mean !== best.mean) {
    return candidate.mean < best.mean;
  }
  return (
    usualHour !== null &&
    hourDistance(candidate.hour, usualHour) < hourDistance(best.hour, usualHour)
  );
}

function reductionPct(usual: Candidate | null, best: Candidate): number | null {
  return usual === null || usual.mean === 0 ? null : reduction(usual.mean, best.mean).percent;
}

/**
 * The cleanest daylight window for an outdoor activity in the next 24 hours, judged by hourly
 * PM2.5 concentration (the headline index is a 24-hour mean and barely moves within a day).
 */
export function bestActivityWindow(
  hourly: readonly HourlyReading[],
  search: WindowSearch,
): ActivityWindow | null {
  const span = spanHours(search.durationMin);
  const all = candidates(hourly, search.fromIndex, span);
  const best = all
    .filter((c) => isDaylight(c.time, search.daylight))
    .reduce<Candidate | null>(
      (acc, c) => (acc === null || isBetter(c, acc, search.usualHour) ? c : acc),
      null,
    );
  if (best === null) {
    return null;
  }
  const usual = all.find((c) => c.hour === search.usualHour) ?? null;
  return {
    startHour: best.hour,
    meanPm25: roundTo(best.mean, DECIMALS.windowMean),
    usualMeanPm25: usual === null ? null : roundTo(usual.mean, DECIMALS.windowMean),
    reductionPct: reductionPct(usual, best),
  };
}

/**
 * The daylight hour in the next 24 hours with the lowest PM2.5: the time to air the home briefly.
 */
export function cleanestDaylightHour(
  hourly: readonly HourlyReading[],
  fromIndex: number,
  daylight: readonly Daylight[],
): CleanestHour | null {
  const best = bestActivityWindow(hourly, {
    fromIndex,
    daylight,
    durationMin: MINUTES_PER_HOUR,
    usualHour: null,
  });
  return best === null ? null : { hour: best.startHour, pm25: best.meanPm25 };
}
