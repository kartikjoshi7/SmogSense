import { useId, useState } from 'react';
import { AGE_FACTOR, EXERCISE_BREATHING_M3H } from '../../../core/constants.js';
import { clock } from '../../../core/explain/format.js';
import { inhaledDoseUg } from '../../../core/exposure.js';
import type { Plan } from '../../../shared/plan.js';
import type { Exercise, Member } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';

/** PM2.5 inhaled in one session at a given hour, computed in the browser with the engine. */
function sessionDose(plan: Plan, exercise: Exercise, members: readonly Member[], hour: number) {
  const pm25 = plan.forecast.find((p) => p.hour === hour)?.pm25 ?? null;
  if (pm25 === null) {
    return null;
  }
  const member = members.find((m) => m.id === exercise.memberId);
  const dose = inhaledDoseUg({
    concentration: pm25,
    hours: exercise.durationMin / 60,
    breathingM3h: EXERCISE_BREATHING_M3H[exercise.activity],
    ageFactor: member === undefined ? 1 : AGE_FACTOR[member.ageGroup],
  });
  return { pm25, dose };
}

/** "What if we went at another time?" — move a slider and see the dose change instantly. */
export function WhatIf({
  plan,
  exercise,
  members,
}: {
  readonly plan: Plan;
  readonly exercise: Exercise;
  readonly members: readonly Member[];
}) {
  const t = useMessages().whatIf;
  const sliderId = useId();
  const [hour, setHour] = useState(exercise.usualHour);
  const chosen = sessionDose(plan, exercise, members, hour);
  const usual = sessionDose(plan, exercise, members, exercise.usualHour);
  return (
    <section aria-labelledby="whatif-heading" className="card grid gap-2">
      <h2 id="whatif-heading" className="text-xl font-semibold">
        {t.title}
      </h2>
      <label htmlFor={sliderId}>
        {t.label}: {clock(hour)}
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={23}
        step={1}
        value={hour}
        aria-valuetext={clock(hour)}
        onChange={(e) => {
          setHour(e.target.valueAsNumber);
        }}
      />
      <p aria-live="polite">
        {chosen === null || usual === null
          ? t.noData
          : t.result(clock(hour), chosen.pm25, chosen.dose, usual.dose)}
      </p>
    </section>
  );
}
