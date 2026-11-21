import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { checkA11y } from '../../test/axe.js';
import { Dialog } from './dialog.js';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      {open ? (
        <Dialog
          title="Settings"
          closeLabel="Close"
          onClose={() => {
            setOpen(false);
          }}
        >
          <label>
            Name <input />
          </label>
          <button type="button">Save</button>
        </Dialog>
      ) : null}
    </>
  );
}

async function openDialog() {
  const user = userEvent.setup();
  const view = render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const dialog = screen.getByRole('dialog', { name: 'Settings' });
  return { user, view, dialog };
}

describe('Dialog', () => {
  it('is a labelled modal dialog with focus on its first control', async () => {
    const { view, dialog } = await openDialog();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('wraps Tab from the last control to the first, and Shift+Tab back', async () => {
    const { user } = await openDialog();
    screen.getByRole('button', { name: 'Save' }).focus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('moves between controls inside the dialog normally', async () => {
    const { user } = await openDialog();

    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('pulls focus back inside when it has escaped the dialog', async () => {
    const { user } = await openDialog();
    screen.getByRole('button', { name: 'Open' }).focus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('closes on Esc and returns focus to the button that opened it', async () => {
    const { user } = await openDialog();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('closes from its close button', async () => {
    const { user } = await openDialog();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
