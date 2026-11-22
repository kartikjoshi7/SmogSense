import { PROFILE_LIMITS } from '../../../shared/limits.js';
import type { Commute, Exercise } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';
import {
  CheckboxField,
  CheckboxGroup,
  HourField,
  NumberField,
  SelectField,
  StepLegend,
} from '../common/fields.js';
import { useRangeError, type Section } from './field-section.js';

function CommuteTrip({ value, invalid, onChange }: Section<Commute>) {
  const t = useMessages();
  const error = useRangeError(invalid);
  return (
    <>
      <SelectField
        label={t.setup.commute.mode}
        value={value.mode}
        options={t.options.commuteMode}
        onChange={(mode) => {
          onChange({ mode });
        }}
      />
      <NumberField
        label={t.setup.commute.km}
        value={value.oneWayKm}
        range={PROFILE_LIMITS.oneWayKm}
        error={error('commute.oneWayKm', PROFILE_LIMITS.oneWayKm)}
        onChange={(oneWayKm) => {
          onChange({ oneWayKm });
        }}
      />
      <NumberField
        label={t.setup.commute.days}
        value={value.daysPerWeek}
        range={PROFILE_LIMITS.daysPerWeek}
        error={error('commute.daysPerWeek', PROFILE_LIMITS.daysPerWeek)}
        onChange={(daysPerWeek) => {
          onChange({ daysPerWeek });
        }}
      />
    </>
  );
}

/** How the household commutes, when, and which alternatives it could use. */
export function CommuteFieldset(props: Section<Commute>) {
  const t = useMessages();
  const { value, onChange } = props;
  return (
    <fieldset className="card grid gap-3 sm:grid-cols-2">
      <StepLegend step={3}>{t.setup.commute.legend}</StepLegend>
      <CommuteTrip {...props} />
      <HourField
        label={t.setup.commute.depart}
        value={value.departHour}
        onChange={(departHour) => {
          onChange({ departHour });
        }}
      />
      <HourField
        label={t.setup.commute.return}
        value={value.returnHour}
        onChange={(returnHour) => {
          onChange({ returnHour });
        }}
      />
      <CheckboxGroup
        legend={t.setup.commute.alternatives}
        options={t.options.alternative}
        values={value.alternatives}
        onChange={(alternatives) => {
          onChange({ alternatives });
        }}
      />
    </fieldset>
  );
}

/** The usual exercise: what, who, when and for how long. */
export function ExerciseFieldset({
  memberOptions,
  ...section
}: Section<Exercise> & { readonly memberOptions: Readonly<Record<string, string>> }) {
  const t = useMessages();
  const { value, onChange } = section;
  const error = useRangeError(section.invalid);
  return (
    <fieldset className="card grid gap-3 sm:grid-cols-2">
      <StepLegend step={4}>{t.setup.exercise.legend}</StepLegend>
      <SelectField
        label={t.setup.exercise.activity}
        value={value.activity}
        options={t.options.activity}
        onChange={(activity) => {
          onChange({ activity });
        }}
      />
      <SelectField
        label={t.setup.exercise.who}
        value={value.memberId ?? ''}
        options={memberOptions}
        onChange={(id) => {
          onChange({ memberId: id === '' ? null : id });
        }}
      />
      <HourField
        label={t.setup.exercise.hour}
        value={value.usualHour}
        onChange={(usualHour) => {
          onChange({ usualHour });
        }}
      />
      <NumberField
        label={t.setup.exercise.minutes}
        value={value.durationMin}
        range={PROFILE_LIMITS.durationMin}
        error={error('exercise.durationMin', PROFILE_LIMITS.durationMin)}
        onChange={(durationMin) => {
          onChange({ durationMin });
        }}
      />
      <CheckboxField
        label={t.setup.exercise.indoors}
        checked={value.canMoveIndoors}
        onChange={(canMoveIndoors) => {
          onChange({ canMoveIndoors });
        }}
      />
    </fieldset>
  );
}
