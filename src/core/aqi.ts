import type { AirData, HourlyReading } from '../shared/air.js';
import type { AqiCategory, AqiScale, IndexReading } from '../shared/plan.js';
import {
  AQI_MAX,
  AQI_SCALES,
  INDEX_MIN_VALID_HOURS,
  INDEX_WINDOW_HOURS,
  INDIA_TIMEZONES,
  type AqiBand,
  type AqiScaleDefinition,
} from './constants.js';

export type IndexResult =
  { ok: true; value: IndexReading } | { ok: false; error: 'insufficient_data' };

type Pollutant = 'pm25' | 'pm10';

/** Truncate (not round) to the given number of decimals, as EPA requires; null leaves it as is. */
function truncate(value: number, decimals: number | null): number {
  if (decimals === null) {
    return value;
  }
  const factor = 10 ** decimals;
  return Math.floor(value * factor + Number.EPSILON) / factor;
}

/**
 * Sub-index for one pollutant: find the band whose range contains the concentration and
 * interpolate, I = (iHi − iLo) / (cHi − cLo) × (C − cLo) + iLo. Beyond the table it is 500.
 */
export function subIndex(
  concentration: number,
  pollutant: Pollutant,
  bands: readonly AqiBand[],
): number {
  if (concentration <= 0) {
    return 0;
  }
  const row = bands.find((b) => concentration <= b[pollutant].cHi);
  if (row === undefined) {
    return AQI_MAX;
  }
  const { cLo, cHi } = row[pollutant];
  return Math.round(((row.iHi - row.iLo) * (concentration - cLo)) / (cHi - cLo) + row.iLo);
}

/** Band number (0 = best) and category of an index value; values past the table stay in the worst band. */
export function classify(
  value: number,
  bands: AqiScaleDefinition['bands'],
): { band: number; category: AqiCategory } {
  let result = { band: 0, category: bands[0].category };
  for (const [position, row] of bands.entries()) {
    result = { band: position, category: row.category };
    if (value <= row.iHi) {
      break;
    }
  }
  return result;
}

/** India's NAQI for Indian locations (by country code, or by time zone when unknown); US AQI elsewhere. */
export function selectScale(countryCode: string | null, timezone: string): AqiScale {
  if (countryCode === 'IN') {
    return 'naqi';
  }
  return countryCode === null && INDIA_TIMEZONES.includes(timezone) ? 'naqi' : 'us_aqi';
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Valid values of one pollutant over the trailing 24 hours ending at `nowIndex`. */
function trailingValues(air: AirData, pollutant: Pollutant): number[] {
  const start = Math.max(0, air.nowIndex - INDEX_WINDOW_HOURS + 1);
  return air.hourly
    .slice(start, air.nowIndex + 1)
    .map((h: HourlyReading) => h[pollutant])
    .filter((v): v is number => v !== null);
}

function pollutantIndex(
  values: readonly number[],
  pollutant: Pollutant,
  def: AqiScaleDefinition,
): number {
  if (values.length < INDEX_MIN_VALID_HOURS) {
    return 0;
  }
  const decimals = pollutant === 'pm25' ? def.pm25Decimals : def.pm10Decimals;
  return subIndex(truncate(mean(values), decimals), pollutant, def.bands);
}

/**
 * Headline index from the trailing 24-hour PM2.5 and PM10 means (PM10 only when complete),
 * on the scale that fits the location. Needs at least 16 valid PM2.5 hours.
 */
export function computeIndex(air: AirData): IndexResult {
  const pm25 = trailingValues(air, 'pm25');
  if (pm25.length < INDEX_MIN_VALID_HOURS) {
    return { ok: false, error: 'insufficient_data' };
  }
  const scale = selectScale(air.countryCode, air.timezone);
  const def = AQI_SCALES[scale];
  const value = Math.max(
    pollutantIndex(pm25, 'pm25', def),
    pollutantIndex(trailingValues(air, 'pm10'), 'pm10', def),
  );
  return {
    ok: true,
    value: {
      scale,
      value,
      ...classify(value, def.bands),
      pm25Mean24h: Math.round(mean(pm25) * 10) / 10,
    },
  };
}
