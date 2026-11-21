import type { Context } from 'hono';
import type { AirFailure } from '../air/open-meteo.js';

/** Every way loading a plan can fail before any AI is involved. */
export type PlanFailure = AirFailure | 'insufficient_data';

const UPSTREAM = {
  status: 502,
  message: 'Air-quality data is unavailable right now. Please try again shortly.',
} as const;

const RESPONSES: Readonly<
  Record<PlanFailure, { readonly status: 502 | 503; readonly message: string }>
> = {
  timeout: UPSTREAM,
  network: UPSTREAM,
  http: UPSTREAM,
  invalid_response: UPSTREAM,
  stale: UPSTREAM,
  insufficient_data: {
    status: 503,
    message: 'There is not enough recent air-quality data for this location yet.',
  },
};

/** The status code and safe message for a failed plan load. */
export function planFailureResponse(c: Context, failure: PlanFailure): Response {
  const { status, message } = RESPONSES[failure];
  return c.json({ error: message }, status);
}
