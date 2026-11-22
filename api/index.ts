/** Vercel's entry point: hands every /api/* request to the Hono app. */
import { createServerApp } from '../src/server/main.js';

const app = createServerApp();

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
