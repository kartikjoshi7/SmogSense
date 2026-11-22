/** Middleware that limits each client IP's requests and answers 429 when they run out. */
import { createMiddleware } from 'hono/factory';
import { API_STATUS } from '../../shared/api.js';
import { clientKey, createAllowance, type AllowanceOptions } from '../allowance.js';
import { SECOND_MS } from '../config.js';

/**
 * Sliding-window rate limit per client IP, answering 429 with `Retry-After` when exceeded.
 * State is in memory, so each serverless instance counts separately (see docs/SECURITY.md).
 */
export function rateLimit(options: AllowanceOptions) {
  const allowance = createAllowance(options);
  return createMiddleware(async (c, next) => {
    const taken = allowance.take(clientKey(c.req.header('x-forwarded-for')));
    if (!taken.ok) {
      c.header('Retry-After', String(Math.ceil(taken.error.retryAfterMs / SECOND_MS)));
      return c.json(
        { error: 'Too many requests. Please try again later.' },
        API_STATUS.tooManyRequests,
      );
    }
    await next();
    return undefined;
  });
}
