import { z } from 'zod';
import { CHAT_LIMITS, PLACE_QUERY_CHARS } from './limits.js';
import { languageSchema } from './languages.js';
import { planSchema, recommendationIdSchema } from './plan.js';
import { coordinatesSchema } from './primitives.js';
import { profileSchema } from './profile.js';

/** A point on the map. The server rounds it to 0.1° before using it. */
export type Location = z.infer<typeof coordinatesSchema>;

/** City search text: letters (any script), spaces and simple punctuation only. */
export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(PLACE_QUERY_CHARS.min)
    .max(PLACE_QUERY_CHARS.max)
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
  location: coordinatesSchema,
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

export const planResponseSchema = z.object({ plan: planSchema });

/** Who a community notice is written for. */
const audienceSchema = z.enum(['housing_society', 'school', 'workplace']);
export type Audience = z.infer<typeof audienceSchema>;

/** Where a piece of text came from: Gemini (checked against the facts) or standard guidance. */
const textSourceSchema = z.enum(['ai', 'fallback']);
export type TextSource = z.infer<typeof textSourceSchema>;

export const explainRequestSchema = planRequestSchema.extend({ lang: languageSchema });
export type ExplainRequest = z.infer<typeof explainRequestSchema>;

const explainedItemSchema = z.object({
  id: recommendationIdSchema,
  title: z.string(),
  why: z.string(),
  steps: z.array(z.string()),
  source: textSourceSchema,
});

export const explainResponseSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  /** Whether the headline and summary were written by the AI or are standard guidance. */
  introSource: textSourceSchema,
  items: z.array(explainedItemSchema),
  /** "mixed" when some items are AI-written and others are standard guidance. */
  source: z.enum(['ai', 'fallback', 'mixed']),
});
export type ExplainResponse = z.infer<typeof explainResponseSchema>;

const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().max(CHAT_LIMITS.turnChars),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const chatRequestSchema = planRequestSchema.extend({
  lang: languageSchema,
  question: z.string().trim().min(1).max(CHAT_LIMITS.questionChars),
  history: z.array(chatTurnSchema).max(CHAT_LIMITS.historyTurns),
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
