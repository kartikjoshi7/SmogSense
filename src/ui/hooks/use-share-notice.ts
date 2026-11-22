/** Copies a notice or opens the device's share sheet, and reports how it went. */
import { useState } from 'react';

export type ShareStatus = 'idle' | 'copied' | 'copy_failed' | 'share_failed';

/** True when the person closed the share sheet themselves, which is not a failure. */
function isCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Copy a notice or hand it to the device's share sheet, and say how that went. */
export function useShareNotice(notice: string) {
  const [status, setStatus] = useState<ShareStatus>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(notice);
      setStatus('copied');
    } catch {
      setStatus('copy_failed');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ text: notice });
    } catch (error: unknown) {
      setStatus(isCancelled(error) ? 'idle' : 'share_failed');
    }
  };

  return { status, copy, share, canShare: 'share' in navigator };
}
