import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';
import { fakeReply, type FakeApiOptions } from '../src/ui/test/fake-server.js';

interface Fixtures {
  /** How the mocked `/api/*` behaves; change it per file with `test.use({ api: { … } })`. */
  readonly api: FakeApiOptions;
  /** Console errors, uncaught errors and CSP violations; each test fails if any appear. */
  readonly problems: string[];
}

/** Playwright's `test` with the SmogSense API mocked in the page and a zero-error check. */
export const test = base.extend<Fixtures>({
  api: [{}, { option: true }],
  page: async ({ page, api }, provide) => {
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const reply = fakeReply(new URL(request.url()).pathname, request.postDataJSON(), api);
      await route.fulfill({ status: reply.status, json: reply.body });
    });
    await provide(page);
  },
  problems: [
    async ({ page }, provide) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          problems.push(message.text());
        }
      });
      page.on('pageerror', (error) => {
        problems.push(error.message);
      });
      await provide(problems);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Load the Delhi example family from the setup screen and wait for its plan. */
export async function startWithExampleFamily(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an example family in Delhi' }).click();
  await page.getByRole('button', { name: 'Show my plan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today in New Delhi' })).toBeFocused();
  await expect(page.getByRole('tab', { name: /Low-emission routines/ })).toBeVisible();
}

/** Every WCAG 2.2 A and AA rule axe can check, on whatever the page shows right now. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const found = results.violations.map((v) => ({
    rule: v.id,
    targets: v.nodes.map((node) => node.target.join(' ')),
  }));
  expect(found).toEqual([]);
}
