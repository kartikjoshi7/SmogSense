import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { checkA11y } from '../../test/axe.js';
import { renderInApp } from '../../test/render.js';
import { ReadAloudButton } from './read-aloud.js';

/** A stand-in for the Web Speech API, which jsdom does not provide. */
function stubSpeech() {
  const utterances: FakeUtterance[] = [];
  class FakeUtterance {
    readonly text: string;
    lang = '';
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
      utterances.push(this);
    }
  }
  const synth = { speak: vi.fn(), cancel: vi.fn() };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { synth, utterances };
}

describe('ReadAloudButton', () => {
  it('is not shown where the browser cannot speak', () => {
    renderInApp(<ReadAloudButton text="Close the windows." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reads the text in Indian English and stops on a second press', async () => {
    const user = userEvent.setup();
    const { synth, utterances } = stubSpeech();
    renderInApp(<ReadAloudButton text="Close the windows." />);
    await user.click(screen.getByRole('button', { name: 'Read aloud' }));

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(utterances[0]).toMatchObject({ text: 'Close the windows.', lang: 'en-IN' });
    await user.click(screen.getByRole('button', { name: 'Stop reading' }));
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeInTheDocument();
  });

  it('offers to read again when speech finishes on its own', async () => {
    const user = userEvent.setup();
    const { utterances } = stubSpeech();
    renderInApp(<ReadAloudButton text="Close the windows." />);
    await user.click(screen.getByRole('button', { name: 'Read aloud' }));
    act(() => {
      utterances[0]?.onend?.();
    });

    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeInTheDocument();
  });

  it('offers to read again when speech fails or another card interrupts it', async () => {
    const user = userEvent.setup();
    const { utterances } = stubSpeech();
    renderInApp(<ReadAloudButton text="Close the windows." />);
    await user.click(screen.getByRole('button', { name: 'Read aloud' }));
    act(() => {
      utterances[0]?.onerror?.();
    });

    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeInTheDocument();
  });

  it('uses a Hindi voice when the interface is in Hindi', async () => {
    const user = userEvent.setup();
    const { utterances } = stubSpeech();
    renderInApp(<ReadAloudButton text="खिड़कियाँ बंद रखें।" />, 'hi');
    await user.click(screen.getByRole('button', { name: 'पढ़कर सुनाएँ' }));

    expect(utterances[0]?.lang).toBe('hi-IN');
    expect(screen.getByRole('button', { name: 'पढ़ना रोकें' })).toBeInTheDocument();
  });

  it('names what it reads, keeping the visible words in the name', async () => {
    stubSpeech();
    const view = renderInApp(
      <ReadAloudButton text="Close the windows." subject="Keep windows shut" />,
    );

    expect(
      screen.getByRole('button', { name: 'Read aloud: Keep windows shut' }),
    ).toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('stops speaking when it leaves the page', () => {
    const { synth } = stubSpeech();
    const view = renderInApp(<ReadAloudButton text="Close the windows." />);
    view.unmount();

    expect(synth.cancel).toHaveBeenCalled();
  });
});
