import { entries, type Labels } from '../../i18n/labels.js';

interface CheckboxFieldProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

/** A single labelled checkbox. */
export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
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

interface CheckboxGroupProps<K extends string> {
  readonly legend: string;
  readonly options: Labels<K>;
  readonly values: readonly K[];
  readonly onChange: (values: K[]) => void;
}

/** A group of checkboxes with a legend, for choosing any number of options. */
export function CheckboxGroup<K extends string>({
  legend,
  options,
  values,
  onChange,
}: CheckboxGroupProps<K>) {
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
