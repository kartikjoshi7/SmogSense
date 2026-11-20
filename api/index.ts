import { createApp } from '../src/server/app.js';
import { env } from '../src/server/config.js';
import { createGeminiClient } from '../src/server/gemini.js';

const app = createApp({
  gemini: createGeminiClient(env.GEMINI_API_KEY),
});

/**
 * Vercel Node.js function entry. `vercel.json` rewrites every `/api/*` request here,
 * and Vercel calls this Web-standard handler; the Hono app does the routing.
 */
function handleRequest(request: Request): Response | Promise<Response> {
  return app.fetch(request);
}

export const GET = handleRequest;
export const POST = handleRequest;
export const OPTIONS = handleRequest;
