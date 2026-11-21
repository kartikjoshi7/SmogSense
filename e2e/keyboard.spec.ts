import type { Locator, Page } from '@playwright/test';
import { FAKE_AI } from '../src/ui/test/fake-server.js';
import { expect, test } from './fixtures.js';

const MAX_TABS = 120;

/** Press Tab until `target` has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let presses = 0; presses < MAX_TABS; presses += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${target.toString()}`);
}

/** The focused element draws a visible outline. */
async function expectVisibleFocus(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  const outline = await target.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
}

test('a keyboard-only user can set up, plan, ask and close the dialog', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expectVisibleFocus(skip);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const demo = page.getByRole('button', { name: 'Try an example family in Delhi' });
  await expectVisibleFocus(demo);
  await page.keyboard.press('Enter');

  await tabTo(page, page.getByRole('button', { name: 'Show my plan' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Today in New Delhi' })).toBeFocused();

  const routines = page.getByRole('tab', { name: /Low-emission routines/ });
  await tabTo(page, routines);
  await page.keyboard.press('ArrowRight');
  const indoor = page.getByRole('tab', { name: /Indoor air hacks/ });
  await expectVisibleFocus(indoor);
  await expect(indoor).toHaveAttribute('aria-selected', 'true');

  const ask = page.getByRole('button', { name: 'Ask SmogSense' });
  await page.keyboard.press('Shift+Tab');
  await tabTo(page, ask);
  await page.keyboard.press('Enter');
  const chat = page.getByRole('dialog', { name: 'Ask SmogSense' });
  await expectVisibleFocus(chat.getByRole('button', { name: 'Close' }));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(chat.getByText(FAKE_AI.answer)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(chat).toBeHidden();
  await expectVisibleFocus(ask);
});

test('Tab and Shift+Tab stay inside an open dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try an example family in Delhi' }).click();
  await page.getByRole('button', { name: 'Show my plan' }).click();
  await page.getByRole('button', { name: 'Community notice' }).click();
  const dialog = page.getByRole('dialog', { name: 'Community notice' });
  const close = dialog.getByRole('button', { name: 'Close' });
  await expect(close).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Create notice' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
});
