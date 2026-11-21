import { createMiddleware } from 'hono/factory';
import { TtlCache } from '../cache.js';
import { API_STATUS } from '../../shared/api.js';
import { SECOND_MS } from '../config.js';

export interface RateLimitOptions {
  /** Requests allowed per client within the window. */
  readonly limit: number;
  readonly windowMs: number;
  /** Most clients remembered at once; the least recently seen are forgotten first. */
  readonly maxClients: number;
  readonly now: () => number;
}

/** The client's IP as reported by the platform proxy (first `x-forwarded-for` entry). */
function clientKey(forwardedFor: string | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first === undefined || first === '' ? 'unknown' : first;
}

/**
 * Sliding-window rate limit per client IP, answering 429 with `Retry-After` when exceeded.
 * State is in memory, so each serverless instance counts separately (see docs/SECURITY.md).
 */
export function rateLimit(options: RateLimitOptions) {
  // Each client's recent hits; the least recently seen clients are forgotten first.
  const hits = new TtlCache<number[]>({
    maxEntries: options.maxClients,
    ttlMs: options.windowMs,
    now: options.now,
  });
  return createMiddleware(async (c, next) => {
    const key = clientKey(c.req.header('x-forwarded-for'));
    const now = options.now();
    const recent = (hits.get(key) ?? []).filter((t) => t > now - options.windowMs);
    if (recent.length >= options.limit) {
      hits.set(key, recent);
      const oldest = recent[0] ?? now;
      c.header('Retry-After', String(Math.ceil((oldest + options.windowMs - now) / SECOND_MS)));
      return c.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        API_STATUS.tooManyRequests,
      );
    }
    hits.set(key, [...recent, now]);
    await next();
    return undefined;
  });
}
