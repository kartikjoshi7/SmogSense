/** The setup steps about the commute and exercise. */
import { PROFILE_LIMITS } from '../../../shared/limits.js';
import type { Commute, Exercise } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';
import { CheckboxField, CheckboxGroup } from '../common/checkbox-fields.js';
import { HourField, NumberField, SelectField } from '../common/fields.js';
import { fieldSetter, useRangeError, type Section } from './setup-section.js';
import { StepLegend } from './step-legend.js';

function CommuteTrip({ value, invalid, onChange }: Section<Commute>) {
  const set = fieldSetter(onChange);
  const t = useMessages();
  const error = useRangeError(invalid);
  return (
    <>
      <SelectField
        label={t.setup.commute.mode}
        value={value.mode}
        options={t.options.commuteMode}
        onChange={set('mode')}
      />
      <NumberField
        label={t.setup.commute.km}
        value={value.oneWayKm}
        range={PROFILE_LIMITS.oneWayKm}
        error={error('commute.oneWayKm', PROFILE_LIMITS.oneWayKm)}
        onChange={set('oneWayKm')}
      />
      <NumberField
        label={t.setup.commute.days}
        value={value.daysPerWeek}
        range={PROFILE_LIMITS.daysPerWeek}
        error={error('commute.daysPerWeek', PROFILE_LIMITS.daysPerWeek)}
        onChange={set('daysPerWeek')}
      />
    </>
  );
}

/** How the household commutes, when, and which alternatives it could use. */
export function CommuteFieldset(section: Section<Commute>) {
  const t = useMessages();
  const { value, onChange } = section;
  const set = fieldSetter(onChange);
  return (
    <fieldset className="card grid gap-3 sm:grid-cols-2">
      <StepLegend step={3}>{t.setup.commute.legend}</StepLegend>
      <CommuteTrip {...section} />
      <HourField
        label={t.setup.commute.depart}
        value={value.departHour}
        onChange={set('departHour')}
      />
      <HourField
        label={t.setup.commute.return}
        value={value.returnHour}
        onChange={set('returnHour')}
      />
      <CheckboxGroup
        legend={t.setup.commute.alternatives}
        options={t.options.alternative}
        values={value.alternatives}
        onChange={set('alternatives')}
      />
    </fieldset>
  );
}

/** When the exercise usually starts and how long it lasts. */
function ExerciseTiming({ value, invalid, onChange }: Section<Exercise>) {
  const t = useMessages().setup.exercise;
  const set = fieldSetter(onChange);
  const error = useRangeError(invalid);
  return (
    <>
      <HourField label={t.hour} value={value.usualHour} onChange={set('usualHour')} />
      <NumberField
        label={t.minutes}
        value={value.durationMin}
        range={PROFILE_LIMITS.durationMin}
        error={error('exercise.durationMin', PROFILE_LIMITS.durationMin)}
        onChange={set('durationMin')}
      />
    </>
  );
}

interface ExerciseFieldsetProps extends Section<Exercise> {
  readonly memberOptions: Readonly<Record<string, string>>;
}

/** The usual exercise: what, who, when and for how long. */
export function ExerciseFieldset({ memberOptions, ...section }: ExerciseFieldsetProps) {
  const t = useMessages();
  const { value, onChange } = section;
  const set = fieldSetter(onChange);
  return (
    <fieldset className="card grid gap-3 sm:grid-cols-2">
      <StepLegend step={4}>{t.setup.exercise.legend}</StepLegend>
      <SelectField
        label={t.setup.exercise.activity}
        value={value.activity}
        options={t.options.activity}
        onChange={set('activity')}
      />
      <SelectField
        label={t.setup.exercise.who}
        value={value.memberId ?? ''}
        options={memberOptions}
        onChange={(id) => {
          onChange({ memberId: id === '' ? null : id });
        }}
      />
      <ExerciseTiming {...section} />
      <CheckboxField
        label={t.setup.exercise.indoors}
        checked={value.canMoveIndoors}
        onChange={set('canMoveIndoors')}
      />
    </fieldset>
  );
}
