/** The outcome of an operation that can fail in an expected way. */
export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Wrap a successful value. */
export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

/** Wrap an expected failure. */
export function fail<E>(error: E): { readonly ok: false; readonly error: E } {
  return { ok: false, error };
}
