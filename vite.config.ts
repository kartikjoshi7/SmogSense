import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function devApiProxy(): Plugin {
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api', (req: IncomingMessage, res: ServerResponse) => {
        void handleApiRequest(server, req, res);
      });
    },
  };
}

async function handleApiRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const { getRequestListener } = await import('@hono/node-server');
  const mod = (await server.ssrLoadModule('/src/server/app.ts')) as {
    createApp: typeof import('./src/server/app.ts').createApp;
  };
  const app = mod.createApp({});
  const listener = getRequestListener(app.fetch);
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  await listener(req, res);
  return;
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiProxy()],
  build: {
    outDir: 'dist',
  },
});
