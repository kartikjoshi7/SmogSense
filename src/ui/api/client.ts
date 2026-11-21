import type { ZodType } from 'zod';
import { fail, ok, type Result } from '../../core/result.js';
import {
  API_STATUS,
  chatResponseSchema,
  communityResponseSchema,
  explainResponseSchema,
  geocodeResponseSchema,
  planResponseSchema,
  type ChatRequest,
  type CommunityRequest,
  type ExplainRequest,
  type PlanRequest,
} from '../../shared/api.js';
import type { UiLanguage } from '../../shared/languages.js';

/**
 * Why a call failed: the HTTP status when the server answered with an error, or null when there
 * was no usable answer (offline, cancelled, or a reply that broke the contract).
 */
export interface ApiError {
  readonly status: number | null;
}

const NO_ANSWER: ApiError = { status: null };

/** A failed request as the user sees it: busy (too many requests, try later) or an error. */
export function failureKind(error: ApiError): 'busy' | 'error' {
  return error.status === API_STATUS.tooManyRequests ? 'busy' : 'error';
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  init: RequestInit,
): Promise<Result<T, ApiError>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    return fail(NO_ANSWER);
  }
  if (!response.ok) {
    return fail({ status: response.status });
  }
  const body: unknown = await response.json().catch(() => null);
  const parsed = schema.safeParse(body);
  return parsed.success ? ok(parsed.data) : fail(NO_ANSWER);
}

function withSignal(init: RequestInit, signal: AbortSignal | undefined): RequestInit {
  return signal === undefined ? init : { ...init, signal };
}

function post<T>(path: string, body: unknown, schema: ZodType<T>, signal?: AbortSignal) {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
  return request(path, schema, withSignal(init, signal));
}

/** Every call the UI makes to the SmogSense API, each validated against the shared schemas. */
export const api = {
  geocode: (q: string, lang: UiLanguage, signal?: AbortSignal) =>
    request(
      `/api/geocode?${new URLSearchParams({ q, lang }).toString()}`,
      geocodeResponseSchema,
      withSignal({}, signal),
    ),
  plan: (body: PlanRequest, signal?: AbortSignal) =>
    post('/api/plan', body, planResponseSchema, signal),
  explain: (body: ExplainRequest, signal?: AbortSignal) =>
    post('/api/explain', body, explainResponseSchema, signal),
  chat: (body: ChatRequest) => post('/api/chat', body, chatResponseSchema),
  community: (body: CommunityRequest) => post('/api/community', body, communityResponseSchema),
};
