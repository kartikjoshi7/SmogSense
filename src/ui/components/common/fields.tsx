import { useId } from 'react';
import { clock } from '../../../core/explain/format.js';
import { CLOCK_HOURS, type Range } from '../../../shared/limits.js';

/** Options as a value → label table, kept in the order written. */
type OptionLabels<K extends string> = Readonly<Record<K, string>>;

function entries<K extends string>(labels: OptionLabels<K>): [K, string][] {
  return (Object.keys(labels) as K[]).map((key) => [key, labels[key]]);
}

/**
 * A labelled select whose value is one of the option keys. With `keysAreLanguages`, the keys are
 * language codes and each option, named in its own script, is marked with its own `lang`.
 */
export function SelectField<K extends string>({
  label,
  value,
  options,
  keysAreLanguages = false,
  onChange,
}: {
  readonly label: string;
  readonly value: K;
  readonly options: OptionLabels<K>;
  readonly keysAreLanguages?: boolean;
  readonly onChange: (value: K) => void;
}) {
  const id = useId();
  const pairs = entries(options);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const chosen = pairs.find(([key]) => key === e.target.value);
          if (chosen !== undefined) {
            onChange(chosen[0]);
          }
        }}
      >
        {pairs.map(([key, text]) => (
          <option key={key} value={key} lang={keysAreLanguages ? key : undefined}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled number input within a range; `error` is linked to it and shown below. */
export function NumberField({
  label,
  value,
  range,
  onChange,
  error,
}: {
  readonly label: string;
  readonly value: number;
  readonly range: Range;
  readonly onChange: (value: number) => void;
  readonly error?: string | undefined;
}) {
  const id = useId();
  const errorId = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        min={range.min}
        max={range.max}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId}
        onChange={(e) => {
          onChange(e.target.valueAsNumber);
        }}
      />
      {error === undefined ? null : (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** A labelled select of the 24 clock hours. */
export function HourField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (hour: number) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
      >
        {Array.from({ length: CLOCK_HOURS.max + 1 }, (_, hour) => (
          <option key={hour} value={hour}>
            {clock(hour)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A single labelled checkbox. */
export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      <span>{label}</span>
    </label>
  );
}

/** A group of checkboxes with a legend, for choosing any number of options. */
export function CheckboxGroup<K extends string>({
  legend,
  options,
  values,
  onChange,
}: {
  readonly legend: string;
  readonly options: OptionLabels<K>;
  readonly values: readonly K[];
  readonly onChange: (values: K[]) => void;
}) {
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries(options).map(([key, text]) => (
          <CheckboxField
            key={key}
            label={text}
            checked={values.includes(key)}
            onChange={(on) => {
              onChange(on ? [...values, key] : values.filter((v) => v !== key));
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
