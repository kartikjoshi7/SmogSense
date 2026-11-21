import type { ZodType } from 'zod';
import * as logger from '../logger.js';
import { fail, ok, type Result } from '../result.js';

export type FetchFailure = 'timeout' | 'network' | 'http' | 'invalid_response';

export interface HttpDeps {
  readonly fetch: typeof fetch;
  readonly timeoutMs: number;
  /** Extra attempts after a network error or 5xx; timeouts and 4xx are not retried. */
  readonly retries: number;
}

type Attempt<T> = Result<T, FetchFailure> & { readonly retryable: boolean };

function failure(error: FetchFailure, retryable: boolean): Attempt<never> {
  return { ...fail(error), retryable };
}

function classifyThrown(error: unknown): Attempt<never> {
  const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
  return timedOut ? failure('timeout', false) : failure('network', true);
}

async function attempt<T>(url: URL, schema: ZodType<T>, deps: HttpDeps): Promise<Attempt<T>> {
  let response: Response;
  try {
    response = await deps.fetch(url, { signal: AbortSignal.timeout(deps.timeoutMs) });
  } catch (error: unknown) {
    return classifyThrown(error);
  }
  if (!response.ok) {
    return failure('http', response.status >= 500);
  }
  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  return parsed.success
    ? { ...ok(parsed.data), retryable: false }
    : failure('invalid_response', false);
}

/**
 * GET a JSON document and validate it against a schema. Network errors and 5xx responses are
 * retried; every failure is logged by host only (never with query parameters) and returned typed.
 */
export async function fetchJson<T>(
  url: URL,
  schema: ZodType<T>,
  deps: HttpDeps,
): Promise<Result<T, FetchFailure>> {
  let result = await attempt(url, schema, deps);
  for (let retry = 0; retry < deps.retries && result.retryable; retry++) {
    result = await attempt(url, schema, deps);
  }
  if (!result.ok) {
    logger.warn('Upstream request failed', { host: url.host, reason: result.error });
    return fail(result.error);
  }
  return ok(result.value);
}
