import { z } from 'zod';

/** An inclusive numeric range, used to build a schema and the form control for the same value. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/** Clock hours, 00:00 to 23:00. */
export const CLOCK_HOURS = { min: 0, max: 23 } as const satisfies Range;

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
  lat: rangeSchema({ min: -90, max: 90 }),
  lon: rangeSchema({ min: -180, max: 180 }),
});
