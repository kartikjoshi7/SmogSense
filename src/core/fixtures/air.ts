import type { AirData, HourlyReading } from '../../shared/air.js';

/**
 * Hourly PM2.5 for one winter day in Delhi (µg/m³), shaped on Open-Meteo's forecast for
 * 20 Nov 2026: trapped overnight, cleanest mid-afternoon (58 at 14:00), worst late evening.
 * Its 24-hour mean is 125.6 (NAQI "Very Poor").
 */
const DELHI_PM25_DAY: readonly number[] = [
  134, 132, 131, 131, 130, 131, 132, 138, 145, 125, 106, 90, 74, 66, 58, 63, 69, 100, 136, 160, 184,
  197, 210, 172,
];

/** Boundary-layer height for the same day (m): an inversion until late morning. */
const DELHI_BLH_DAY: readonly number[] = [
  15, 18, 20, 22, 25, 25, 25, 30, 40, 120, 220, 400, 560, 600, 640, 300, 15, 10, 10, 15, 25, 30, 35,
  20,
];

const CALM_WIND_KMH = 2;
const DAYS = 3;
const FIRST_DAY = '2026-11-19';

export interface AirFixtureOptions {
  /** PM2.5 for one day; repeated for every day. */
  readonly pm25Day?: readonly (number | null)[];
  /** Multiplies every PM2.5 value (e.g. 2.4 turns Very Poor into Severe). */
  readonly scale?: number;
  readonly pm10Day?: readonly (number | null)[] | null;
  readonly blhDay?: readonly (number | null)[] | null;
  /** Hour of the second day that counts as "now". */
  readonly nowHour?: number;
  readonly lat?: number;
  readonly lon?: number;
  readonly timezone?: string;
}

function dateOf(dayOffset: number): string {
  const day = Number(FIRST_DAY.slice(8)) + dayOffset;
  return `${FIRST_DAY.slice(0, 8)}${String(day).padStart(2, '0')}`;
}

function pick<T>(day: readonly T[] | null | undefined, hour: number): T | null {
  return day?.[hour] ?? null;
}

function reading(options: AirFixtureOptions, dayOffset: number, hour: number): HourlyReading {
  const base = pick(options.pm25Day ?? DELHI_PM25_DAY, hour);
  return {
    time: `${dateOf(dayOffset)}T${String(hour).padStart(2, '0')}:00`,
    hour,
    pm25: base === null ? null : Math.round(base * (options.scale ?? 1) * 10) / 10,
    pm10: pick(options.pm10Day, hour),
    no2: null,
    o3: null,
    co: null,
    so2: null,
    blhM: options.blhDay === null ? null : pick(options.blhDay ?? DELHI_BLH_DAY, hour),
    windKmh: CALM_WIND_KMH,
  };
}

/** Three days of hourly data (yesterday, today, tomorrow) shaped like Open-Meteo's output. */
export function makeAir(options: AirFixtureOptions = {}): AirData {
  const hourly = Array.from({ length: DAYS * 24 }, (_, i) =>
    reading(options, Math.floor(i / 24), i % 24),
  );
  const daylight = Array.from({ length: DAYS }, (_, d) => ({
    sunrise: `${dateOf(d)}T06:52`,
    sunset: `${dateOf(d)}T17:28`,
  }));
  return {
    lat: options.lat ?? 28.61,
    lon: options.lon ?? 77.21,
    timezone: options.timezone ?? 'Asia/Kolkata',
    hourly,
    daylight,
    nowIndex: 24 + (options.nowHour ?? 6),
  };
}

/** Multipliers on the Delhi day for a severe, a poor and a moderate day. */
export const SEVERE = 2.4;
export const POOR = 0.8;
export const MODERATE = 0.55;
