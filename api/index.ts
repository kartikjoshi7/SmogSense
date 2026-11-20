import { handle } from 'hono/vercel';
import { createApp } from '../src/server/app.ts';
import { env } from '../src/server/config.ts';
import { createGeminiClient } from '../src/server/gemini.ts';

export const runtime = 'nodejs';

const app = createApp({
  gemini: createGeminiClient(env.GEMINI_API_KEY),
});

// hono/vercel is deprecated in favor of @hono/vercel, but the package is not yet installed.
// eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
