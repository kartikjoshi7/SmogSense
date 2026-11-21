import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './app.js';
import { checkA11y } from './test/axe.js';
import { fakeApi, memoryStore } from './test/fake-api.js';

/** How many requests went to one API path. */
function calls(fetchMock: ReturnType<typeof fakeApi>, path: string): number {
  return fetchMock.mock.calls.filter(
    ([input]) => typeof input === 'string' && input.startsWith(path),
  ).length;
}

async function startWithExampleFamily() {
  const user = userEvent.setup();
  const store = memoryStore();
  const view = render(<App store={store} />);
  await user.click(screen.getByRole('button', { name: 'Try an example family in Delhi' }));
  await user.click(screen.getByRole('button', { name: 'Show my plan' }));
  await screen.findByRole('heading', { level: 1, name: 'Today in New Delhi' });
  return { user, store, view };
}

describe('first visit', () => {
  it('starts on an accessible setup form, leaving focus at the top of the page', async () => {
    fakeApi();
    const { container } = render(<App store={memoryStore()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Set up your household' })).toBeVisible();
    expect(document.body).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('link', { name: 'Open-Meteo.com' })).toHaveAttribute(
      'href',
      'https://open-meteo.com',
    );
    expect(await checkA11y(container)).toEqual([]);
  });
});

describe('the plan', () => {
  it('shows the reading, the plan and then the AI wording for the example family', async () => {
    fakeApi();
    const { view } = await startWithExampleFamily();

    expect(await screen.findByText('AI headline: stay in today')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
    expect(screen.getByText('Right now (µg/m³)')).toBeInTheDocument();
    expect(screen.getByText('PM2.5').nextElementSibling).toHaveTextContent('316.8');
    expect(screen.getByText('SO₂').nextElementSibling).toHaveTextContent('No data');
    expect(screen.getByText(/Smog emergency: protective actions come first/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Low-emission routines/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getAllByText('Standard guidance').length).toBeGreaterThan(0);
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('saves the household on this device, names included, and restores it', async () => {
    fakeApi();
    const { store, view } = await startWithExampleFamily();
    view.unmount();

    expect(store.data.get('smogsense:v1')).toContain('"Dadaji"');
    render(<App store={store} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Today in New Delhi' }),
    ).toBeInTheDocument();
  });

  it('names the family members a recommendation is for', async () => {
    fakeApi();
    const { user } = await startWithExampleFamily();
    await user.click(screen.getByRole('tab', { name: /Protection/ }));

    expect(await screen.findByText('For Aarav, Dadaji')).toBeInTheDocument();
  });

  it('moves between categories with the arrow keys', async () => {
    fakeApi();
    const { user } = await startWithExampleFamily();
    screen.getByRole('tab', { name: /Low-emission routines/ }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /Indoor air hacks/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Community/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /Community/ })).toHaveFocus();
  });

  it('shows the forecast as a table on request', async () => {
    fakeApi();
    const { user } = await startWithExampleFamily();
    await user.click(screen.getByRole('button', { name: 'Show as a table' }));

    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(25);
    expect(screen.getByText(/Cleanest daylight hour/)).toBeInTheDocument();
  });

  it('recomputes the walk dose for another start time', async () => {
    fakeApi();
    await startWithExampleFamily();
    fireEvent.change(screen.getByRole('slider', { name: /Start time/ }), {
      target: { value: '8' },
    });

    expect(screen.getByText(/At 08:00: PM2.5 about/)).toBeInTheDocument();
  });

  it('reports a failed plan and retries', async () => {
    fakeApi({
      failures: { plan: { status: 502, error: 'Air-quality data is unavailable right now.' } },
    });
    const { user } = await startWithExampleFamily();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Air-quality data is unavailable right now.',
    );
    fakeApi();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('AI headline: stay in today')).toBeInTheDocument();
  });
});

describe('language and editing', () => {
  it('switches to Hindi, asking only for new wording, not a new plan', async () => {
    const fetchMock = fakeApi();
    const { user } = await startWithExampleFamily();
    await screen.findByText('AI headline: stay in today');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'hi');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'आज New Delhi में' }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('hi');
    await waitFor(() => {
      expect(calls(fetchMock, '/api/explain')).toBe(2);
    });
    expect(calls(fetchMock, '/api/plan')).toBe(1);
  });

  it('reopens the household form and can cancel back, moving focus to each new heading', async () => {
    fakeApi();
    const { user } = await startWithExampleFamily();
    expect(screen.getByRole('heading', { level: 1, name: 'Today in New Delhi' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Edit household' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Set up your household' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Today in New Delhi' }),
    ).toHaveFocus();
  });
});

describe('dialogs', () => {
  it('answers a suggested question in an accessible dialog and returns focus on Esc', async () => {
    fakeApi();
    const { user, view } = await startWithExampleFamily();
    const opener = screen.getByRole('button', { name: 'Ask SmogSense' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Ask SmogSense' });

    await user.click(
      within(dialog).getByRole('button', { name: 'Can the children play outside at 4 pm?' }),
    );
    expect(await within(dialog).findByText('Keep the children indoors today.')).toBeInTheDocument();
    expect(within(dialog).getByText('AI explanation')).toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside the dialog', async () => {
    fakeApi();
    const { user } = await startWithExampleFamily();
    await user.click(screen.getByRole('button', { name: 'Ask SmogSense' }));
    const dialog = await screen.findByRole('dialog');
    const close = within(dialog).getByRole('button', { name: 'Close' });

    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog).toContainElement(
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    );
    await user.tab();
    expect(close).toHaveFocus();
  });

  it('writes a community notice and copies it', async () => {
    fakeApi();
    const { user } = await startWithExampleFamily();
    await user.click(screen.getByRole('button', { name: 'Community notice' }));
    const dialog = await screen.findByRole('dialog', { name: 'Community notice' });
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Who is it for?' }),
      'school',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create notice' }));

    expect(
      await within(dialog).findByText('Dear residents, please stay indoors.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe('Dear residents, please stay indoors.');
    expect(within(dialog).getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
