/** Requests a community notice and tracks its progress. */
import { useState } from 'react';
import { replyLanguage } from '../../core/explain/index.js';
import type { Audience, Location, TextSource } from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import { api, failureKind } from '../api/client.js';
import { useLatestRequest } from './use-latest-request.js';

export type NoticeState =
  /** "busy" when the server's AI rate limit was reached, "error" for any other failure. */
  | { readonly status: 'idle' | 'generating' | 'error' | 'busy' }
  | {
      readonly status: 'ready';
      readonly notice: string;
      readonly source: TextSource;
      /** The language the notice is written in. */
      readonly lang: Language;
    };

/**
 * Ask the server for a community notice and track its progress. A new request cancels the one
 * still running, so the notice shown is always for the latest audience and language.
 */
export function useCommunityNotice(location: Location) {
  const [state, setState] = useState<NoticeState>({ status: 'idle' });
  const nextSignal = useLatestRequest();

  const generate = async (audience: Audience, lang: Language) => {
    setState({ status: 'generating' });
    const signal = nextSignal();
    const result = await api.community({ location, lang, audience }, signal);
    if (signal.aborted) {
      return;
    }
    setState(
      result.ok
        ? { status: 'ready', ...result.value, lang: replyLanguage(result.value.source, lang) }
        : { status: failureKind(result.error) },
    );
  };

  return { state, generate };
}
