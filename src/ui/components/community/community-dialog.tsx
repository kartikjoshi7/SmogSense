import { useState } from 'react';
import type { Audience, Language, PlanRequest, TextSource } from '../../../shared/api.js';
import { api } from '../../api/client.js';
import { LANGUAGE_NAMES } from '../../i18n/languages.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { Dialog } from '../common/dialog.js';
import { SelectField } from '../common/fields.js';
import { SourceTag } from '../common/source-tag.js';

type NoticeState =
  | { readonly status: 'idle' | 'generating' | 'error' }
  | { readonly status: 'ready'; readonly notice: string; readonly source: TextSource };

function NoticeActions({ notice }: { readonly notice: string }) {
  const t = useMessages().community;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          void navigator.clipboard.writeText(notice).then(() => {
            setCopied(true);
          });
        }}
      >
        {copied ? t.copied : t.copy}
      </button>
      {'share' in navigator ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            void navigator.share({ text: notice }).catch(() => undefined);
          }}
        >
          {t.share}
        </button>
      ) : null}
    </div>
  );
}

/** Write a short advisory for a housing society, school or workplace, in any supported language. */
export function CommunityDialog({
  request,
  onClose,
}: {
  readonly request: PlanRequest;
  readonly onClose: () => void;
}) {
  const t = useMessages();
  const { lang: uiLang } = useAppState();
  const [audience, setAudience] = useState<Audience>('housing_society');
  const [lang, setLang] = useState<Language>(uiLang);
  const [state, setState] = useState<NoticeState>({ status: 'idle' });

  const generate = async () => {
    setState({ status: 'generating' });
    const result = await api.community({ ...request, lang, audience });
    setState(result.ok ? { status: 'ready', ...result.data } : { status: 'error' });
  };

  return (
    <Dialog title={t.community.title} closeLabel={t.actions.close} onClose={onClose}>
      <p className="muted mb-3">{t.community.intro}</p>
      <div className="grid gap-3">
        <SelectField
          label={t.community.audience}
          value={audience}
          options={t.community.audiences}
          onChange={setAudience}
        />
        <SelectField
          label={t.community.language}
          value={lang}
          options={LANGUAGE_NAMES}
          onChange={setLang}
        />
        <button
          type="button"
          className="btn-primary justify-self-start"
          disabled={state.status === 'generating'}
          onClick={() => void generate()}
        >
          {state.status === 'generating' ? t.community.generating : t.community.generate}
        </button>
        <div aria-live="polite" className="grid gap-2">
          {state.status === 'error' ? <p className="field-error">{t.community.error}</p> : null}
          {state.status === 'ready' ? (
            <>
              <p className="card whitespace-pre-line">{state.notice}</p>
              <SourceTag source={state.source} />
              <NoticeActions notice={state.notice} />
            </>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
