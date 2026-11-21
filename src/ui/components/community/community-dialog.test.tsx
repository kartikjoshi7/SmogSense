import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { communityRequestSchema } from '../../../shared/api.js';
import { checkA11y } from '../../test/axe.js';
import { fakeApi } from '../../test/fake-api.js';
import type { FakeApiOptions } from '../../test/fake-server.js';
import { renderInApp } from '../../test/render.js';
import { DEMO_HOUSEHOLD, DEMO_LOCATION } from '../setup/defaults.js';
import { CommunityDialog } from './community-dialog.js';

const REQUEST = {
  profile: DEMO_HOUSEHOLD.profile,
  location: { lat: DEMO_LOCATION.lat, lon: DEMO_LOCATION.lon },
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
});

function openNotice(options: FakeApiOptions = {}) {
  const fetchMock = fakeApi(options);
  const user = userEvent.setup();
  const view = renderInApp(<CommunityDialog request={REQUEST} onClose={vi.fn()} />);
  const create = () => user.click(screen.getByRole('button', { name: 'Create notice' }));
  const sent = () => {
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    return communityRequestSchema.parse(typeof body === 'string' ? JSON.parse(body) : null);
  };
  return { user, view, create, sent };
}

describe('CommunityDialog', () => {
  it('writes the notice for the chosen audience in the chosen language', async () => {
    const { user, view, create, sent } = openNotice();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Who is it for?' }), 'workplace');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Language of the notice' }),
      'தமிழ்',
    );
    await create();

    expect(await screen.findByText('Dear residents, please stay indoors.')).toBeInTheDocument();
    expect(sent()).toMatchObject({ audience: 'workplace', lang: 'ta' });
    expect(screen.getByText('AI explanation')).toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('offers to share the notice where the device can share', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { user, create } = openNotice();
    await create();
    await user.click(await screen.findByRole('button', { name: 'Share' }));

    expect(share).toHaveBeenCalledWith({ text: 'Dear residents, please stay indoors.' });
  });

  it('has no share button where the device cannot share', async () => {
    const { create } = openNotice();
    await create();
    await screen.findByRole('button', { name: 'Copy' });

    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('writes a standard notice, labelled as such, when the AI is off', async () => {
    const { create } = openNotice({ ai: false });
    await create();

    expect(await screen.findByText('Standard guidance')).toBeInTheDocument();
  });

  it('says so when the notice cannot be created', async () => {
    const { create } = openNotice({ failures: { community: { status: 502, error: 'Down' } } });
    await create();

    expect(
      await screen.findByText('The notice could not be created. Please try again.'),
    ).toBeInTheDocument();
  });
});
