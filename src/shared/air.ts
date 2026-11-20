import { z } from 'zod';

/** Local time as Open-Meteo returns it with `timezone=auto`: `YYYY-MM-DDTHH:MM`. */
const localTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

const concentrationSchema = z.number().min(0).nullable();

/** One hour of air-quality and weather data. Missing values are null. */
const hourlyReadingSchema = z.object({
  time: localTimeSchema,
  hour: z.number().int().min(0).max(23),
  pm25: concentrationSchema,
  pm10: concentrationSchema,
  no2: concentrationSchema,
  o3: concentrationSchema,
  co: concentrationSchema,
  so2: concentrationSchema,
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
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    timezone: z.string().min(1).max(64),
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    hourly: z.array(hourlyReadingSchema).min(1).max(168),
    daylight: z.array(daylightSchema).max(7),
    /** Index of the current hour within `hourly`. */
    nowIndex: z.number().int().min(0),
  })
  .refine((a) => a.nowIndex < a.hourly.length, {
    message: 'nowIndex must point inside hourly',
    path: ['nowIndex'],
  });
export type AirData = z.infer<typeof airDataSchema>;
