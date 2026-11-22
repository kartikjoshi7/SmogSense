/** The AI routes: plan explanation, chat and community notices. */
import { Hono } from 'hono';
import {
  chatRequestSchema,
  communityRequestSchema,
  explainRequestSchema,
} from '../../shared/api.js';
import type { AiService } from '../ai/ai-service.js';
import type { AirService } from '../air/air-service.js';
import { clientKey } from '../allowance.js';
import { planFailureResponse } from '../http/errors.js';
import { jsonBody } from '../middleware/validate.js';
import { loadPlan } from '../plan-service.js';

/** Who is asking, for the daily AI allowance: the client IP the platform proxy reports. */
function caller(c: { readonly req: { header(name: string): string | undefined } }): string {
  return clientKey(c.req.header('x-forwarded-for'));
}

/**
 * AI routes. Each rebuilds the plan on the server from the profile and location (so a client
 * can never feed its own "facts" to the model) and always answers, with standard guidance
 * when the model is unavailable.
 */
export function aiRoutes(air: AirService, ai: AiService) {
  return new Hono()
    .post('/explain', jsonBody(explainRequestSchema), async (c) => {
      const { profile, location, lang } = c.req.valid('json');
      const plan = await loadPlan(air, profile, location);
      return plan.ok
        ? c.json(await ai.explain({ plan: plan.value, profile, lang }, caller(c)))
        : planFailureResponse(c, plan.error);
    })
    .post('/chat', jsonBody(chatRequestSchema), async (c) => {
      const { profile, location, lang, question, history } = c.req.valid('json');
      const plan = await loadPlan(air, profile, location);
      return plan.ok
        ? c.json(await ai.chat({ plan: plan.value, profile, lang, question, history }, caller(c)))
        : planFailureResponse(c, plan.error);
    })
    .post('/community', jsonBody(communityRequestSchema), async (c) => {
      const { profile, location, lang, audience } = c.req.valid('json');
      const plan = await loadPlan(air, profile, location);
      return plan.ok
        ? c.json(await ai.communityNotice({ plan: plan.value, audience, lang }, caller(c)))
        : planFailureResponse(c, plan.error);
    });
}
