import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_PROFILE } from '../../../core/empty-profile.js';
import { renderInApp } from '../../test/render.js';
import { HomeFieldset } from './home-fieldset.js';

const VALID = new Set<string>();
const { home } = EMPTY_PROFILE;

function renderHome(invalid = VALID) {
  const onChange = vi.fn();
  const onMaskChange = vi.fn();
  renderInApp(
    <HomeFieldset
      value={home}
      mask="none"
      invalid={invalid}
      onChange={onChange}
      onMaskChange={onMaskChange}
    />,
  );
  return { onChange, onMaskChange };
}

describe('HomeFieldset', () => {
  it.each([
    ['Air purifiers', '1', { purifierCount: 1 }],
    ['Purifier clean-air rate (m³/h)', '300', { purifierCadrM3h: 300 }],
    ['Main room size (m²)', '20', { roomAreaM2: 20 }],
    ['How draughty is it?', 'leaky', { airtightness: 'leaky' }],
    ['Cooking fuel', 'induction', { cookingFuel: 'induction' }],
    ['Incense, dhoop or mosquito coils', 'daily', { incense: 'daily' }],
    ['How you heat the main room in winter', 'coal_wood', { heating: 'coal_wood' }],
  ])('reports a new "%s"', (label, value, patch) => {
    const { onChange } = renderHome();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expect(onChange).toHaveBeenCalledWith(patch);
  });

  it.each([
    ['Kitchen has an exhaust fan or chimney', { hasExhaustOrChimney: false }],
    ['Someone smokes indoors', { indoorSmoking: true }],
  ])('reports a toggled "%s"', (name, patch) => {
    const { onChange } = renderHome();
    fireEvent.click(screen.getByRole('checkbox', { name }));

    expect(onChange).toHaveBeenCalledWith(patch);
  });

  it('reports the usual mask separately from the home', () => {
    const { onChange, onMaskChange } = renderHome();
    fireEvent.change(screen.getByLabelText('Mask you usually wear'), { target: { value: 'n95' } });

    expect(onMaskChange).toHaveBeenCalledWith('n95');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains the allowed range for each invalid room number, whole numbers as such', () => {
    renderHome(new Set(['home.purifierCount', 'home.purifierCadrM3h', 'home.roomAreaM2']));

    expect(screen.getByLabelText('Air purifiers')).toHaveAccessibleDescription(
      'Enter a whole number from 0 to 5.',
    );
    expect(screen.getByLabelText('Air purifiers')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Main room size (m²)')).toHaveAttribute('step', 'any');
    expect(screen.getByLabelText('Purifier clean-air rate (m³/h)')).toHaveAccessibleDescription(
      'Enter a number from 50 to 1000.',
    );
    expect(screen.getByLabelText('Main room size (m²)')).toHaveAccessibleDescription(
      'Enter a number from 5 to 60.',
    );
  });
});
