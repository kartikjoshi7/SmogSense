import { useState } from 'react';
import type { Audience, PlanRequest } from '../../../shared/api.js';
import { NATIVE_NAMES, type Language } from '../../../shared/languages.js';
import { useCommunityNotice } from '../../hooks/use-community-notice.js';
import { useShareNotice, type ShareStatus } from '../../hooks/use-share-notice.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { Dialog } from '../common/dialog.js';
import { SelectField } from '../common/fields.js';
import { SourceTag } from '../common/source-tag.js';

/** Copy and share buttons; when the browser refuses either, say so and suggest the other. */
function NoticeActions({ notice }: { readonly notice: string }) {
  const t = useMessages().community;
  const { status, copy, share, canShare } = useShareNotice(notice);
  const problem: Partial<Record<ShareStatus, string>> = {
    copy_failed: t.copyFailed,
    share_failed: t.shareFailed,
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => void copy()}>
          {status === 'copied' ? t.copied : t.copy}
        </button>
        {canShare ? (
          <button type="button" className="btn-secondary" onClick={() => void share()}>
            {t.share}
          </button>
        ) : null}
      </div>
      <p role="status" className="field-error">
        {problem[status] ?? ''}
      </p>
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
  const { state, generate } = useCommunityNotice(request);

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
          options={NATIVE_NAMES}
          keysAreLanguages
          onChange={setLang}
        />
        <button
          type="button"
          className="btn-primary justify-self-start"
          disabled={state.status === 'generating'}
          onClick={() => void generate(audience, lang)}
        >
          {state.status === 'generating' ? t.community.generating : t.community.generate}
        </button>
        {/* Only the outcome is announced: the notice or the problem, not its buttons. */}
        <div aria-live="polite" className="grid gap-2">
          {state.status === 'error' ? <p className="field-error">{t.community.error}</p> : null}
          {state.status === 'busy' ? <p className="field-error">{t.community.busy}</p> : null}
          {state.status === 'ready' ? (
            <p className="card whitespace-pre-line" lang={state.lang}>
              {state.notice}
            </p>
          ) : null}
        </div>
        {state.status === 'ready' ? (
          <>
            <SourceTag source={state.source} />
            <NoticeActions notice={state.notice} />
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
