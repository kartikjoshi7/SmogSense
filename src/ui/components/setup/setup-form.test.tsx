import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../app.js';
import { checkA11y } from '../../test/axe.js';
import { fakeApi, memoryStore } from '../../test/fake-api.js';
import type { FakeApiOptions } from '../../test/fake-server.js';
import { DEMO_HOUSEHOLD, DEMO_LOCATION, nextMemberId } from './defaults.js';

function setup(options: FakeApiOptions = {}, store = memoryStore()) {
  const fetchMock = fakeApi(options);
  const user = userEvent.setup();
  render(<App store={store} />);
  return Object.assign(user, { fetchMock });
}

/** Browser storage holding a saved household and place, as after a first visit. */
function savedStore() {
  const saved = { lang: 'en', household: DEMO_HOUSEHOLD, location: DEMO_LOCATION };
  return memoryStore({ 'smogsense:v1': JSON.stringify(saved) });
}

describe('setup form', () => {
  it('finds a city by search and announces the choice', async () => {
    const user = setup();
    await user.type(
      screen.getByRole('searchbox', { name: 'Search for a city or town' }),
      'Guru{Enter}',
    );
    await user.click(await screen.findByRole('button', { name: 'Use Gurugram, Haryana, India' }));

    expect(screen.getByText('Location: Gurugram, Haryana, India')).toBeInTheDocument();
  });

  it('tells a failed search apart from a search that found nothing', async () => {
    const user = setup({ failures: { geocode: { status: 502, error: 'Down' } } });
    await user.type(
      screen.getByRole('searchbox', { name: 'Search for a city or town' }),
      'Guru{Enter}',
    );

    expect(await screen.findByText(/City search is unavailable right now/)).toBeInTheDocument();
    expect(screen.queryByText(/No places found/)).not.toBeInTheDocument();
  });

  it('still reports a failed search when editing a household that has a place', async () => {
    const user = setup({ failures: { geocode: { status: 502, error: 'Down' } } }, savedStore());
    await user.click(await screen.findByRole('button', { name: 'Edit household' }));
    expect(screen.getByText(`Location: ${DEMO_LOCATION.label}`)).toBeInTheDocument();
    await user.type(
      screen.getByRole('searchbox', { name: 'Search for a city or town' }),
      'Guru{Enter}',
    );

    expect(await screen.findByText(/City search is unavailable right now/)).toBeInTheDocument();
  });

  it('only searches once the query is long enough, by button or Enter', async () => {
    const user = setup();
    const box = screen.getByRole('searchbox', { name: 'Search for a city or town' });
    await user.type(box, 'G{Enter}');

    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    expect(user.fetchMock).not.toHaveBeenCalled();
    expect(box).toHaveAttribute('maxLength', '60');
  });

  it('uses the device location when allowed, and explains when it is not', async () => {
    const user = setup();
    const getCurrentPosition = vi.fn(
      (ok: PositionCallback, fail?: PositionErrorCallback | null) => {
        fail?.({ code: 1 } as GeolocationPositionError);
        ok({ coords: { latitude: 28.5, longitude: 77.1 } } as GeolocationPosition);
      },
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    await user.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(screen.getByText('Location: My current location')).toBeInTheDocument();
  });

  it('asks for a location and valid numbers before building a plan', async () => {
    const user = setup();
    const distance = screen.getByRole('spinbutton', { name: 'One-way distance (km)' });
    await user.clear(distance);
    await user.type(distance, '500');
    await user.click(screen.getByRole('button', { name: 'Show my plan' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.');
    expect(screen.getByText('Choose a location first.')).toBeInTheDocument();
    expect(distance).toHaveAttribute('aria-invalid', 'true');
    expect(distance).toHaveAccessibleDescription('Enter a number from 0 to 100.');
  });

  it('adds and removes family members, keeping names on the device', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Add a family member' }));
    const names = screen.getAllByRole('textbox', { name: 'Name (stays on this device)' });
    await user.type(names[1] ?? names[0] ?? document.body, 'Meera');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Who exercises' }), 'm2');
    await user.click(screen.getByRole('button', { name: 'Remove Meera' }));

    expect(screen.getAllByRole('textbox', { name: 'Name (stays on this device)' })).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Who exercises' })).toHaveValue('');
  });

  it('marks conditions and alternatives with labelled checkboxes', async () => {
    const user = setup();
    const conditions = screen.getByRole('group', { name: 'Health conditions' });
    await user.click(within(conditions).getByRole('checkbox', { name: 'Asthma' }));
    await user.click(within(conditions).getByRole('checkbox', { name: 'Asthma' }));

    expect(within(conditions).getByRole('checkbox', { name: 'Asthma' })).not.toBeChecked();
  });

  it('has no accessibility violations with errors showing', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Show my plan' }));

    expect(await checkA11y(document.body)).toEqual([]);
  });
});

describe('nextMemberId', () => {
  it('never reuses an id that is still in use', () => {
    expect(
      nextMemberId([
        { id: 'm1', ageGroup: 'adult', conditions: [] },
        { id: 'm3', ageGroup: 'child', conditions: [] },
      ]),
    ).toBe('m4');
  });
});
