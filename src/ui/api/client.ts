import type { ZodType } from 'zod';
import {
  chatResponseSchema,
  communityResponseSchema,
  errorResponseSchema,
  explainResponseSchema,
  geocodeResponseSchema,
  planResponseSchema,
  type ChatRequest,
  type CommunityRequest,
  type ExplainRequest,
  type PlanRequest,
} from '../../shared/api.js';

/** A typed API outcome. `message` is the server's safe error text when it sent one. */
export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number | null; readonly message: string | null };

async function request<T>(
  path: string,
  schema: ZodType<T>,
  init: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    return { ok: false, status: null, message: null };
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = errorResponseSchema.safeParse(body);
    return { ok: false, status: response.status, message: error.success ? error.data.error : null };
  }
  const parsed = schema.safeParse(body);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, status: response.status, message: null };
}

function post<T>(path: string, body: unknown, schema: ZodType<T>, signal?: AbortSignal) {
  return request(path, schema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
}

/** Every call the UI makes to the SmogSense API, each validated against the shared schemas. */
export const api = {
  geocode: (q: string, signal?: AbortSignal) =>
    request(`/api/geocode?${new URLSearchParams({ q }).toString()}`, geocodeResponseSchema, {
      ...(signal === undefined ? {} : { signal }),
    }),
  plan: (body: PlanRequest, signal?: AbortSignal) =>
    post('/api/plan', body, planResponseSchema, signal),
  explain: (body: ExplainRequest, signal?: AbortSignal) =>
    post('/api/explain', body, explainResponseSchema, signal),
  chat: (body: ChatRequest) => post('/api/chat', body, chatResponseSchema),
  community: (body: CommunityRequest) => post('/api/community', body, communityResponseSchema),
};
