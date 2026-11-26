import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const CI = process.env.CI !== undefined;

/**
 * End-to-end tests run in Chromium against the production build (`vite build` + `vite preview`,
 * which sends the same security headers as Vercel). The page's `/api/*` calls are answered by the
 * real Hono app with fake air and AI services (`src/ui/test/fake-server.ts`).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
  },
});
