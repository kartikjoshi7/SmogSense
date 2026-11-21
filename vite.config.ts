import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import { z } from 'zod';

type ServerModule = typeof import('./src/server/main.js');
type ServerApp = ReturnType<ServerModule['createServerApp']>;

/**
 * Serve the Hono API on the Vite dev server so `npm run dev` runs UI and API on one port.
 * The app is rebuilt only when its source module changes, so caches survive between requests.
 */
function devApi(env: Record<string, string>): Plugin {
  const apps = new WeakMap<ServerModule, ServerApp>();

  async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
    const { getRequestListener } = await import('@hono/node-server');
    const mod = (await server.ssrLoadModule('/src/server/main.ts')) as ServerModule;
    const app = apps.get(mod) ?? mod.createServerApp({ ...process.env, ...env });
    apps.set(mod, app);
    // Connect strips the mount path; the Hono app expects the full /api/... URL.
    req.url = `/api${req.url ?? ''}`;
    await getRequestListener(app.fetch)(req, res);
  }

  return {
    name: 'smogsense-dev-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        void handle(server, req, res);
      });
    },
  };
}

const vercelHeadersSchema = z.object({
  headers: z.array(
    z.object({
      source: z.string(),
      headers: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
});

/**
 * The headers `vercel.json` sends with every page (CSP, HSTS and the rest), so `vite preview`
 * and the end-to-end tests run the production build under the production policy.
 */
function pageHeaders(): Record<string, string> {
  const vercel = vercelHeadersSchema.parse(
    JSON.parse(readFileSync(new URL('vercel.json', import.meta.url), 'utf8')),
  );
  const everyPage = vercel.headers.find((rule) => rule.source === '/(.*)');
  return Object.fromEntries((everyPage?.headers ?? []).map(({ key, value }) => [key, value]));
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApi(loadEnv(mode, process.cwd(), ''))],
  build: { outDir: 'dist' },
  preview: { headers: pageHeaders() },
}));
