import type { Page } from '@playwright/test';
import { FAKE_AI } from '../src/ui/test/fake-server.js';
import { expect, startWithExampleFamily, test } from './fixtures.js';

const MIN_TARGET_PX = 44;

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

/** Nothing is wider than the screen, so the page never scrolls sideways. */
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Visible controls that are shorter or narrower than a 44 px touch target. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const controls = document.querySelectorAll<HTMLElement>(
      'button, select, textarea, input:not([type="checkbox"]), label.check',
    );
    return Array.from(controls)
      .filter((el) => el.offsetParent !== null)
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.height < min || box.width < min;
      })
      .map((el) => `${el.tagName.toLowerCase()} "${el.textContent.trim()}"`);
  }, MIN_TARGET_PX);
}

test('the setup screen fits a phone, with 44 px touch targets', async ({ page }) => {
  await page.goto('/');

  await expectNoSidewaysScroll(page);
  expect(await smallTargets(page)).toEqual([]);
});

test('the plan and the chat dialog fit a phone', async ({ page }) => {
  await startWithExampleFamily(page);
  await expectNoSidewaysScroll(page);
  expect(await smallTargets(page)).toEqual([]);

  await page.getByRole('button', { name: 'Ask SmogSense' }).tap();
  const chat = page.getByRole('dialog', { name: 'Ask SmogSense' });
  await chat.getByRole('button', { name: 'Can the children play outside at 4 pm?' }).tap();
  await expect(chat.getByText(FAKE_AI.answer)).toBeVisible();
  const box = await chat.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(390);
  expect(box?.height).toBeLessThanOrEqual(844);
  await expectNoSidewaysScroll(page);
});
