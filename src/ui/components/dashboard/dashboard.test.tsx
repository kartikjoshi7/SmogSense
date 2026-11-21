import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fakeApi } from '../../test/fake-api.js';
import { renderInApp } from '../../test/render.js';
import { DEMO_HOUSEHOLD, DEMO_LOCATION } from '../setup/defaults.js';
import { Dashboard } from './dashboard.js';

function showDashboard() {
  return renderInApp(
    <Dashboard
      household={DEMO_HOUSEHOLD}
      location={DEMO_LOCATION}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );
}

describe('Dashboard errors', () => {
  it.each([
    [502, /Air-quality data is unavailable right now/],
    [503, /not enough recent air-quality data/],
    [429, /Too many requests just now/],
    [500, /Your plan could not be loaded/],
  ])('explains a %i from the plan route in the interface language', async (status, text) => {
    fakeApi({ failures: { plan: { status, error: 'Server text, never shown' } } });
    showDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.queryByText('Server text, never shown')).not.toBeInTheDocument();
  });

  it('gives the general message when there is no answer at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    showDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Your plan could not be loaded/);
  });
});
