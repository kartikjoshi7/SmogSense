import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeAir } from '../../../core/fixtures/air.js';
import { HEALTHY_COUPLE, SHARMA_FAMILY } from '../../../core/fixtures/profiles.js';
import { findRecommendation } from '../../../core/fixtures/recommendations.js';
import { buildPlan } from '../../../core/plan.js';
import type { Plan } from '../../../shared/plan.js';
import type { Profile } from '../../../shared/profile.js';
import { checkA11y } from '../../test/axe.js';
import { renderInApp } from '../../test/render.js';
import { WhatIf } from './what-if.js';

/** A run of 90 minutes, so each session spans two forecast hours. */
const LONG_RUN: Profile = {
  ...HEALTHY_COUPLE,
  exercise: { ...HEALTHY_COUPLE.exercise, durationMin: 90 },
};

function planOnPoorDay(): Plan {
  const result = buildPlan(LONG_RUN, makeAir({ scale: 0.8 }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function show(plan: Plan) {
  const view = renderInApp(
    <WhatIf plan={plan} exercise={LONG_RUN.exercise} members={LONG_RUN.members} />,
  );
  const moveTo = (hour: number) => {
    fireEvent.change(screen.getByRole('slider', { name: 'Start time' }), {
      target: { value: String(hour) },
    });
  };
  return { view, moveTo };
}

describe('WhatIf', () => {
  it('gives the same usual-time dose as the plan’s advice to exercise indoors', () => {
    const result = buildPlan(SHARMA_FAMILY, makeAir({ scale: 2.4 }));
    if (!result.ok) {
      throw new Error(result.error);
    }
    const indoors = findRecommendation(result.value, 'exercise_indoors');
    expect(indoors).toBeDefined();
    renderInApp(
      <WhatIf
        plan={result.value}
        exercise={SHARMA_FAMILY.exercise}
        members={SHARMA_FAMILY.members}
      />,
    );

    expect(
      screen.getByText(`(usual time: ${String(indoors?.impact.doseBeforeUg)} µg)`, {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('gives the same doses as the plan’s own exercise advice, over the whole session', async () => {
    const plan = planOnPoorDay();
    const advice = findRecommendation(plan, 'exercise_window');
    expect(advice).toBeDefined();
    const { view, moveTo } = show(plan);
    moveTo(Number(advice?.facts.bestHour));

    const dose = advice?.impact;
    expect(
      screen.getByText(
        `about ${String(dose?.doseAfterUg)} µg inhaled (usual time: ${String(dose?.doseBeforeUg)} µg)`,
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('says so when the forecast ends before the session would', () => {
    const plan = planOnPoorDay();
    const { moveTo } = show(plan);
    moveTo(plan.forecast.at(-1)?.hour ?? 0);

    expect(
      screen.getByText('The forecast does not cover a whole session at this time.'),
    ).toBeInTheDocument();
  });
});
