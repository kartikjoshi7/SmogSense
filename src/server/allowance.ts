import { fail, ok, type Result } from '../core/result.js';
import { TtlCache } from './cache.js';

export interface AllowanceOptions {
  /** Uses allowed per client within the window. */
  readonly limit: number;
  readonly windowMs: number;
  /** Most clients remembered at once; the least recently seen are forgotten first. */
  readonly maxClients: number;
  readonly now: () => number;
}

/** Why a use was refused: how long until the oldest use in the window expires. */
interface Refusal {
  readonly retryAfterMs: number;
}

/** A client's allowance: at most `limit` uses in any sliding `windowMs`. */
export interface Allowance {
  take(client: string): Result<null, Refusal>;
}

/**
 * A sliding-window allowance per client, kept in memory, so each serverless instance counts
 * separately (see docs/SECURITY.md). The rate limits and the daily AI allowance both use it.
 */
export function createAllowance(options: AllowanceOptions): Allowance {
  // Each client's recent uses; the least recently seen clients are forgotten first.
  const uses = new TtlCache<number[]>({
    maxEntries: options.maxClients,
    ttlMs: options.windowMs,
    now: options.now,
  });
  return {
    take(client) {
      const now = options.now();
      const recent = (uses.get(client) ?? []).filter((t) => t > now - options.windowMs);
      if (recent.length >= options.limit) {
        uses.set(client, recent);
        const oldest = recent[0] ?? now;
        return fail({ retryAfterMs: oldest + options.windowMs - now });
      }
      uses.set(client, [...recent, now]);
      return ok(null);
    },
  };
}

/** The client's IP as reported by the platform proxy (the first `x-forwarded-for` entry). */
export function clientKey(forwardedFor: string | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first === undefined || first === '' ? 'unknown' : first;
}
