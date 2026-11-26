/** The recommendations a plan can hold: each id with its own facts and the shape of its impact. */
import { z } from 'zod';
import { hourSchema, indexValueSchema, pm25Schema } from './primitives.js';
import {
  commuteSchema,
  exerciseSchema,
  homeSchema,
  maskTypeSchema,
  smokyHeatingSchema,
} from './profile.js';

/** How much time outdoors is safe for most of the household. */
export const outdoorAdviceSchema = z.enum(['ok', 'reduce', 'avoid', 'stay_indoors']);
export type OutdoorAdvice = z.infer<typeof outdoorAdviceSchema>;

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

// What following a recommendation changes. Each id has exactly one of these shapes, so every
// figure its explanation quotes is required and none can silently default to zero.

/** A benefit that is described, not measured: its rough size. */
const levelImpactSchema = z.object({ level: levelSchema });

/** Less PM2.5 breathed in during an activity: the dose before and after, in µg. */
const doseImpactSchema = z.object({
  exposureReductionPct: z.number(),
  doseBeforeUg: z.number().min(0),
  doseAfterUg: z.number().min(0),
});

/** Lower PM2.5 in the room, from the indoor model: before and after, in µg/m³. */
const indoorImpactSchema = z.object({
  exposureReductionPct: z.number(),
  indoorBeforeUgM3: z.number().min(0),
  indoorAfterUgM3: z.number().min(0),
});
export type IndoorImpact = z.infer<typeof indoorImpactSchema>;

/** A commute swap: CO₂ saved each week, and the change in exposure on the way (negative: more). */
const swapImpactSchema = z.object({
  co2SavedKgPerWeek: z.number(),
  exposureReductionPct: z.number(),
});
export type SwapImpact = z.infer<typeof swapImpactSchema>;

/** A smaller share of fine particles getting through, in percent. */
const shareImpactSchema = z.object({ exposureReductionPct: z.number() });

/** What every recommendation carries besides its id, impact and facts. */
const recommendationBaseSchema = z.object({
  category: recommendationCategorySchema,
  priority: z.number().int().min(1),
  effort: levelSchema,
  memberIds: z.array(z.string()),
});

/**
 * One kind of recommendation: its id, the shape of its impact and the facts behind it (the
 * household and air values it was decided from). Its standard text quotes some of these, and the
 * AI is given all of them with the impact.
 */
function recommendation<
  const Id extends string,
  const ImpactSchema extends z.core.$ZodType,
  const Facts extends z.core.$ZodShape,
>(id: Id, impact: ImpactSchema, facts: Facts) {
  return recommendationBaseSchema.extend({ id: z.literal(id), impact, facts: z.object(facts) });
}

/** A share of fine particles in percent. */
const percentSchema = z.number().min(0).max(100);

const indexFacts = { indexValue: indexValueSchema };
const indoorHackFacts = { outdoorPm25: pm25Schema, roomAreaM2: homeSchema.shape.roomAreaM2 };
const commuteFacts = commuteSchema.pick({ mode: true, oneWayKm: true, daysPerWeek: true }).shape;
const drivingFacts = commuteSchema.pick({ mode: true }).shape;

/** Every recommendation the engine can make, each with its own facts. */
export const recommendationSchema = z.discriminatedUnion('id', [
  recommendation('exercise_window', doseImpactSchema, {
    usualHour: hourSchema,
    bestHour: hourSchema,
    durationMin: exerciseSchema.shape.durationMin,
    usualPm25: pm25Schema,
    bestPm25: pm25Schema,
  }),
  recommendation('exercise_indoors', doseImpactSchema, {
    usualHour: hourSchema,
    durationMin: exerciseSchema.shape.durationMin,
    outdoorPm25: pm25Schema,
    indoorPm25: pm25Schema,
  }),
  recommendation('commute_protection', doseImpactSchema, {
    ...commuteSchema.pick({ mode: true, oneWayKm: true, departHour: true, returnHour: true }).shape,
    currentMask: maskTypeSchema,
  }),
  recommendation('ventilate_briefly', levelImpactSchema, { hour: hourSchema, pm25: pm25Schema }),
  recommendation('run_purifier', indoorImpactSchema, {
    ...indoorHackFacts,
    purifiersOwned: homeSchema.shape.purifierCount,
  }),
  recommendation('seal_gaps', indoorImpactSchema, indoorHackFacts),
  recommendation('keep_windows_shut', indoorImpactSchema, indoorHackFacts),
  recommendation('stop_incense', indoorImpactSchema, indoorHackFacts),
  recommendation('no_indoor_smoking', indoorImpactSchema, indoorHackFacts),
  recommendation('safer_heating', indoorImpactSchema, {
    ...indoorHackFacts,
    heating: smokyHeatingSchema,
  }),
  recommendation('cooking_ventilation', levelImpactSchema, {
    cookingFuel: homeSchema.shape.cookingFuel,
    hasExhaust: homeSchema.shape.hasExhaustOrChimney,
  }),
  recommendation('wet_mopping', levelImpactSchema, {}),
  recommendation('switch_to_metro', swapImpactSchema, commuteFacts),
  recommendation('switch_to_bus', swapImpactSchema, commuteFacts),
  recommendation('carpool', swapImpactSchema, commuteFacts),
  recommendation('switch_to_cycle', swapImpactSchema, commuteFacts),
  recommendation('switch_to_walk', swapImpactSchema, commuteFacts),
  recommendation('work_from_home', swapImpactSchema, commuteFacts),
  recommendation('engine_off_at_signals', levelImpactSchema, drivingFacts),
  recommendation('combine_errands', levelImpactSchema, drivingFacts),
  recommendation('clean_cooking_fuel', levelImpactSchema, {
    cookingFuel: homeSchema.shape.cookingFuel,
  }),
  recommendation('n95_outdoors', shareImpactSchema, {
    currentMask: maskTypeSchema,
    inhaledShareNowPct: percentSchema,
    inhaledShareN95Pct: percentSchema,
  }),
  recommendation('sensitive_members', levelImpactSchema, {
    ...indexFacts,
    outdoorAdvice: outdoorAdviceSchema,
  }),
  recommendation('ncr_grap_check', levelImpactSchema, indexFacts),
  recommendation('check_on_neighbours', levelImpactSchema, indexFacts),
  recommendation('report_open_burning', levelImpactSchema, {}),
  recommendation('share_notice', levelImpactSchema, indexFacts),
]);
export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationId = Recommendation['id'];

/** What following a recommendation changes, in the shape its id carries. */
export type Impact = Recommendation['impact'];

/** The recommendation with one id, with the facts and impact that id carries. */
export type RecommendationOf<Id extends RecommendationId> = Extract<Recommendation, { id: Id }>;

/** Every recommendation id. Each has fixed standard guidance in `src/core/explain`. */
export const recommendationIdSchema = z.enum(
  recommendationSchema.options.map((option) => option.shape.id.value),
);
