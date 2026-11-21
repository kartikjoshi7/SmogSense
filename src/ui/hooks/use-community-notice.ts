import { useState } from 'react';
import { guidanceLanguage } from '../../core/explain/index.js';
import type { Audience, PlanRequest, TextSource } from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import { api } from '../api/client.js';

export type NoticeState =
  | { readonly status: 'idle' | 'generating' | 'error' }
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
    const written = (source: TextSource) => (source === 'ai' ? lang : guidanceLanguage(lang));
    setState(
      result.ok
        ? { status: 'ready', ...result.value, lang: written(result.value.source) }
        : { status: 'error' },
    );
  };

  return { state, generate };
}
