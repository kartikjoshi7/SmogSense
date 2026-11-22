import type { Range } from '../../../shared/limits.js';
import { useMessages } from '../../state/app-context.js';

/** Field paths with a validation problem (e.g. "commute.oneWayKm"). */
export type InvalidFields = ReadonlySet<string>;

/** A localized range message for a field path, or undefined when the field is valid. */
export function useRangeError(invalid: InvalidFields) {
  const { range, wholeRange } = useMessages().setup;
  return (path: string, { min, max, whole }: Range) => {
    if (!invalid.has(path)) {
      return undefined;
    }
    return whole === true ? wholeRange(min, max) : range(min, max);
  };
}

/**
 * A change handler for one field of a setup step: `set('usualHour')` reports
 * `{ usualHour: value }` through the step's `onChange`.
 */
export function fieldSetter<T>(onChange: (patch: Partial<T>) => void) {
  return <K extends keyof T>(key: K) =>
    (value: T[K]): void => {
      const patch: Partial<T> = {};
      patch[key] = value;
      onChange(patch);
    };
}

/** One setup step's value, its invalid fields and how it reports a change. */
export interface Section<T> {
  readonly value: T;
  readonly invalid: InvalidFields;
  readonly onChange: (patch: Partial<T>) => void;
}
