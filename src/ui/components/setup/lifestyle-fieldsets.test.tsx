import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { checkA11y } from '../../test/axe.js';
import { renderInApp } from '../../test/render.js';
import { EMPTY_PROFILE } from './defaults.js';
import { CommuteFieldset, ExerciseFieldset, HomeFieldset } from './lifestyle-fieldsets.js';

const VALID = new Set<string>();
const { commute, exercise, home } = EMPTY_PROFILE;

function renderCommute(invalid = VALID) {
  const onChange = vi.fn();
  const view = renderInApp(
    <CommuteFieldset value={commute} invalid={invalid} onChange={onChange} />,
  );
  return { onChange, view };
}

function renderExercise(value = exercise) {
  const onChange = vi.fn();
  renderInApp(
    <ExerciseFieldset
      value={value}
      memberOptions={{ '': 'The whole family', m1: 'Riya' }}
      invalid={VALID}
      onChange={onChange}
    />,
  );
  return onChange;
}

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

describe('CommuteFieldset', () => {
  it.each([
    ['Usual way to travel', 'metro', { mode: 'metro' }],
    ['One-way distance (km)', '12', { oneWayKm: 12 }],
    ['Commuting days per week', '3', { daysPerWeek: 3 }],
    ['Leave at', '7', { departHour: 7 }],
    ['Come back at', '19', { returnHour: 19 }],
  ])('reports a new "%s"', (label, value, patch) => {
    const { onChange } = renderCommute();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expect(onChange).toHaveBeenCalledWith(patch);
  });

  it('adds a ticked alternative to the list', () => {
    const { onChange } = renderCommute();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Carpool' }));

    expect(onChange).toHaveBeenCalledWith({ alternatives: ['carpool'] });
  });

  it('links a range message to an invalid distance, with no axe violations', async () => {
    const { view } = renderCommute(new Set(['commute.oneWayKm', 'commute.daysPerWeek']));

    expect(screen.getByLabelText('One-way distance (km)')).toHaveAccessibleDescription(
      'Enter a number from 0 to 100.',
    );
    expect(screen.getByLabelText('Commuting days per week')).toHaveAccessibleDescription(
      'Enter a number from 0 to 7.',
    );
    expect(await checkA11y(view.container)).toEqual([]);
  });
});

describe('ExerciseFieldset', () => {
  it.each([
    ['Activity', 'run', { activity: 'run' }],
    ['Who exercises', 'm1', { memberId: 'm1' }],
    ['Usual start time', '18', { usualHour: 18 }],
    ['Duration (minutes)', '45', { durationMin: 45 }],
  ])('reports a new "%s"', (label, value, patch) => {
    const onChange = renderExercise();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expect(onChange).toHaveBeenCalledWith(patch);
  });

  it('means the whole family when no one person is chosen', () => {
    const onChange = renderExercise({ ...exercise, memberId: 'm1' });
    fireEvent.change(screen.getByLabelText('Who exercises'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({ memberId: null });
  });

  it('reports whether the exercise can move indoors', () => {
    const onChange = renderExercise();
    fireEvent.click(screen.getByRole('checkbox', { name: 'This can be done indoors' }));

    expect(onChange).toHaveBeenCalledWith({ canMoveIndoors: false });
  });
});

describe('HomeFieldset', () => {
  it.each([
    ['Air purifiers', '1', { purifierCount: 1 }],
    ['Purifier clean-air rate (m³/h)', '300', { purifierCadrM3h: 300 }],
    ['Main room size (m²)', '20', { roomAreaM2: 20 }],
    ['How draughty is it?', 'leaky', { airtightness: 'leaky' }],
    ['Cooking fuel', 'induction', { cookingFuel: 'induction' }],
    ['Incense, dhoop or mosquito coils', 'daily', { incense: 'daily' }],
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

  it('explains the allowed range for each invalid room number', () => {
    renderHome(new Set(['home.purifierCount', 'home.purifierCadrM3h', 'home.roomAreaM2']));

    expect(screen.getByLabelText('Air purifiers')).toHaveAccessibleDescription(
      'Enter a number from 0 to 5.',
    );
    expect(screen.getByLabelText('Purifier clean-air rate (m³/h)')).toHaveAccessibleDescription(
      'Enter a number from 50 to 1000.',
    );
    expect(screen.getByLabelText('Main room size (m²)')).toHaveAccessibleDescription(
      'Enter a number from 5 to 60.',
    );
  });
});
