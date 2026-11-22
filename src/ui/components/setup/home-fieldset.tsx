import { PROFILE_LIMITS } from '../../../shared/limits.js';
import type { Home, MaskType } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';
import { CheckboxField } from '../common/checkbox-fields.js';
import { NumberField, SelectField } from '../common/fields.js';
import { fieldSetter, useRangeError, type Section } from './setup-section.js';
import { StepLegend } from './step-legend.js';

function RoomFields({ value, invalid, onChange }: Section<Home>) {
  const set = fieldSetter(onChange);
  const t = useMessages();
  const error = useRangeError(invalid);
  return (
    <>
      <NumberField
        label={t.setup.home.purifiers}
        value={value.purifierCount}
        range={PROFILE_LIMITS.purifierCount}
        error={error('home.purifierCount', PROFILE_LIMITS.purifierCount)}
        onChange={set('purifierCount')}
      />
      <NumberField
        label={t.setup.home.cadr}
        value={value.purifierCadrM3h}
        range={PROFILE_LIMITS.purifierCadrM3h}
        error={error('home.purifierCadrM3h', PROFILE_LIMITS.purifierCadrM3h)}
        onChange={set('purifierCadrM3h')}
      />
      <NumberField
        label={t.setup.home.area}
        value={value.roomAreaM2}
        range={PROFILE_LIMITS.roomAreaM2}
        error={error('home.roomAreaM2', PROFILE_LIMITS.roomAreaM2)}
        onChange={set('roomAreaM2')}
      />
      <SelectField
        label={t.setup.home.airtightness}
        value={value.airtightness}
        options={t.options.airtightness}
        onChange={set('airtightness')}
      />
    </>
  );
}

function HabitFields({ value, onChange }: Section<Home>) {
  const set = fieldSetter(onChange);
  const t = useMessages();
  return (
    <>
      <SelectField
        label={t.setup.home.fuel}
        value={value.cookingFuel}
        options={t.options.cookingFuel}
        onChange={set('cookingFuel')}
      />
      <SelectField
        label={t.setup.home.incense}
        value={value.incense}
        options={t.options.incense}
        onChange={set('incense')}
      />
      <SelectField
        label={t.setup.home.heating}
        value={value.heating}
        options={t.options.heating}
        onChange={set('heating')}
      />
      <CheckboxField
        label={t.setup.home.exhaust}
        checked={value.hasExhaustOrChimney}
        onChange={set('hasExhaustOrChimney')}
      />
      <CheckboxField
        label={t.setup.home.smoking}
        checked={value.indoorSmoking}
        onChange={set('indoorSmoking')}
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
      <StepLegend step={5}>{t.setup.home.legend}</StepLegend>
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
