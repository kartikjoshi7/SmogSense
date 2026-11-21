import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { chatRequestSchema } from '../../../shared/api.js';
import { checkA11y } from '../../test/axe.js';
import { fakeApi } from '../../test/fake-api.js';
import type { FakeApiOptions } from '../../test/fake-server.js';
import { renderInApp } from '../../test/render.js';
import { DEMO_HOUSEHOLD, DEMO_LOCATION } from '../setup/defaults.js';
import { ChatDialog } from './chat-dialog.js';

const REQUEST = {
  profile: DEMO_HOUSEHOLD.profile,
  location: { lat: DEMO_LOCATION.lat, lon: DEMO_LOCATION.lon },
};

function openChat(options: FakeApiOptions = {}) {
  const fetchMock = fakeApi(options);
  const user = userEvent.setup();
  const view = renderInApp(<ChatDialog request={REQUEST} onClose={vi.fn()} />);
  const ask = async (question: string) => {
    await user.type(screen.getByRole('textbox', { name: 'Your question' }), question);
    await user.click(screen.getByRole('button', { name: 'Send' }));
  };
  /** The validated body of the n-th chat request. */
  const sent = (n: number) => {
    const body = fetchMock.mock.calls[n]?.[1]?.body;
    return chatRequestSchema.parse(typeof body === 'string' ? JSON.parse(body) : null);
  };
  return { ask, sent, view, user };
}

describe('ChatDialog', () => {
  it('answers a typed question, tagged as AI, and clears the box', async () => {
    const { ask, view } = openChat();
    await ask('Is the metro safer than the car?');

    expect(await screen.findByText('Keep the children indoors today.')).toBeInTheDocument();
    expect(screen.getByText('Is the metro safer than the car?')).toBeInTheDocument();
    expect(screen.getByText('AI explanation')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveValue('');
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('announces the first answer and keeps focus in the dialog after a suggestion', async () => {
    const { user } = openChat();
    const conversation = screen.getByRole('list', { name: 'Conversation' });
    expect(conversation).toHaveAttribute('aria-live', 'polite');
    await user.click(screen.getByRole('button', { name: 'Is it safe to open the windows today?' }));

    expect(await screen.findByText('Keep the children indoors today.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Conversation' })).toBe(conversation);
    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveFocus();
  });

  it('sends the earlier turns with a follow-up question', async () => {
    const { ask, sent } = openChat();
    await ask('First question');
    await screen.findByText('Keep the children indoors today.');
    await ask('Second question');
    await screen.findByText('Second question');

    expect(sent(1)).toMatchObject({
      question: 'Second question',
      lang: 'en',
      history: [
        { role: 'user', text: 'First question' },
        { role: 'assistant', text: 'Keep the children indoors today.' },
      ],
    });
  });

  it('counts characters and only sends a real question', async () => {
    openChat();
    const user = userEvent.setup();
    const box = screen.getByRole('textbox', { name: 'Your question' });

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(box).toHaveAccessibleDescription('0 of 500 characters');
    await user.type(box, '   ');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('keeps the question and says so when the assistant cannot answer', async () => {
    const { ask } = openChat({ failures: { chat: { status: 503, error: 'Busy' } } });
    await ask('Can we go out?');

    expect(
      await screen.findByText('The assistant could not answer. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveValue('Can we go out?');
  });

  it('labels an answer written without the AI as standard guidance', async () => {
    const { ask } = openChat({ ai: false });
    await ask('What should we do today?');

    expect(await screen.findByText('Standard guidance')).toBeInTheDocument();
  });
});
