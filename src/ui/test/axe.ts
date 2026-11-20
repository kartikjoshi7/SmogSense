import axe, { type AxeResults } from 'axe-core';

/**
 * Run axe accessibility checks on a container element.
 * Returns the list of violations found.
 */
export async function checkA11y(container: Element): Promise<AxeResults['violations']> {
  const results = await axe.run(container);
  return results.violations;
}
