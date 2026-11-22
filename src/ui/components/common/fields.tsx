import { useId, type ReactNode } from 'react';
import { clock } from '../../../core/explain/format.js';
import { CLOCK_HOURS, type Range } from '../../../shared/limits.js';
import { entries, type Labels } from '../../i18n/labels.js';

interface SelectFieldProps<K extends string> {
  readonly label: string;
  readonly value: K;
  readonly options: Labels<K>;
  readonly keysAreLanguages?: boolean;
  /** Keep the label for screen readers only, where the options name themselves (a language). */
  readonly hideLabel?: boolean;
  readonly onChange: (value: K) => void;
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
  hideLabel = false,
  onChange,
}: SelectFieldProps<K>) {
  const id = useId();
  const pairs = entries(options);
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </label>
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

interface NumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly range: Range;
  readonly onChange: (value: number) => void;
  readonly error?: string | undefined;
}

/** A labelled number input within a range; `error` is linked to it and shown below. */
export function NumberField({ label, value, range, onChange, error }: NumberFieldProps) {
  const id = useId();
  const errorId = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode={range.whole === true ? 'numeric' : 'decimal'}
        step={range.whole === true ? 1 : 'any'}
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

interface HourFieldProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (hour: number) => void;
}

/** A labelled select of the 24 clock hours. */
export function HourField({ label, value, onChange }: HourFieldProps) {
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

interface StepLegendProps {
  readonly step: number;
  readonly children: ReactNode;
}

/** A setup step's title with its number; the number is decorative, the title names the group. */
export function StepLegend({ step, children }: StepLegendProps) {
  return (
    <legend className="text-lg font-semibold">
      <span aria-hidden="true" className="step-badge">
        {step}
      </span>
      {children}
    </legend>
  );
}
