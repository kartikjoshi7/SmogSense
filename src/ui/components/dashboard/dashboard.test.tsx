import { act, render, screen } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeAir } from '../../../core/fixtures/air.js';
import { buildPlan } from '../../../core/plan.js';
import type { AirData } from '../../../shared/air.js';
import { AppProvider } from '../../state/app-context.js';
import { checkA11y } from '../../test/axe.js';
import { fakeApi, memoryStore } from '../../test/fake-api.js';
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
    const view = showDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.queryByText('Server text, never shown')).not.toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
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

/** The plan the engine builds for the example family from this air data. */
function planFrom(air: AirData) {
  const result = buildPlan(DEMO_HOUSEHOLD.profile, air);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('Dashboard loading', () => {
  it('announces that the plan is loading, outside any busy region', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    showDashboard();
    const status = screen.getByRole('status');

    expect(status).toHaveTextContent('Building your plan…');
    expect(status.closest('[aria-busy="true"]')).toBeNull();
  });
});

describe('Dashboard requests', () => {
  it('never shows a slow plan for a place the household has already left', async () => {
    const delhi = planFrom(makeAir());
    const mumbai = planFrom(makeAir({ scale: 2.4 }));
    expect(delhi.index.value).not.toBe(mumbai.index.value);
    const answers: ((body: unknown) => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (path: string) =>
          new Promise<Response>((resolve) => {
            if (path === '/api/plan') {
              answers.push((body) => {
                resolve(Response.json(body));
              });
            }
          }),
      ),
    );
    const store = memoryStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProvider store={store}>{children}</AppProvider>
    );
    const dashboard = (label: string) => (
      <Dashboard
        household={DEMO_HOUSEHOLD}
        location={{ ...DEMO_LOCATION, lat: label === 'Mumbai' ? 19.07 : DEMO_LOCATION.lat, label }}
        headingRef={createRef<HTMLHeadingElement>()}
      />
    );
    const view = render(dashboard('New Delhi'), { wrapper });
    view.rerender(dashboard('Mumbai'));

    await act(async () => {
      answers[1]?.({ plan: mumbai });
      await Promise.resolve();
    });
    const shown = { selector: '.aqi-number' };
    expect(await screen.findByText(String(mumbai.index.value), shown)).toBeInTheDocument();
    await act(async () => {
      answers[0]?.({ plan: delhi });
      await Promise.resolve();
    });

    expect(screen.queryByText(String(delhi.index.value), shown)).not.toBeInTheDocument();
    expect(screen.getByText(String(mumbai.index.value), shown)).toBeInTheDocument();
    // The number is never shown without the scale it is on.
    expect(screen.getByText('India AQI')).toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
  });
});
