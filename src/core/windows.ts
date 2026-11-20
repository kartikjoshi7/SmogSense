import type { Daylight, HourlyReading } from '../shared/air.js';
import { PLAN_HORIZON_HOURS } from './constants.js';

export interface WindowSearch {
  /** Index of the current hour; the search covers the next 24 hours from here. */
  readonly fromIndex: number;
  readonly daylight: readonly Daylight[];
  readonly durationMin: number;
  /** The household's usual start hour, used for comparison and tie-breaks; null if none. */
  readonly usualHour: number | null;
}

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
export function isDaylight(time: string, daylight: readonly Daylight[]): boolean {
  return daylight.some((d) => time >= d.sunrise && time <= d.sunset);
}

/** Distance between two clock hours, going the short way round (0–12). */
export function hourDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 - diff);
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Mean PM2.5 over `span` hours from `start`, or null if any of those hours is missing. */
function spanMean(hourly: readonly HourlyReading[], start: number, span: number): number | null {
  const values = hourly
    .slice(start, start + span)
    .map((h) => h.pm25)
    .filter((v): v is number => v !== null);
  return values.length < span ? null : values.reduce((sum, v) => sum + v, 0) / span;
}

/** Every complete window starting in the next 24 hours, with its mean PM2.5. */
function candidates(hourly: readonly HourlyReading[], from: number, span: number): Candidate[] {
  return hourly.slice(from, from + PLAN_HORIZON_HOURS).flatMap((reading, offset) => {
    const mean = spanMean(hourly, from + offset, span);
    return mean === null ? [] : [{ time: reading.time, hour: reading.hour, mean }];
  });
}

/** Lower mean wins; on a tie, the start closer to the usual hour wins (else the earlier one stays). */
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
  if (usual === null || usual.mean === 0) {
    return null;
  }
  return Math.round(((usual.mean - best.mean) / usual.mean) * 100);
}

/**
 * The cleanest daylight window for an outdoor activity in the next 24 hours, judged by hourly
 * PM2.5 concentration (the headline index is a 24-hour mean and barely moves within a day).
 */
export function bestActivityWindow(
  hourly: readonly HourlyReading[],
  search: WindowSearch,
): ActivityWindow | null {
  const span = Math.max(1, Math.ceil(search.durationMin / 60));
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
    meanPm25: roundTo2(best.mean),
    usualMeanPm25: usual === null ? null : roundTo2(usual.mean),
    reductionPct: reductionPct(usual, best),
  };
}

/** The daylight hour in the next 24 hours with the lowest PM2.5: the time to air the home briefly. */
export function ventilationHour(
  hourly: readonly HourlyReading[],
  fromIndex: number,
  daylight: readonly Daylight[],
): { hour: number; pm25: number } | null {
  const best = bestActivityWindow(hourly, {
    fromIndex,
    daylight,
    durationMin: 60,
    usualHour: null,
  });
  return best === null ? null : { hour: best.startHour, pm25: best.meanPm25 };
}
