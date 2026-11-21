import { z } from 'zod';
import { localTimeSchema, pollutantsSchema } from './air.js';
import { INDEX_BANDS, INDEX_VALUES } from './limits.js';
import { concentrationSchema, hourSchema, rangeSchema } from './primitives.js';
import { commuteSchema, exerciseSchema, homeSchema, maskTypeSchema } from './profile.js';

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

/** An index value on either scale. */
const indexValueSchema = rangeSchema(INDEX_VALUES).int();

const indexReadingSchema = z.object({
  scale: aqiScaleSchema,
  value: indexValueSchema,
  category: aqiCategorySchema,
  /** Position of the category on its scale, 0 (best) to 5 (worst). */
  band: rangeSchema(INDEX_BANDS).int(),
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
  /** What the judgement rests on; "none" when neither boundary-layer nor wind data exists. */
  basis: z.enum(['boundary_layer', 'wind_only', 'none']),
});
export type Inversion = z.infer<typeof inversionSchema>;

/** The five groups of the plan, in the order the brief lists them. */
export const recommendationCategorySchema = z.enum([
  'routine',
  'indoor',
  'alternative',
  'protection',
  'community',
]);

export type RecommendationCategory = z.infer<typeof recommendationCategorySchema>;

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

/** What every recommendation carries besides its id and facts. */
const recommendationBaseSchema = z.object({
  category: recommendationCategorySchema,
  priority: z.number().int().min(1),
  effort: levelSchema,
  memberIds: z.array(z.string()),
  impact: impactSchema,
});

/**
 * One kind of recommendation: its id and the facts behind it. The facts are the values its
 * explanations quote, and the only numbers (with the impact) the AI may use for it.
 */
function recommendation<const Id extends string, const Facts extends z.core.$ZodShape>(
  id: Id,
  facts: Facts,
) {
  return recommendationBaseSchema.extend({ id: z.literal(id), facts: z.object(facts) });
}

/** A PM2.5 concentration in µg/m³, rounded for display. */
const pm25Schema = z.number().min(0);

/** A share of fine particles in percent. */
const percentSchema = z.number().min(0).max(100);

const indexFacts = { indexValue: indexValueSchema };
const indoorHackFacts = { outdoorPm25: pm25Schema, roomAreaM2: homeSchema.shape.roomAreaM2 };
const commuteFacts = commuteSchema.pick({ mode: true, oneWayKm: true, daysPerWeek: true }).shape;
const drivingFacts = commuteSchema.pick({ mode: true }).shape;

/** Every recommendation the engine can make, each with its own facts. */
const recommendationSchema = z.discriminatedUnion('id', [
  recommendation('exercise_window', {
    usualHour: hourSchema,
    bestHour: hourSchema,
    durationMin: exerciseSchema.shape.durationMin,
    usualPm25: pm25Schema,
    bestPm25: pm25Schema,
  }),
  recommendation('exercise_indoors', {
    usualHour: hourSchema,
    durationMin: exerciseSchema.shape.durationMin,
    outdoorPm25: pm25Schema,
    indoorPm25: pm25Schema,
  }),
  recommendation('commute_protection', {
    ...commuteSchema.pick({ mode: true, oneWayKm: true, departHour: true, returnHour: true }).shape,
    currentMask: maskTypeSchema,
  }),
  recommendation('ventilate_briefly', { hour: hourSchema, pm25: pm25Schema }),
  recommendation('run_purifier', {
    ...indoorHackFacts,
    purifiersOwned: homeSchema.shape.purifierCount,
  }),
  recommendation('seal_gaps', indoorHackFacts),
  recommendation('keep_windows_shut', indoorHackFacts),
  recommendation('stop_incense', indoorHackFacts),
  recommendation('no_indoor_smoking', indoorHackFacts),
  recommendation('cooking_ventilation', {
    cookingFuel: homeSchema.shape.cookingFuel,
    hasExhaust: homeSchema.shape.hasExhaustOrChimney,
  }),
  recommendation('wet_mopping', {}),
  recommendation('switch_to_metro', commuteFacts),
  recommendation('switch_to_bus', commuteFacts),
  recommendation('carpool', commuteFacts),
  recommendation('switch_to_cycle', commuteFacts),
  recommendation('switch_to_walk', commuteFacts),
  recommendation('work_from_home', commuteFacts),
  recommendation('engine_off_at_signals', drivingFacts),
  recommendation('combine_errands', drivingFacts),
  recommendation('clean_cooking_fuel', { cookingFuel: homeSchema.shape.cookingFuel }),
  recommendation('n95_outdoors', {
    currentMask: maskTypeSchema,
    inhaledShareNowPct: percentSchema,
    inhaledShareN95Pct: percentSchema,
  }),
  recommendation('sensitive_members', { ...indexFacts, outdoorAdvice: outdoorAdviceSchema }),
  recommendation('ncr_grap_check', indexFacts),
  recommendation('check_on_neighbours', indexFacts),
  recommendation('report_open_burning', {}),
  recommendation('share_notice', indexFacts),
]);
export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationId = Recommendation['id'];

/** The recommendation with one id, with the facts that id carries. */
export type RecommendationOf<Id extends RecommendationId> = Extract<Recommendation, { id: Id }>;

/** Every recommendation id. Each has fixed standard guidance in `src/core/explain`. */
export const recommendationIdSchema = z.enum(
  recommendationSchema.options.map((option) => option.shape.id.value),
);

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
