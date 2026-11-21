import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { API_STATUS } from '../shared/api.js';
import type { AirService } from './air/air-service.js';
import type { AiService } from './ai/ai-service.js';
import { SETTINGS, type EnvConfig } from './config.js';
import * as logger from './logger.js';
import { rateLimit } from './middleware/rate-limit.js';
import { aiRoutes } from './routes/ai.js';
import { dataRoutes } from './routes/data.js';

/** Everything the app needs from the outside world, injected so tests can replace it. */
export interface AppDeps {
  readonly config: EnvConfig;
  readonly air: AirService;
  readonly ai: AiService;
  /** Current time in milliseconds (for rate limiting). */
  readonly now: () => number;
}

/** Origins allowed to call the API from a browser on another origin. */
function allowedOrigins(config: EnvConfig): string[] {
  const origins = config.ALLOWED_ORIGIN === undefined ? [] : [config.ALLOWED_ORIGIN];
  return config.NODE_ENV === 'development' ? [...origins, SETTINGS.devOrigin] : origins;
}

function limiter(limit: number, now: () => number) {
  return rateLimit({
    limit,
    now,
    windowMs: SETTINGS.rateLimitWindowMs,
    maxClients: SETTINGS.rateLimitMaxClients,
  });
}

/** The API: security middleware, rate limits, routes and safe error handling. */
export function createApp(deps: AppDeps) {
  const origins = allowedOrigins(deps.config);
  const dataLimit = limiter(SETTINGS.dataRequestsPerWindow, deps.now);
  const aiLimit = limiter(SETTINGS.aiRequestsPerWindow, deps.now);
  const app = new Hono().basePath('/api');

  app.use(secureHeaders());
  app.use(
    cors({
      origin: (origin) => (origins.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['Content-Type'],
      maxAge: SETTINGS.corsMaxAgeSeconds,
    }),
  );
  app.use(
    bodyLimit({
      maxSize: SETTINGS.bodyLimitBytes,
      onError: (c) => c.json({ error: 'Request is too large.' }, API_STATUS.tooLarge),
    }),
  );
  app.use('/geocode', dataLimit);
  app.use('/plan', dataLimit);
  for (const path of ['/explain', '/chat', '/community']) {
    app.use(path, aiLimit);
  }

  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.route('/', dataRoutes(deps.air));
  app.route('/', aiRoutes(deps.air, deps.ai));

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: 'Invalid request' }, error.status);
    }
    logger.error('Unhandled error', {
      method: c.req.method,
      path: c.req.path,
      error: error.message,
    });
    return c.json({ error: 'Internal error' }, 500);
  });
  return app;
}
