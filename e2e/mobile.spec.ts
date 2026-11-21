import type { Page } from '@playwright/test';
import { FAKE_AI } from '../src/ui/test/fake-server.js';
import { expect, startWithExampleFamily, test } from './fixtures.js';

const MIN_TARGET_PX = 44;

/** Common phone screens: a small iPhone and a mid-size Android or iPhone. */
const PHONES = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
] as const;

/** Nothing is wider than the screen, so the page never scrolls sideways. */
async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/**
 * Visible controls and links smaller than a 44 px touch target. Links inside a sentence are left
 * out, as WCAG 2.5.8 allows for inline targets.
 */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const controls = document.querySelectorAll<HTMLElement>(
      'a, button, select, textarea, input:not([type="checkbox"]), label.check',
    );
    return Array.from(controls)
      .filter((el) => el.offsetParent !== null && el.closest('p') === null)
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.height < min || box.width < min;
      })
      .map((el) => `${el.tagName.toLowerCase()} "${el.textContent.trim()}"`);
  }, MIN_TARGET_PX);
}

for (const phone of PHONES) {
  test.describe(`a ${phone.width} × ${phone.height} phone`, () => {
    test.use({ viewport: phone, isMobile: true, hasTouch: true });

    test('the setup screen fits, with 44 px touch targets', async ({ page }) => {
      await page.goto('/');

      await expectNoSidewaysScroll(page);
      expect(await smallTargets(page)).toEqual([]);
    });

    test('the plan and the chat dialog fit', async ({ page }) => {
      await startWithExampleFamily(page);
      await expectNoSidewaysScroll(page);
      expect(await smallTargets(page)).toEqual([]);

      await page.getByRole('button', { name: 'Ask SmogSense' }).tap();
      const chat = page.getByRole('dialog', { name: 'Ask SmogSense' });
      await chat.getByRole('button', { name: 'Can the children play outside at 4 pm?' }).tap();
      await expect(chat.getByText(FAKE_AI.answer)).toBeVisible();
      const box = await chat.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(phone.width);
      expect(box?.height).toBeLessThanOrEqual(phone.height);
      await expectNoSidewaysScroll(page);
    });
  });
}
