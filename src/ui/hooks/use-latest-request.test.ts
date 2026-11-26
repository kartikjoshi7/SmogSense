import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLatestRequest } from './use-latest-request.js';

describe('useLatestRequest', () => {
  it('cancels the running request when the next one starts', () => {
    const { result } = renderHook(() => useLatestRequest());
    const first = result.current();
    const second = result.current();

    expect([first.aborted, second.aborted]).toEqual([true, false]);
  });

  it('cancels the running request when the component unmounts', () => {
    const { result, unmount } = renderHook(() => useLatestRequest());
    const signal = result.current();
    unmount();

    expect(signal.aborted).toBe(true);
  });
});
