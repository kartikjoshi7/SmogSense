import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeAir } from '../../../core/fixtures/air.js';
import { SHARMA_FAMILY } from '../../../core/fixtures/profiles.js';
import { buildPlan } from '../../../core/plan.js';
import { checkA11y } from '../../test/axe.js';
import { renderInApp } from '../../test/render.js';
import { ForecastChart } from './forecast-chart.js';

/** A Delhi day whose forecast has no value at 10:00 and 11:00. */
function planWithGaps() {
  const pm25Day = Array.from({ length: 24 }, (_, h) => (h === 10 || h === 11 ? null : 120));
  const result = buildPlan(SHARMA_FAMILY, makeAir({ pm25Day }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('ForecastChart', () => {
  it('draws missing hours as outlines, not as clean air, and says how many there are', async () => {
    const { container } = renderInApp(<ForecastChart plan={planWithGaps()} />);
    const chart = screen.getByRole('img', { name: 'PM2.5 over the next 24 hours' });

    expect(chart).toHaveAccessibleDescription(/2 hours have no forecast/);
    // The outline is the dashed rectangle the chart draws in place of a bar.
    expect(chart.querySelectorAll('rect[stroke-dasharray]')).toHaveLength(2);
    expect(await checkA11y(container)).toEqual([]);
  });

  it('lists the missing hours as "No data" in the table view', async () => {
    const user = userEvent.setup();
    renderInApp(<ForecastChart plan={planWithGaps()} />);
    await user.click(screen.getByRole('button', { name: 'Show as a table' }));

    expect(screen.getByRole('rowheader', { name: '10:00' }).closest('tr')).toHaveTextContent(
      'No data',
    );
  });
});
