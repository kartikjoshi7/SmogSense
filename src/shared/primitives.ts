import { z } from 'zod';
import { CLOCK_HOURS, LATITUDE, LONGITUDE, type Range } from './limits.js';

/** A number within a range. */
export function rangeSchema({ min, max }: Range) {
  return z.number().min(min).max(max);
}

/** A whole clock hour. */
export const hourSchema = rangeSchema(CLOCK_HOURS).int();

/** A pollutant concentration in µg/m³ (CO included); null where the data has no value. */
export const concentrationSchema = z.number().min(0).nullable();

/** A point on the map in decimal degrees. */
export const coordinatesSchema = z.object({
  lat: rangeSchema(LATITUDE),
  lon: rangeSchema(LONGITUDE),
});
