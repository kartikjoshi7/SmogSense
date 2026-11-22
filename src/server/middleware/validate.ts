/** Middleware that validates request bodies and queries with the shared Zod schemas. */
import type { Context } from 'hono';
import { validator } from 'hono/validator';
import type { ZodType } from 'zod';
import { API_STATUS } from '../../shared/api.js';

/** The parsed value, or a 400 that lists each problem by field path. */
function parseOrReject<T>(schema: ZodType<T>, value: unknown, c: Context) {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  return c.json({ error: 'Invalid request', issues }, API_STATUS.badRequest);
}

/** Validate the JSON body against a schema. */
export function jsonBody<T>(schema: ZodType<T>) {
  return validator('json', (value, c) => parseOrReject(schema, value, c));
}

/** Validate query parameters against a schema. */
export function queryParams<T>(schema: ZodType<T>) {
  return validator('query', (value, c) => parseOrReject(schema, value, c));
}
