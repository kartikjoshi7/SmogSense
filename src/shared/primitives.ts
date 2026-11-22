/** Small schemas every other schema builds on: bounded numbers, hours and coordinates. */
import { z } from 'zod';
import { CLOCK_HOURS, INDEX_VALUES, LATITUDE, LONGITUDE, type Range } from './limits.js';

/** A number within a range, and a whole number when the range says so. */
export function rangeSchema({ min, max, whole = false }: Range) {
  const value = z.number().min(min).max(max);
  return whole ? value.int() : value;
}

/** A whole clock hour. */
export const hourSchema = rangeSchema(CLOCK_HOURS);

/** A pollutant concentration in µg/m³ (CO included); null where the data has no value. */
export const concentrationSchema = z.number().min(0).nullable();

/** A point on the map in decimal degrees. */
export const coordinatesSchema = z.object({
  lat: rangeSchema(LATITUDE),
  lon: rangeSchema(LONGITUDE),
});

/** An index value on either scale. */
export const indexValueSchema = rangeSchema(INDEX_VALUES);

/** A PM2.5 concentration in µg/m³, rounded for display. */
export const pm25Schema = z.number().min(0);
