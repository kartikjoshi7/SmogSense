import { z } from 'zod';

/** Household member age demographic groups. */
export const ageGroupSchema = z.enum(['infant', 'child', 'teen', 'adult', 'senior']);
export type AgeGroup = z.infer<typeof ageGroupSchema>;

/** Pre-existing respiratory and cardiovascular health conditions. */
export const conditionSchema = z.enum(['asthma', 'copd', 'heart', 'pregnancy']);
export type Condition = z.infer<typeof conditionSchema>;

/** Household member record without personally identifiable names. */
export const memberSchema = z.object({
  id: z.string().min(1).max(12),
  ageGroup: ageGroupSchema,
  conditions: z.array(conditionSchema),
});
export type Member = z.infer<typeof memberSchema>;

/** Primary daily commuting mode. */
export const commuteModeSchema = z.enum([
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

/** Feasible alternative modes for low-exposure commuting. */
export const commuteAlternativeSchema = z.enum(['metro', 'bus', 'carpool', 'cycle', 'walk', 'wfh']);
export type CommuteAlternative = z.infer<typeof commuteAlternativeSchema>;

/** Daily commute profile details. */
export const commuteSchema = z.object({
  mode: commuteModeSchema,
  oneWayKm: z.number().min(0).max(100),
  departHour: z.number().int().min(0).max(23),
  returnHour: z.number().int().min(0).max(23),
  daysPerWeek: z.number().int().min(0).max(7),
  alternatives: z.array(commuteAlternativeSchema),
});
export type Commute = z.infer<typeof commuteSchema>;

/** Types of physical exercise or recreation. */
export const exerciseActivitySchema = z.enum(['walk', 'run', 'cycle', 'yoga', 'sports', 'none']);
export type ExerciseActivity = z.infer<typeof exerciseActivitySchema>;

/** Exercise and outdoor recreation routine. */
export const exerciseSchema = z.object({
  activity: exerciseActivitySchema,
  usualHour: z.number().int().min(0).max(23),
  durationMin: z.number().int().min(10).max(180),
  canMoveIndoors: z.boolean(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

/** Home building envelope airtightness category. */
export const airtightnessSchema = z.enum(['leaky', 'average', 'sealed']);
export type Airtightness = z.infer<typeof airtightnessSchema>;

/** Domestic cooking fuel and appliance source. */
export const cookingFuelSchema = z.enum(['lpg', 'png', 'induction', 'biomass', 'kerosene']);
export type CookingFuel = z.infer<typeof cookingFuelSchema>;

/** Household frequency of burning incense, dhoop, or mosquito coils. */
export const incenseSchema = z.enum(['never', 'sometimes', 'daily']);
export type Incense = z.infer<typeof incenseSchema>;

/** Residential indoor environment and air quality parameters. */
export const homeSchema = z.object({
  purifierCount: z.number().int().min(0).max(5),
  purifierCadrM3h: z.number().min(50).max(1000).default(250),
  roomAreaM2: z.number().min(5).max(60),
  airtightness: airtightnessSchema,
  cookingFuel: cookingFuelSchema,
  hasExhaustOrChimney: z.boolean(),
  incense: incenseSchema,
  indoorSmoking: z.boolean(),
});
export type Home = z.infer<typeof homeSchema>;

/** Type of respiratory mask worn outdoors. */
export const maskTypeSchema = z.enum(['none', 'cloth', 'surgical', 'n95']);
export type MaskType = z.infer<typeof maskTypeSchema>;

/** Complete household profile configuration. */
export const profileSchema = z.object({
  members: z.array(memberSchema).min(1).max(8),
  commute: commuteSchema,
  exercise: exerciseSchema,
  home: homeSchema,
  mask: maskTypeSchema,
});
export type Profile = z.infer<typeof profileSchema>;

/** Single hourly atmospheric and meteorological reading. */
export const hourlyReadingSchema = z.object({
  time: z.string(),
  hour: z.number().int().min(0).max(23),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable(),
  o3: z.number().nullable(),
  co: z.number().nullable(),
  so2: z.number().nullable(),
  blhM: z.number().nullable(),
  windKmh: z.number().nullable(),
});
export type HourlyReading = z.infer<typeof hourlyReadingSchema>;

/** Daily sunrise and sunset daylight interval boundaries. */
export const daylightSchema = z.object({
  sunrise: z.string(),
  sunset: z.string(),
});
export type Daylight = z.infer<typeof daylightSchema>;

/** Comprehensive local air quality and weather dataset. */
export const airDataSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  timezone: z.string(),
  countryCode: z.string().nullable(),
  hourly: z.array(hourlyReadingSchema),
  daylight: z.array(daylightSchema),
  nowIndex: z.number().int().min(0),
});
export type AirData = z.infer<typeof airDataSchema>;
