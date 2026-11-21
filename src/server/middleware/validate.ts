import { validator } from 'hono/validator';
import type { ZodError, ZodType } from 'zod';

function describeIssues(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

/** Validate the JSON body against a schema; invalid input gets a 400 listing each problem. */
export function jsonBody<T>(schema: ZodType<T>) {
  return validator('json', (value, c) => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? parsed.data
      : c.json({ error: 'Invalid request', issues: describeIssues(parsed.error) }, 400);
  });
}

/** Validate query parameters against a schema; invalid input gets a 400 listing each problem. */
export function queryParams<T>(schema: ZodType<T>) {
  return validator('query', (value, c) => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? parsed.data
      : c.json({ error: 'Invalid request', issues: describeIssues(parsed.error) }, 400);
  });
}
