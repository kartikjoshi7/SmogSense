import { Hono } from 'hono';
import { geocodeQuerySchema, planRequestSchema } from '../../shared/api.js';
import type { AirService } from '../air/air-service.js';
import { planFailureResponse } from '../http/errors.js';
import { jsonBody, queryParams } from '../middleware/validate.js';
import { loadPlan } from '../plan-service.js';

/** Place results change rarely; let the CDN keep them for a day. */
const GEOCODE_CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=86400';

/** Deterministic routes: city search and the household plan (no AI involved). */
export function dataRoutes(air: AirService) {
  return new Hono()
    .get('/geocode', queryParams(geocodeQuerySchema), async (c) => {
      const result = await air.searchPlaces(c.req.valid('query').q);
      if (!result.ok) {
        return c.json({ error: 'Place search is unavailable right now.' }, 502);
      }
      c.header('Cache-Control', GEOCODE_CACHE_CONTROL);
      return c.json({ places: result.value });
    })
    .post('/plan', jsonBody(planRequestSchema), async (c) => {
      const { profile, location } = c.req.valid('json');
      const plan = await loadPlan(air, profile, location);
      return plan.ok ? c.json({ plan: plan.value }) : planFailureResponse(c, plan.error);
    });
}
