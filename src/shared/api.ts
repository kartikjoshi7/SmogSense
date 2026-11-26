/** The API's requests, responses and statuses, shared by the server and the UI. */
import { z } from 'zod';
import { languageSchema, uiLanguageSchema } from './languages.js';
import { CHAT_LIMITS, PLACE_QUERY_CHARS } from './limits.js';
import { planSchema } from './plan.js';
import { coordinatesSchema } from './primitives.js';
import { profileSchema } from './profile.js';
import { recommendationIdSchema } from './recommendation.js';

/** The statuses the API answers with when it cannot help, shared by the server and the UI. */
export const API_STATUS = {
  badRequest: 400,
  notFound: 404,
  tooLarge: 413,
  tooManyRequests: 429,
  upstreamFailed: 502,
  noData: 503,
  internal: 500,
} as const;

/** A point on the map. The server rounds it to 0.1° before using it. */
export type Location = z.infer<typeof coordinatesSchema>;

/** City search text: letters and digits (any script), spaces and simple punctuation only. */
export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(PLACE_QUERY_CHARS.min)
    .max(PLACE_QUERY_CHARS.max)
    .regex(/^[\p{L}\p{M}\p{N} ,.'()-]+$/u, 'Use letters, digits, spaces and simple punctuation'),
  /** The interface language, for place names in the user's script. */
  lang: uiLanguageSchema.default('en'),
});

const placeSchema = z.object({
  name: z.string(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  ...coordinatesSchema.shape,
});
export type Place = z.infer<typeof placeSchema>;

export const geocodeResponseSchema = z.object({ places: z.array(placeSchema) });

export const planRequestSchema = z.object({
  profile: profileSchema,
  location: coordinatesSchema,
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

/** Which plan a reply belongs to: a fingerprint the server gives each plan it builds. */
const planKeySchema = z.string().min(1);

export const planResponseSchema = z.object({ plan: planSchema, planKey: planKeySchema });

/** Who a community notice is written for. */
const audienceSchema = z.enum(['housing_society', 'school', 'workplace']);
export type Audience = z.infer<typeof audienceSchema>;

/** Where a piece of text came from: Gemini (checked against the facts) or standard guidance. */
const textSourceSchema = z.enum(['ai', 'fallback']);
export type TextSource = z.infer<typeof textSourceSchema>;

export const explainRequestSchema = planRequestSchema.extend({ lang: languageSchema });
export type ExplainRequest = z.infer<typeof explainRequestSchema>;

/**
 * The AI's wording for a plan: only the parts that passed the grounding check. The UI shows
 * standard guidance for everything else, so the server never sends text the UI can build itself.
 */
const aiExplanationSchema = z.object({
  /** The headline and summary, or null when the AI's did not pass. */
  intro: z.object({ headline: z.string(), summary: z.string() }).nullable(),
  items: z.array(
    z.object({ id: recommendationIdSchema, why: z.string(), steps: z.array(z.string()) }),
  ),
});
export type AiExplanation = z.infer<typeof aiExplanationSchema>;

export const explainResponseSchema = aiExplanationSchema.extend({ planKey: planKeySchema });
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

/** A community notice is the same for every family at a place, so it needs no household profile. */
export const communityRequestSchema = z.object({
  location: coordinatesSchema,
  lang: languageSchema,
  audience: audienceSchema,
});

export type CommunityRequest = z.infer<typeof communityRequestSchema>;

export const communityResponseSchema = z.object({ notice: z.string(), source: textSourceSchema });
export type CommunityResponse = z.infer<typeof communityResponseSchema>;
