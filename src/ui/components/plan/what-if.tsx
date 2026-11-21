import { useId, useState } from 'react';
import { clock } from '../../../core/explain/format.js';
import { exerciseDoseUg } from '../../../core/exposure.js';
import { activityMeanPm25 } from '../../../core/windows.js';
import type { Plan } from '../../../shared/plan.js';
import { CLOCK_HOURS } from '../../../shared/limits.js';
import type { Exercise, Member } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';

/**
 * Mean PM2.5 over a session starting at `hour` and the dose it gives, computed in the browser
 * with the same engine functions as the plan's exercise advice. Null when the forecast does not
 * cover the whole session.
 */
function sessionAt(plan: Plan, exercise: Exercise, members: readonly Member[], hour: number) {
  const start = plan.forecast.findIndex((p) => p.hour === hour);
  const pm25 = start === -1 ? null : activityMeanPm25(plan.forecast, start, exercise.durationMin);
  return pm25 === null
    ? null
    : { pm25: Math.round(pm25), dose: exerciseDoseUg(exercise, members, pm25) };
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
  const chosen = sessionAt(plan, exercise, members, hour);
  const usual = sessionAt(plan, exercise, members, exercise.usualHour);
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
        min={CLOCK_HOURS.min}
        max={CLOCK_HOURS.max}
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
