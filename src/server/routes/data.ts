import { Hono } from 'hono';
import { geocodeQuerySchema, planRequestSchema } from '../../shared/api.js';
import type { AirService } from '../air/air-service.js';
import { SETTINGS } from '../config.js';
import { geocodeFailureResponse, planFailureResponse } from '../http/errors.js';
import { jsonBody, queryParams } from '../middleware/validate.js';
import { loadPlan } from '../plan-service.js';

const GEOCODE_MAX_AGE = SETTINGS.geocodeCdnMaxAgeSeconds;
const GEOCODE_CACHE_CONTROL = `public, s-maxage=${GEOCODE_MAX_AGE}, stale-while-revalidate=${GEOCODE_MAX_AGE}`;

/** Deterministic routes: city search and the household plan (no AI involved). */
export function dataRoutes(air: AirService) {
  return new Hono()
    .get('/geocode', queryParams(geocodeQuerySchema), async (c) => {
      const { q, lang } = c.req.valid('query');
      const result = await air.searchPlaces(q, lang);
      if (!result.ok) {
        return geocodeFailureResponse(c);
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
