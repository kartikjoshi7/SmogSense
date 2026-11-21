import { z } from 'zod';
import { pollutantsSchema } from './air.js';
import { concentrationSchema, hourSchema } from './primitives.js';

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
  value: z.number().int().min(0).max(500),
  category: aqiCategorySchema,
  /** Position of the category on its scale, 0 (best) to 5 (worst). */
  band: z.number().int().min(0).max(5),
  pm25Mean24h: z.number().min(0),
});
export type IndexReading = z.infer<typeof indexReadingSchema>;

const sensitivitySchema = z.enum(['normal', 'elevated', 'high']);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

const outdoorAdviceSchema = z.enum(['ok', 'reduce', 'avoid', 'stay_indoors']);
export type OutdoorAdvice = z.infer<typeof outdoorAdviceSchema>;

const severitySchema = z.enum(['normal', 'caution', 'restrict', 'emergency']);
export type Severity = z.infer<typeof severitySchema>;

const inversionSchema = z.object({
  trappedNow: z.boolean(),
  clearsAtHour: hourSchema.nullable(),
  minBlhM: z.number().min(0).nullable(),
  maxBlhM: z.number().min(0).nullable(),
  basis: z.enum(['boundary_layer', 'wind_only']),
});
export type Inversion = z.infer<typeof inversionSchema>;

const recommendationCategorySchema = z.enum([
  'routine',
  'indoor',
  'alternative',
  'protection',
  'community',
]);

export type RecommendationCategory = z.infer<typeof recommendationCategorySchema>;

/** Every recommendation the engine can produce. Each id has fixed fallback text on the server. */
const recommendationIdSchema = z.enum([
  'exercise_window',
  'exercise_indoors',
  'commute_protection',
  'ventilate_briefly',
  'run_purifier',
  'seal_gaps',
  'keep_windows_shut',
  'stop_incense',
  'no_indoor_smoking',
  'cooking_ventilation',
  'wet_mopping',
  'switch_to_metro',
  'switch_to_bus',
  'carpool',
  'switch_to_cycle',
  'switch_to_walk',
  'work_from_home',
  'engine_off_at_signals',
  'clean_cooking_fuel',
  'combine_errands',
  'n95_outdoors',
  'sensitive_members',
  'ncr_grap_check',
  'check_on_neighbours',
  'report_open_burning',
  'share_notice',
]);
export type RecommendationId = z.infer<typeof recommendationIdSchema>;

const levelSchema = z.enum(['low', 'medium', 'high']);
export type Level = z.infer<typeof levelSchema>;

/** The measurable effect of following a recommendation. Absent fields do not apply. */
const impactSchema = z.object({
  exposureReductionPct: z.number().optional(),
  doseBeforeUg: z.number().min(0).optional(),
  doseAfterUg: z.number().min(0).optional(),
  indoorBeforeUgM3: z.number().min(0).optional(),
  indoorAfterUgM3: z.number().min(0).optional(),
  co2SavedKgPerWeek: z.number().optional(),
  /** Qualitative size of the benefit when it cannot be quantified. */
  level: levelSchema.optional(),
});

export type Impact = z.infer<typeof impactSchema>;

/** Named values behind a recommendation; the only numbers any explanation may use. */
const factsSchema = z.record(z.string(), z.union([z.number(), z.string()]));

const recommendationSchema = z.object({
  id: recommendationIdSchema,
  category: recommendationCategorySchema,
  priority: z.number().int().min(1),
  effort: levelSchema,
  memberIds: z.array(z.string()),
  impact: impactSchema,
  facts: factsSchema,
});
export type Recommendation = z.infer<typeof recommendationSchema>;

const timelineEntrySchema = z.object({
  hour: hourSchema,
  recommendationId: recommendationIdSchema,
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

const forecastPointSchema = z.object({
  time: z.string(),
  hour: hourSchema,
  pm25: concentrationSchema,
});

/** The daylight hour with the lowest PM2.5 in the next 24 hours. */
const cleanestHourSchema = z.object({
  hour: hourSchema,
  pm25: z.number().min(0),
});

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
