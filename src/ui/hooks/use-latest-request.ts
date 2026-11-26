/** One request at a time per hook: a new request, or unmounting, cancels the one still running. */
import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a function that gives each new request its abort signal and aborts the request before
 * it, so an older answer never replaces a newer one. A request still running on unmount is
 * aborted too. Callers check `signal.aborted` when the answer arrives.
 */
export function useLatestRequest(): () => AbortSignal {
  const running = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    running.current?.abort();
  }, []);
  useEffect(() => cancel, [cancel]);
  return () => {
    cancel();
    running.current = new AbortController();
    return running.current.signal;
  };
}
