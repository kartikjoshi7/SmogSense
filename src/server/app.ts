import type { GoogleGenAI } from '@google/genai';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import * as logger from './logger.js';
import { BODY_LIMIT_BYTES } from './config.js';

const APP_VERSION = '0.1.0';

/** Dependencies injected into the app for testability. */
export interface AppDeps {
  gemini?: GoogleGenAI | undefined;
}

/**
 * Create the Hono application with all middleware and routes.
 * Dependencies are injected for testability.
 */
export function createApp(_deps: AppDeps) {
  const app = new Hono().basePath('/api');

  app.use('*', secureHeaders());
  app.use('*', bodyLimit({ maxSize: BODY_LIMIT_BYTES }));

  app.get('/health', (c) => {
    return c.json({ status: 'ok', version: APP_VERSION });
  });

  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  app.onError((err, c) => {
    logger.error('Unhandled error', {
      path: c.req.path,
      method: c.req.method,
      error: err.message,
    });
    return c.json({ error: 'Internal error' }, 500);
  });

  return app;
}
