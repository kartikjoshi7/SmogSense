import type { Context } from 'hono';
import { API_STATUS } from '../../shared/api.js';
import type { PlanFailure } from '../plan-service.js';

const UPSTREAM = {
  status: API_STATUS.upstreamFailed,
  message: 'Air-quality data is unavailable right now. Please try again shortly.',
} as const;

const RESPONSES: Readonly<
  Record<
    PlanFailure,
    {
      readonly status: typeof API_STATUS.upstreamFailed | typeof API_STATUS.noData;
      readonly message: string;
    }
  >
> = {
  timeout: UPSTREAM,
  network: UPSTREAM,
  http: UPSTREAM,
  invalid_response: UPSTREAM,
  stale: UPSTREAM,
  insufficient_data: {
    status: API_STATUS.noData,
    message: 'There is not enough recent air-quality data for this location yet.',
  },
};

/** The status code and safe message for a failed plan load. */
export function planFailureResponse(c: Context, failure: PlanFailure): Response {
  const { status, message } = RESPONSES[failure];
  return c.json({ error: message }, status);
}

/** The response when Open-Meteo's place search fails, whatever the cause. */
export function geocodeFailureResponse(c: Context): Response {
  return c.json({ error: 'Place search is unavailable right now.' }, UPSTREAM.status);
}
