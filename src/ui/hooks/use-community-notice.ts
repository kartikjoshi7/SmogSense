import { useState } from 'react';
import { replyLanguage } from '../../core/explain/index.js';
import { API_STATUS, type Audience, type PlanRequest, type TextSource } from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import { api } from '../api/client.js';

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

/** Ask the server for a community notice and track its progress. */
export function useCommunityNotice(request: PlanRequest) {
  const [state, setState] = useState<NoticeState>({ status: 'idle' });

  const generate = async (audience: Audience, lang: Language) => {
    setState({ status: 'generating' });
    const result = await api.community({ ...request, lang, audience });
    setState(
      result.ok
        ? { status: 'ready', ...result.value, lang: replyLanguage(result.value.source, lang) }
        : { status: result.error.status === API_STATUS.tooManyRequests ? 'busy' : 'error' },
    );
  };

  return { state, generate };
}
