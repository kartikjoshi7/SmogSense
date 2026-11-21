import { FAKE_AI } from '../src/ui/test/fake-server.js';
import { expect, startWithExampleFamily, test } from './fixtures.js';

test.describe('a family plans its day', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('from the example family to a plan, an answer and a community notice', async ({ page }) => {
    await startWithExampleFamily(page);
    await expect(page.getByText(FAKE_AI.headline)).toBeVisible();
    await expect(page.getByText('Smog emergency: protective actions come first')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your day' })).toBeVisible();

    const ask = page.getByRole('button', { name: 'Ask SmogSense' });
    await ask.click();
    const chat = page.getByRole('dialog', { name: 'Ask SmogSense' });
    await chat.getByRole('button', { name: 'Can the children play outside at 4 pm?' }).click();
    await expect(chat.getByText(FAKE_AI.answer)).toBeVisible();
    await expect(chat.getByText('AI explanation')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(chat).toBeHidden();
    await expect(ask).toBeFocused();

    await page.getByRole('button', { name: 'Community notice' }).click();
    const notice = page.getByRole('dialog', { name: 'Community notice' });
    await notice.getByRole('combobox', { name: 'Who is it for?' }).selectOption('school');
    const create = notice.getByRole('button', { name: 'Create notice' });
    await create.click();
    await expect(notice.getByText(FAKE_AI.notice)).toBeVisible();
    // Writing the notice never pushes keyboard focus out of the dialog.
    await expect(create).toBeFocused();
    await notice.getByRole('button', { name: 'Copy' }).click();
    await expect(notice.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(FAKE_AI.notice);
  });

  test('keeps the household on this device across a reload', async ({ page }) => {
    await startWithExampleFamily(page);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Today in New Delhi' })).toBeVisible();
  });

  test('switches the whole page to Hindi', async ({ page }) => {
    await startWithExampleFamily(page);
    await page.getByRole('combobox', { name: 'Language' }).selectOption('hi');

    await expect(page.getByRole('heading', { level: 1, name: 'आज New Delhi में' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });
});

test.describe('when the AI is unavailable', () => {
  test.use({ api: { ai: false } });

  test('every answer is standard guidance, labelled as such', async ({ page }) => {
    await startWithExampleFamily(page);
    await expect(page.getByText(/Standard guidance$/).first()).toBeVisible();
    await expect(page.getByText('AI explanation')).toHaveCount(0);
    await expect(page.getByText(FAKE_AI.headline)).toHaveCount(0);

    await page.getByRole('button', { name: 'Ask SmogSense' }).click();
    const chat = page.getByRole('dialog', { name: 'Ask SmogSense' });
    await chat.getByRole('button', { name: 'Is it safe to open the windows today?' }).click();
    await expect(chat.getByText(/Standard guidance$/)).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Community notice' }).click();
    const notice = page.getByRole('dialog', { name: 'Community notice' });
    await notice.getByRole('button', { name: 'Create notice' }).click();
    await expect(notice.getByText(/Standard guidance$/)).toBeVisible();
  });
});

test('serves the production security headers, and the app runs under them', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() ?? {};

  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).toContain("style-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Set up your household' }),
  ).toBeVisible();
});
