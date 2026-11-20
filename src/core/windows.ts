import type { Daylight, HourlyReading } from '../shared/schemas.js';

export interface ActivityWindowResult {
  readonly startHour: number;
  readonly meanPm25: number;
  readonly usualMeanPm25: number | null;
  readonly reductionPct: number | null;
}

/**
 * Check whether a timestamp string falls within any active daylight interval.
 */
export function isDaylight(time: string, daylight: readonly Daylight[]): boolean {
  const t = new Date(time).getTime();
  for (const d of daylight) {
    const rise = new Date(d.sunrise).getTime();
    const set = new Date(d.sunset).getTime();
    if (!Number.isNaN(t) && !Number.isNaN(rise) && !Number.isNaN(set)) {
      if (t >= rise && t <= set) {
        return true;
      }
    } else if (time >= d.sunrise && time <= d.sunset) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate circular clock distance between two hours (0–23).
 */
export function hourDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 24 - diff);
}

function evaluateWindowMean(
  hourly: readonly HourlyReading[],
  start: number,
  span: number,
): number | null {
  let sum = 0;
  for (let k = start; k < start + span; k++) {
    const reading = hourly[k];
    if (reading?.pm25 === null || reading?.pm25 === undefined) {
      return null;
    }
    sum += reading.pm25;
  }
  return sum / span;
}

function findUsualHourMean(
  hourly: readonly HourlyReading[],
  span: number,
  usualHour: number,
  range: { from: number; to: number },
): number | null {
  for (let i = range.from; i < range.to; i++) {
    if (i + span > hourly.length) {
      break;
    }
    if (hourly[i]?.hour === usualHour) {
      return evaluateWindowMean(hourly, i, span);
    }
  }
  return null;
}

function isBetterCandidate(
  cand: { mean: number; hour: number },
  best: { mean: number; hour: number } | null,
  usualHour: number,
): boolean {
  if (best === null) {
    return true;
  }
  if (cand.mean < best.mean) {
    return true;
  }
  if (cand.mean === best.mean) {
    const distCand = hourDistance(cand.hour, usualHour);
    const distBest = hourDistance(best.hour, usualHour);
    return distCand < distBest;
  }
  return false;
}

function findBestCandidate(
  hourly: readonly HourlyReading[],
  daylight: readonly Daylight[],
  span: number,
  search: { from: number; to: number; usualHour: number },
): { mean: number; hour: number } | null {
  let best: { mean: number; hour: number } | null = null;
  for (let i = search.from; i < search.to; i++) {
    if (i + span > hourly.length) {
      break;
    }
    const reading = hourly[i];
    if (!reading || !isDaylight(reading.time, daylight)) {
      continue;
    }
    const candMean = evaluateWindowMean(hourly, i, span);
    if (candMean === null) {
      continue;
    }
    const cand = { mean: candMean, hour: reading.hour };
    if (isBetterCandidate(cand, best, search.usualHour)) {
      best = cand;
    }
  }
  return best;
}

function computeReductionPct(usualMean: number | null, bestMean: number): number | null {
  if (usualMean === null) {
    return null;
  }
  if (usualMean === 0) {
    return 0;
  }
  return Math.round(((usualMean - bestMean) / usualMean) * 100);
}

/**
 * Find the optimal outdoor activity window from hourly PM2.5 concentrations within daylight.
 * Evaluates candidate windows within the next 24 hours.
 * Ties are broken by circular closeness to usualHour.
 */
export function bestActivityWindow(
  hourly: readonly HourlyReading[],
  fromIndex: number,
  daylight: readonly Daylight[],
  ...opts: [durationMin: number, usualHour: number]
): ActivityWindowResult | null {
  const [durationMin, usualHour] = opts;
  const span = Math.max(1, Math.ceil(durationMin / 60));
  const maxLookahead = Math.min(hourly.length, fromIndex + 24);

  const best = findBestCandidate(hourly, daylight, span, {
    from: fromIndex,
    to: maxLookahead,
    usualHour,
  });
  if (!best) {
    return null;
  }

  const usualMean = findUsualHourMean(hourly, span, usualHour, {
    from: fromIndex,
    to: maxLookahead,
  });

  const reductionPct = computeReductionPct(usualMean, best.mean);

  return {
    startHour: best.hour,
    meanPm25: Math.round(best.mean * 100) / 100,
    usualMeanPm25: usualMean !== null ? Math.round(usualMean * 100) / 100 : null,
    reductionPct,
  };
}

/**
 * Identify the daylight hour within the next 24 hours with the lowest PM2.5 concentration for home ventilation.
 */
export function ventilationHour(
  hourly: readonly HourlyReading[],
  fromIndex: number,
  daylight: readonly Daylight[],
): number | null {
  const maxLookahead = Math.min(hourly.length, fromIndex + 24);
  let minPm25: number | null = null;
  let bestHour: number | null = null;

  for (let i = fromIndex; i < maxLookahead; i++) {
    const reading = hourly[i];
    if (
      reading?.pm25 !== null &&
      reading?.pm25 !== undefined &&
      isDaylight(reading.time, daylight)
    ) {
      if (minPm25 === null || reading.pm25 < minPm25) {
        minPm25 = reading.pm25;
        bestHour = reading.hour;
      }
    }
  }

  return bestHour;
}
