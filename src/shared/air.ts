import { z } from 'zod';
import { AIR_DATA_MAX_DAYS, HOURS_PER_DAY, TIME_ZONE_CHARS } from './limits.js';
import { concentrationSchema, coordinatesSchema, hourSchema } from './primitives.js';

/** Local time as Open-Meteo returns it with `timezone=auto`: `YYYY-MM-DDTHH:MM`. */
export const localTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

/** Pollutant concentrations in µg/m³ at one hour; null where the data has none. */
export const pollutantsSchema = z.object({
  pm25: concentrationSchema,
  pm10: concentrationSchema,
  no2: concentrationSchema,
  o3: concentrationSchema,
  co: concentrationSchema,
  so2: concentrationSchema,
});
export type Pollutants = z.infer<typeof pollutantsSchema>;

/** One hour of air-quality and weather data. Missing values are null. */
const hourlyReadingSchema = z.object({
  time: localTimeSchema,
  hour: hourSchema,
  ...pollutantsSchema.shape,
  /** Atmospheric boundary-layer height in metres. */
  blhM: z.number().min(0).nullable(),
  windKmh: z.number().min(0).nullable(),
});
export type HourlyReading = z.infer<typeof hourlyReadingSchema>;

const daylightSchema = z.object({
  sunrise: localTimeSchema,
  sunset: localTimeSchema,
});
export type Daylight = z.infer<typeof daylightSchema>;

/** Normalised air data for one location: the past day plus a two-day forecast. */
export const airDataSchema = z
  .object({
    ...coordinatesSchema.shape,
    /** IANA time zone; it also decides which AQI scale applies. */
    timezone: z.string().min(1).max(TIME_ZONE_CHARS),
    hourly: z
      .array(hourlyReadingSchema)
      .min(1)
      .max(AIR_DATA_MAX_DAYS * HOURS_PER_DAY),
    daylight: z.array(daylightSchema).max(AIR_DATA_MAX_DAYS),
    /** Index of the current hour within `hourly`. */
    nowIndex: z.number().int().min(0),
  })
  .refine((a) => a.nowIndex < a.hourly.length, {
    message: 'nowIndex must point inside hourly',
    path: ['nowIndex'],
  });
export type AirData = z.infer<typeof airDataSchema>;
