import { z } from 'zod';
import { planSchema } from './plan.js';
import { profileSchema } from './profile.js';

/** A point on the map. The server rounds it to 0.1° before using it. */
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type Location = z.infer<typeof locationSchema>;

/** City search text: letters (any script), spaces and simple punctuation only. */
export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[\p{L}\p{M} ,.'-]+$/u, 'Use letters, spaces and simple punctuation only'),
});

const placeSchema = z.object({
  name: z.string(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
});
export type Place = z.infer<typeof placeSchema>;

export const geocodeResponseSchema = z.object({ places: z.array(placeSchema) });

export const planRequestSchema = z.object({
  profile: profileSchema,
  location: locationSchema,
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

export const planResponseSchema = z.object({ plan: planSchema });

/** Languages the assistant can answer in. Standard guidance exists in English and Hindi. */
const languageSchema = z.enum(['en', 'hi', 'bn', 'mr', 'ta', 'te', 'gu', 'kn', 'ml', 'pa']);
export type Language = z.infer<typeof languageSchema>;

/** Who a community notice is written for. */
const audienceSchema = z.enum(['housing_society', 'school', 'workplace']);
export type Audience = z.infer<typeof audienceSchema>;

/** Where a piece of text came from: Gemini (checked against the facts) or standard guidance. */
const textSourceSchema = z.enum(['ai', 'fallback']);

export const explainRequestSchema = planRequestSchema.extend({ lang: languageSchema });
export type ExplainRequest = z.infer<typeof explainRequestSchema>;

const explainedItemSchema = z.object({
  id: planSchema.shape.recommendations.element.shape.id,
  title: z.string(),
  why: z.string(),
  steps: z.array(z.string()),
  source: textSourceSchema,
});

export const explainResponseSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  items: z.array(explainedItemSchema),
  /** "mixed" when some items are AI-written and others are standard guidance. */
  source: z.enum(['ai', 'fallback', 'mixed']),
});
export type ExplainResponse = z.infer<typeof explainResponseSchema>;

const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().max(1000),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const chatRequestSchema = planRequestSchema.extend({
  lang: languageSchema,
  question: z.string().trim().min(1).max(500),
  history: z.array(chatTurnSchema).max(6),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({ answer: z.string(), source: textSourceSchema });
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const communityRequestSchema = planRequestSchema.extend({
  lang: languageSchema,
  audience: audienceSchema,
});

export type CommunityRequest = z.infer<typeof communityRequestSchema>;

export const communityResponseSchema = z.object({ notice: z.string(), source: textSourceSchema });
export type CommunityResponse = z.infer<typeof communityResponseSchema>;

/** Every error response: a safe, human-readable message (plus field issues for bad input). */
export const errorResponseSchema = z.object({
  error: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
