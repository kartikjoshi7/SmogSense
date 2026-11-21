import type { Commute, Exercise, Home, MaskType } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';
import {
  CheckboxField,
  CheckboxGroup,
  HourField,
  NumberField,
  SelectField,
} from '../common/fields.js';

/** Field paths with a validation problem (e.g. "commute.oneWayKm"). */
export type InvalidFields = ReadonlySet<string>;

/** A localized range message for a field path, or undefined when the field is valid. */
function useRangeError(invalid: InvalidFields) {
  const range = useMessages().setup.range;
  return (path: string, min: number, max: number) =>
    invalid.has(path) ? range(min, max) : undefined;
}

interface Section<T> {
  readonly value: T;
  readonly invalid: InvalidFields;
  readonly onChange: (patch: Partial<T>) => void;
}

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
        min={0}
        max={100}
        error={error('commute.oneWayKm', 0, 100)}
        onChange={(oneWayKm) => {
          onChange({ oneWayKm });
        }}
      />
      <NumberField
        label={t.setup.commute.days}
        value={value.daysPerWeek}
        min={0}
        max={7}
        error={error('commute.daysPerWeek', 0, 7)}
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
      <legend className="text-lg font-semibold">{t.setup.commute.legend}</legend>
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
      <legend className="text-lg font-semibold">{t.setup.exercise.legend}</legend>
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
        min={10}
        max={180}
        error={error('exercise.durationMin', 10, 180)}
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

function RoomFields({ value, invalid, onChange }: Section<Home>) {
  const t = useMessages();
  const error = useRangeError(invalid);
  return (
    <>
      <NumberField
        label={t.setup.home.purifiers}
        value={value.purifierCount}
        min={0}
        max={5}
        error={error('home.purifierCount', 0, 5)}
        onChange={(purifierCount) => {
          onChange({ purifierCount });
        }}
      />
      <NumberField
        label={t.setup.home.cadr}
        value={value.purifierCadrM3h}
        min={50}
        max={1000}
        error={error('home.purifierCadrM3h', 50, 1000)}
        onChange={(purifierCadrM3h) => {
          onChange({ purifierCadrM3h });
        }}
      />
      <NumberField
        label={t.setup.home.area}
        value={value.roomAreaM2}
        min={5}
        max={60}
        error={error('home.roomAreaM2', 5, 60)}
        onChange={(roomAreaM2) => {
          onChange({ roomAreaM2 });
        }}
      />
      <SelectField
        label={t.setup.home.airtightness}
        value={value.airtightness}
        options={t.options.airtightness}
        onChange={(airtightness) => {
          onChange({ airtightness });
        }}
      />
    </>
  );
}

function HabitFields({ value, onChange }: Section<Home>) {
  const t = useMessages();
  return (
    <>
      <SelectField
        label={t.setup.home.fuel}
        value={value.cookingFuel}
        options={t.options.cookingFuel}
        onChange={(cookingFuel) => {
          onChange({ cookingFuel });
        }}
      />
      <SelectField
        label={t.setup.home.incense}
        value={value.incense}
        options={t.options.incense}
        onChange={(incense) => {
          onChange({ incense });
        }}
      />
      <CheckboxField
        label={t.setup.home.exhaust}
        checked={value.hasExhaustOrChimney}
        onChange={(hasExhaustOrChimney) => {
          onChange({ hasExhaustOrChimney });
        }}
      />
      <CheckboxField
        label={t.setup.home.smoking}
        checked={value.indoorSmoking}
        onChange={(indoorSmoking) => {
          onChange({ indoorSmoking });
        }}
      />
    </>
  );
}

/** The home: purifiers, room, draughts, cooking, smoke sources, and the usual mask. */
export function HomeFieldset({
  mask,
  onMaskChange,
  ...section
}: Section<Home> & {
  readonly mask: MaskType;
  readonly onMaskChange: (mask: MaskType) => void;
}) {
  const t = useMessages();
  return (
    <fieldset className="card grid gap-3 sm:grid-cols-2">
      <legend className="text-lg font-semibold">{t.setup.home.legend}</legend>
      <RoomFields {...section} />
      <HabitFields {...section} />
      <SelectField
        label={t.setup.home.mask}
        value={mask}
        options={t.options.mask}
        onChange={onMaskChange}
      />
    </fieldset>
  );
}
