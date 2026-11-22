/** The engine's output: the index reading, severity, inversion, forecast and timeline. */
import { z } from 'zod';
import { localTimeSchema, pollutantsSchema } from './air.js';
import { INDEX_BANDS } from './limits.js';
import {
  concentrationSchema,
  hourSchema,
  indexValueSchema,
  pm25Schema,
  rangeSchema,
} from './primitives.js';
import {
  outdoorAdviceSchema,
  recommendationIdSchema,
  recommendationSchema,
} from './recommendation.js';

const aqiScaleSchema = z.enum(['naqi', 'us_aqi']);
export type AqiScale = z.infer<typeof aqiScaleSchema>;

/** Category keys for both scales; the UI translates them. */
const aqiCategorySchema = z.enum([
  'good',
  'satisfactory',
  'moderate',
  'poor',
  'very_poor',
  'severe',
  'unhealthy_sensitive',
  'unhealthy',
  'very_unhealthy',
  'hazardous',
]);
export type AqiCategory = z.infer<typeof aqiCategorySchema>;

const indexReadingSchema = z.object({
  scale: aqiScaleSchema,
  value: indexValueSchema,
  category: aqiCategorySchema,
  /** Position of the category on its scale, 0 (best) to 5 (worst). */
  band: rangeSchema(INDEX_BANDS),
  pm25Mean24h: z.number().min(0),
});
export type IndexReading = z.infer<typeof indexReadingSchema>;

const sensitivitySchema = z.enum(['normal', 'elevated', 'high']);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

const severitySchema = z.enum(['normal', 'caution', 'restrict', 'emergency']);
export type Severity = z.infer<typeof severitySchema>;

const inversionSchema = z.object({
  trappedNow: z.boolean(),
  clearsAtHour: hourSchema.nullable(),
  minBlhM: z.number().min(0).nullable(),
  maxBlhM: z.number().min(0).nullable(),
  /** What the judgement rests on; "none" when neither boundary-layer nor wind data exists. */
  basis: z.enum(['boundary_layer', 'wind_only', 'none']),
});
export type Inversion = z.infer<typeof inversionSchema>;

const timelineEntrySchema = z.object({
  hour: hourSchema,
  recommendationId: recommendationIdSchema,
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

const forecastPointSchema = z.object({
  time: localTimeSchema,
  hour: hourSchema,
  pm25: concentrationSchema,
});

/** The daylight hour with the lowest PM2.5 in the next 24 hours. */
const cleanestHourSchema = z.object({
  hour: hourSchema,
  pm25: pm25Schema,
});
export type CleanestHour = z.infer<typeof cleanestHourSchema>;

/** The engine's complete output for one household, location and hour. */
export const planSchema = z.object({
  index: indexReadingSchema,
  /** Concentrations at the current hour. */
  current: pollutantsSchema,
  severity: severitySchema,
  householdSensitivity: sensitivitySchema,
  outdoorAdvice: outdoorAdviceSchema,
  inversion: inversionSchema,
  cleanestHour: cleanestHourSchema.nullable(),
  forecast: z.array(forecastPointSchema),
  recommendations: z.array(recommendationSchema),
  timeline: z.array(timelineEntrySchema),
});
export type Plan = z.infer<typeof planSchema>;
