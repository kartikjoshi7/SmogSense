import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './app.js';
import { checkA11y } from './test/axe.js';

describe('App shell', () => {
  it('renders the skip link and allows keyboard focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    await user.tab();
    expect(skipLink).toHaveFocus();
  });

  it('renders the header with app name', () => {
    render(<App />);
    expect(screen.getByText('SmogSense', { selector: '.app-title' })).toBeInTheDocument();
  });

  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'SmogSense' })).toBeInTheDocument();
  });

  it('renders the footer with Open-Meteo attribution', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: /Open-Meteo/i });
    expect(link).toHaveAttribute('href', 'https://open-meteo.com');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<App />);
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });
});
