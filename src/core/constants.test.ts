import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INDEX_BANDS, INDEX_VALUES } from '../shared/limits.js';
import * as C from './constants.js';

/** The architecture doc with runs of spaces collapsed, since Prettier pads table columns. */
const DOC = readFileSync(new URL('../../docs/ARCHITECTURE.md', import.meta.url), 'utf8').replace(
  / +/g,
  ' ',
);

/** "key value, key value" in the record's own order. */
function pairs(record: Readonly<Record<string, number | string>>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(', ');
}

/** The upper concentration of each band, best to worst. */
function tops(scale: C.AqiScaleDefinition, pollutant: 'pm25' | 'pm10'): string {
  return scale.bands.map((band) => band[pollutant].cHi).join(' / ');
}

function breakpoints(scale: C.AqiScaleDefinition): string {
  return `PM2.5 band tops ${tops(scale, 'pm25')} µg/m³; PM10 ${tops(scale, 'pm10')} µg/m³`;
}

/** One commute factor for every mode except "doesn't commute". */
function byMode(factor: (mode: C.CommuteModeFactors) => number): string {
  const modes = Object.entries(C.COMMUTE_MODES).filter(([mode]) => mode !== 'none');
  return pairs(Object.fromEntries(modes.map(([mode, factors]) => [mode, factor(factors)])));
}

/** The constant names and values the assumptions table must show, in its order. */
const ASSUMPTIONS: readonly (readonly [string, string])[] = [
  ['AQI_SCALES.naqi', breakpoints(C.AQI_SCALES.naqi)],
  ['AQI_SCALES.us_aqi', breakpoints(C.AQI_SCALES.us_aqi)],
  ['INDIA_TIMEZONES', C.INDIA_TIMEZONES.join(', ')],
  ['INDEX_WINDOW_HOURS', `${C.INDEX_WINDOW_HOURS} h`],
  ['INDEX_MIN_VALID_HOURS', `${C.INDEX_MIN_VALID_HOURS} h`],
  ['PLAN_HORIZON_HOURS', `${C.PLAN_HORIZON_HOURS} h`],
  ['DECIMALS', `${pairs(C.DECIMALS)} (decimal places)`],
  ['FLOAT_ERROR_DECIMALS', `${C.FLOAT_ERROR_DECIMALS} decimal places`],
  ['INVERSION_TRAPPED_BLH_M', `${C.INVERSION_TRAPPED_BLH_M} m`],
  ['INVERSION_CLEARED_BLH_M', `${C.INVERSION_CLEARED_BLH_M} m`],
  ['INVERSION_STAGNANT_WIND_KMH', `${C.INVERSION_STAGNANT_WIND_KMH} km/h`],
  ['EXERCISE_BREATHING_M3H', `${pairs(C.EXERCISE_BREATHING_M3H)} (m³/h)`],
  ['AGE_FACTOR', pairs(C.AGE_FACTOR)],
  ['MASK_REDUCTION', pairs(C.MASK_REDUCTION)],
  ['COMMUTE_MODES › exposureMultiplier', byMode((mode) => mode.exposureMultiplier)],
  ['COMMUTE_MODES › co2KgPerKm', `${byMode((mode) => mode.co2KgPerKm)} (kg/km)`],
  ['COMMUTE_MODES › speedKmh', `${byMode((mode) => mode.speedKmh)} (km/h)`],
  ['COMMUTE_MODES › breathingM3h', `${byMode((mode) => mode.breathingM3h)} (m³/h)`],
  ['CAR_MODES', C.CAR_MODES.join(', ')],
  ['CARPOOL_OCCUPANTS', `${C.CARPOOL_OCCUPANTS} people`],
  ['MAX_CYCLE_KM, MAX_WALK_KM', `${C.MAX_CYCLE_KM} km, ${C.MAX_WALK_KM} km`],
  ['INDOOR_PENETRATION', `${C.INDOOR_PENETRATION}`],
  ['INDOOR_DEPOSITION_PER_H', `${C.INDOOR_DEPOSITION_PER_H} per hour`],
  ['AIR_CHANGES_PER_H', `${pairs(C.AIR_CHANGES_PER_H)} (per hour)`],
  [
    'TIGHTER_ENVELOPE',
    Object.entries(C.TIGHTER_ENVELOPE)
      .map(([from, to]) => `${from} → ${to}`)
      .join(', '),
  ],
  ['CEILING_HEIGHT_M', `${C.CEILING_HEIGHT_M} m`],
  ['DEFAULT_PURIFIER_CADR_M3H', `${C.DEFAULT_PURIFIER_CADR_M3H} m³/h`],
  ['SMOKY_FUELS', C.SMOKY_FUELS.join(', ')],
  ['INDOOR_SOURCE_UG_PER_H', `${pairs(C.INDOOR_SOURCE_UG_PER_H)} (µg/h)`],
  ['SEVERITY_BAND', pairs(C.SEVERITY_BAND)],
  ['OUTDOOR_ADVICE_BAND', pairs(C.OUTDOOR_ADVICE_BAND)],
  ['SENSITIVE_ADVICE_SHIFT', `${C.SENSITIVE_ADVICE_SHIFT} band`],
  ['ACTION_BAND', pairs(C.ACTION_BAND)],
  ['SENSITIVITY_WEIGHT', pairs(C.SENSITIVITY_WEIGHT)],
  ['CO2_RANK_WEIGHT', `${C.CO2_RANK_WEIGHT} points per weekly kg`],
  ['EFFORT_PENALTY', pairs(C.EFFORT_PENALTY)],
  ['QUALITATIVE_BENEFIT_PCT', pairs(C.QUALITATIVE_BENEFIT_PCT)],
  ['EMERGENCY_BOOST', `${C.EMERGENCY_BOOST} points`],
  ['MIN_WORTHWHILE_REDUCTION_PCT', `${C.MIN_WORTHWHILE_REDUCTION_PCT}%`],
  ['PURIFIER_NIGHT_HOUR', `${C.PURIFIER_NIGHT_HOUR}:00`],
  [
    'NCR_BOUNDS',
    `lat ${C.NCR_BOUNDS.latMin}–${C.NCR_BOUNDS.latMax}, lon ${C.NCR_BOUNDS.lonMin}–${C.NCR_BOUNDS.lonMax}`,
  ],
];

/** The constant names a table row covers: "MAX_CYCLE_KM, MAX_WALK_KM" and "COMMUTE_MODES › x". */
function namesIn(row: string): string[] {
  return (
    row
      .split(' › ')[0]
      ?.split(', ')
      .map((name) => name.split('.')[0] ?? name) ?? []
  );
}

describe('ARCHITECTURE.md › Assumptions behind the numbers', () => {
  it.each(ASSUMPTIONS)('shows the current value of %s', (name, value) => {
    expect(DOC).toContain(`| \`${name}\` | ${value} |`);
  });

  it('lists the assumptions in the same order as this test', () => {
    const positions = ASSUMPTIONS.map(([name]) => DOC.indexOf(`| \`${name}\` |`));

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('has a row for every constant the engine exports', () => {
    const listed = new Set(ASSUMPTIONS.flatMap(([row]) => namesIn(row)));

    expect([...listed].sort()).toEqual(Object.keys(C).sort());
  });
});

describe('index scales', () => {
  it.each(Object.entries(C.AQI_SCALES))(
    '%s has one band per position and ends at the top',
    (_, scale) => {
      expect(scale.bands).toHaveLength(INDEX_BANDS.max - INDEX_BANDS.min + 1);
      expect(scale.bands.at(-1)?.iHi).toBe(INDEX_VALUES.max);
    },
  );
});
