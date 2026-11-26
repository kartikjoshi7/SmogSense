import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeAir, MODERATE } from '../../../core/fixtures/air.js';
import { HOMEBOUND_SENIOR } from '../../../core/fixtures/profiles.js';
import { planFor } from '../../../core/fixtures/recommendations.js';
import { checkA11y } from '../../test/axe.js';
import { renderInApp } from '../../test/render.js';
import { explainedItems } from './explained.js';
import { PlanSection } from './plan-section.js';
import { Timeline } from './timeline.js';

/** A household that neither commutes nor exercises: no routines or alternatives to suggest. */
function homeboundPlan() {
  return planFor(HOMEBOUND_SENIOR, makeAir({ scale: MODERATE }));
}

describe('PlanSection', () => {
  it('shows an empty category as such, with its count in the tab', async () => {
    const plan = homeboundPlan();
    const user = userEvent.setup();
    const view = renderInApp(
      <PlanSection
        items={explainedItems(plan, null, 'en')}
        household={{ profile: HOMEBOUND_SENIOR, names: {} }}
      />,
    );
    await user.click(screen.getByRole('tab', { name: 'Sustainable alternatives (0)' }));

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Nothing to add here today.');
    expect(await checkA11y(view.container)).toEqual([]);
  });
});

describe('Timeline', () => {
  it('renders nothing when no advice is tied to a time of day', () => {
    const { container } = renderInApp(<Timeline entries={[]} items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
