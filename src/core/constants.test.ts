import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACTION_BAND,
  AGE_FACTOR,
  AIR_CHANGES_PER_H,
  AQI_SCALES,
  CARPOOL_OCCUPANTS,
  CEILING_HEIGHT_M,
  CO2_RANK_WEIGHT,
  COMMUTE_MODES,
  DEFAULT_PURIFIER_CADR_M3H,
  EFFORT_PENALTY,
  EMERGENCY_BOOST,
  EXERCISE_BREATHING_M3H,
  INDEX_MIN_VALID_HOURS,
  INDEX_WINDOW_HOURS,
  INDOOR_DEPOSITION_PER_H,
  INDOOR_PENETRATION,
  INDOOR_SOURCE_UG_PER_H,
  INVERSION_CLEARED_BLH_M,
  INVERSION_STAGNANT_WIND_KMH,
  INVERSION_TRAPPED_BLH_M,
  MASK_REDUCTION,
  MAX_CYCLE_KM,
  MAX_WALK_KM,
  MIN_WORTHWHILE_REDUCTION_PCT,
  NCR_BOUNDS,
  PLAN_HORIZON_HOURS,
  PURIFIER_NIGHT_HOUR,
  QUALITATIVE_BENEFIT_PCT,
  SENSITIVITY_WEIGHT,
  type AqiScaleDefinition,
  type CommuteModeFactors,
} from './constants.js';

/** The README with runs of spaces collapsed, since Prettier pads table columns. */
const README = readFileSync(new URL('../../README.md', import.meta.url), 'utf8').replace(
  / +/g,
  ' ',
);

/** "key value, key value" in the record's own order. */
function pairs(record: Readonly<Record<string, number>>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key} ${value}`)
    .join(', ');
}

/** The upper PM2.5 concentration of each band, best to worst. */
function pm25Tops(scale: AqiScaleDefinition): string {
  return scale.bands.map((band) => band.pm25.cHi).join(' / ');
}

/** One commute factor for every mode except "doesn't commute". */
function byMode(factor: (mode: CommuteModeFactors) => number): string {
  const modes = Object.entries(COMMUTE_MODES).filter(([mode]) => mode !== 'none');
  return pairs(Object.fromEntries(modes.map(([mode, factors]) => [mode, factor(factors)])));
}

/** The constant names and values the README's Assumptions table must show, in its order. */
const ASSUMPTIONS: readonly (readonly [string, string])[] = [
  ['AQI_SCALES.naqi', `PM2.5 band tops ${pm25Tops(AQI_SCALES.naqi)} µg/m³`],
  ['AQI_SCALES.us_aqi', `PM2.5 band tops ${pm25Tops(AQI_SCALES.us_aqi)} µg/m³`],
  ['INDEX_WINDOW_HOURS', `${INDEX_WINDOW_HOURS} h`],
  ['INDEX_MIN_VALID_HOURS', `${INDEX_MIN_VALID_HOURS} h`],
  ['PLAN_HORIZON_HOURS', `${PLAN_HORIZON_HOURS} h`],
  ['INVERSION_TRAPPED_BLH_M', `${INVERSION_TRAPPED_BLH_M} m`],
  ['INVERSION_CLEARED_BLH_M', `${INVERSION_CLEARED_BLH_M} m`],
  ['INVERSION_STAGNANT_WIND_KMH', `${INVERSION_STAGNANT_WIND_KMH} km/h`],
  ['EXERCISE_BREATHING_M3H', `${pairs(EXERCISE_BREATHING_M3H)} (m³/h)`],
  ['AGE_FACTOR', pairs(AGE_FACTOR)],
  ['MASK_REDUCTION', pairs(MASK_REDUCTION)],
  ['COMMUTE_MODES › exposureMultiplier', byMode((mode) => mode.exposureMultiplier)],
  ['COMMUTE_MODES › co2KgPerKm', `${byMode((mode) => mode.co2KgPerKm)} (kg/km)`],
  ['COMMUTE_MODES › speedKmh', `${byMode((mode) => mode.speedKmh)} (km/h)`],
  ['CARPOOL_OCCUPANTS', `${CARPOOL_OCCUPANTS} people`],
  ['MAX_CYCLE_KM, MAX_WALK_KM', `${MAX_CYCLE_KM} km, ${MAX_WALK_KM} km`],
  ['INDOOR_PENETRATION', `${INDOOR_PENETRATION}`],
  ['INDOOR_DEPOSITION_PER_H', `${INDOOR_DEPOSITION_PER_H} per hour`],
  ['AIR_CHANGES_PER_H', `${pairs(AIR_CHANGES_PER_H)} (per hour)`],
  ['CEILING_HEIGHT_M', `${CEILING_HEIGHT_M} m`],
  ['DEFAULT_PURIFIER_CADR_M3H', `${DEFAULT_PURIFIER_CADR_M3H} m³/h`],
  ['INDOOR_SOURCE_UG_PER_H', `${pairs(INDOOR_SOURCE_UG_PER_H)} (µg/h)`],
  ['ACTION_BAND', pairs(ACTION_BAND)],
  ['SENSITIVITY_WEIGHT', pairs(SENSITIVITY_WEIGHT)],
  ['CO2_RANK_WEIGHT', `${CO2_RANK_WEIGHT} points per weekly kg`],
  ['EFFORT_PENALTY', pairs(EFFORT_PENALTY)],
  ['QUALITATIVE_BENEFIT_PCT', pairs(QUALITATIVE_BENEFIT_PCT)],
  ['EMERGENCY_BOOST', `${EMERGENCY_BOOST} points`],
  ['MIN_WORTHWHILE_REDUCTION_PCT', `${MIN_WORTHWHILE_REDUCTION_PCT}%`],
  ['PURIFIER_NIGHT_HOUR', `${PURIFIER_NIGHT_HOUR}:00`],
  [
    'NCR_BOUNDS',
    `lat ${NCR_BOUNDS.latMin}–${NCR_BOUNDS.latMax}, lon ${NCR_BOUNDS.lonMin}–${NCR_BOUNDS.lonMax}`,
  ],
];

describe('README › Assumptions', () => {
  it.each(ASSUMPTIONS)('shows the current value of %s', (name, value) => {
    expect(README).toContain(`| \`${name}\` | ${value} |`);
  });

  it('lists the assumptions in the same order as this test', () => {
    const positions = ASSUMPTIONS.map(([name]) => README.indexOf(`| \`${name}\` |`));

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
