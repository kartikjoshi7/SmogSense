import axe, { type AxeResults } from 'axe-core';

/**
 * Run axe accessibility checks on a container element and return the violations. Colour
 * contrast is left to the end-to-end axe run: jsdom draws nothing, so it cannot measure it.
 */
export async function checkA11y(container: Element): Promise<AxeResults['violations']> {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations;
}
