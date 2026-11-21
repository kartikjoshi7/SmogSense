import { expect, expectNoAxeViolations, startWithExampleFamily, test } from './fixtures.js';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('the setup screen, empty and with errors', async ({ page }) => {
      await page.goto('/');
      await expectNoAxeViolations(page);
      await page.getByRole('button', { name: 'Show my plan' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test('the plan, every category and the forecast table', async ({ page }) => {
      // Six full-page axe scans: allow a slow machine three times the usual timeout.
      test.slow();
      await startWithExampleFamily(page);
      await expectNoAxeViolations(page);
      for (const name of [
        /Indoor air hacks/,
        /Sustainable alternatives/,
        /Protection/,
        /Community/,
      ]) {
        await page.getByRole('tab', { name }).click();
        await expectNoAxeViolations(page);
      }
      await page.getByRole('button', { name: 'Show as a table' }).click();
      await expect(page.getByRole('table')).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test('the chat and community dialogs with their answers', async ({ page }) => {
      test.slow();
      await startWithExampleFamily(page);
      await page.getByRole('button', { name: 'Ask SmogSense' }).click();
      const chat = page.getByRole('dialog', { name: 'Ask SmogSense' });
      await chat.getByRole('button', { name: 'Which mask should my father wear?' }).click();
      await expect(chat.getByText('AI explanation')).toBeVisible();
      await expectNoAxeViolations(page);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Community notice' }).click();
      const notice = page.getByRole('dialog', { name: 'Community notice' });
      await notice.getByRole('button', { name: 'Create notice' }).click();
      await expect(notice.getByRole('button', { name: 'Copy' })).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test('the plan in Hindi', async ({ page }) => {
      await startWithExampleFamily(page);
      await page.getByRole('combobox', { name: 'Language' }).selectOption('hi');
      await expect(page.getByRole('heading', { level: 1, name: 'आज New Delhi में' })).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
