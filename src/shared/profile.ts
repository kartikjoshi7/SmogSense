import { z } from 'zod';
import { PROFILE_LIMITS } from './limits.js';
import { hourSchema, rangeSchema } from './primitives.js';

/** Short opaque id for a household member. Display names never leave the device. */
const memberIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,12}$/, 'Member ids are 1–12 lowercase letters, digits or hyphens');

const ageGroupSchema = z.enum(['infant', 'child', 'teen', 'adult', 'senior']);
export type AgeGroup = z.infer<typeof ageGroupSchema>;

const conditionSchema = z.enum(['asthma', 'copd', 'heart', 'pregnancy']);

const memberSchema = z.object({
  id: memberIdSchema,
  ageGroup: ageGroupSchema,
  conditions: z.array(conditionSchema).max(4),
});
export type Member = z.infer<typeof memberSchema>;

const commuteModeSchema = z.enum([
  'walk',
  'cycle',
  'two_wheeler',
  'auto',
  'bus',
  'metro',
  'car_petrol',
  'car_diesel',
  'car_cng',
  'car_ev',
  'none',
]);
export type CommuteMode = z.infer<typeof commuteModeSchema>;

/** Alternatives the household could realistically use instead of its usual commute. */
const commuteAlternativeSchema = z.enum(['metro', 'bus', 'carpool', 'cycle', 'walk', 'wfh']);
export type CommuteAlternative = z.infer<typeof commuteAlternativeSchema>;

export const commuteSchema = z.object({
  mode: commuteModeSchema,
  oneWayKm: rangeSchema(PROFILE_LIMITS.oneWayKm),
  departHour: hourSchema,
  returnHour: hourSchema,
  daysPerWeek: rangeSchema(PROFILE_LIMITS.daysPerWeek).int(),
  alternatives: z.array(commuteAlternativeSchema).max(6),
});
export type Commute = z.infer<typeof commuteSchema>;

const exerciseActivitySchema = z.enum(['walk', 'run', 'cycle', 'yoga', 'sports', 'none']);
export type ExerciseActivity = z.infer<typeof exerciseActivitySchema>;

export const exerciseSchema = z.object({
  activity: exerciseActivitySchema,
  /** The member who usually exercises; null when it is the whole family or unknown. */
  memberId: memberIdSchema.nullable(),
  usualHour: hourSchema,
  durationMin: rangeSchema(PROFILE_LIMITS.durationMin).int(),
  canMoveIndoors: z.boolean(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

const airtightnessSchema = z.enum(['leaky', 'average', 'sealed']);
export type Airtightness = z.infer<typeof airtightnessSchema>;

const cookingFuelSchema = z.enum(['lpg', 'png', 'induction', 'biomass', 'kerosene']);
export type CookingFuel = z.infer<typeof cookingFuelSchema>;

/** How often incense, dhoop or mosquito coils are burned at home. */
const incenseSchema = z.enum(['never', 'sometimes', 'daily']);

export const homeSchema = z.object({
  purifierCount: rangeSchema(PROFILE_LIMITS.purifierCount).int(),
  purifierCadrM3h: rangeSchema(PROFILE_LIMITS.purifierCadrM3h),
  /** Floor area of the room the family spends most time in. */
  roomAreaM2: rangeSchema(PROFILE_LIMITS.roomAreaM2),
  airtightness: airtightnessSchema,
  cookingFuel: cookingFuelSchema,
  hasExhaustOrChimney: z.boolean(),
  incense: incenseSchema,
  indoorSmoking: z.boolean(),
});
export type Home = z.infer<typeof homeSchema>;

export const maskTypeSchema = z.enum(['none', 'cloth', 'surgical', 'n95']);
export type MaskType = z.infer<typeof maskTypeSchema>;

/** Everything the engine needs to know about a household. Contains no names. */
export const profileSchema = z
  .object({
    members: z.array(memberSchema).min(PROFILE_LIMITS.members.min).max(PROFILE_LIMITS.members.max),
    commute: commuteSchema,
    exercise: exerciseSchema,
    home: homeSchema,
    mask: maskTypeSchema,
  })
  .refine((p) => new Set(p.members.map((m) => m.id)).size === p.members.length, {
    message: 'Member ids must be unique',
    path: ['members'],
  })
  .refine(
    (p) => p.exercise.memberId === null || p.members.some((m) => m.id === p.exercise.memberId),
    {
      message: 'Exercise member must be one of the household members',
      path: ['exercise', 'memberId'],
    },
  );
export type Profile = z.infer<typeof profileSchema>;
