/** The plan screen: loading and error states, the plan and the AI dialogs. */
import { lazy, Suspense, useState, type RefObject } from 'react';
import { API_STATUS, type PlanRequest } from '../../../shared/api.js';
import type { ApiError } from '../../api/client.js';
import { usePlan, type PlanState } from '../../hooks/use-plan.js';
import type { Messages } from '../../i18n/en.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import type { Household, SavedLocation } from '../../state/storage.js';
import { PlanView, type OpenDialog } from './plan-view.js';

const ChatDialog = lazy(() =>
  import('../chat/chat-dialog.js').then((m) => ({ default: m.ChatDialog })),
);
const CommunityDialog = lazy(() =>
  import('../community/community-dialog.js').then((m) => ({ default: m.CommunityDialog })),
);

/** What to say when the plan fails: the cause when the status tells it, else a general line. */
function planErrorText(t: Messages['dashboard'], error: ApiError): string {
  const byStatus: Readonly<Record<number, string>> = {
    [API_STATUS.tooManyRequests]: t.errors.busy,
    [API_STATUS.upstreamFailed]: t.errors.upstream,
    [API_STATUS.noData]: t.errors.noData,
  };
  return (error.status === null ? undefined : byStatus[error.status]) ?? t.errors.general;
}

interface PlanStatusProps {
  readonly state: PlanState;
}

/** The live line that says the plan, or its AI wording, is on its way. */
function PlanStatus({ state }: PlanStatusProps) {
  const t = useMessages().dashboard;
  return (
    <p role="status" className="muted">
      {state.status === 'loading' ? t.loading : ''}
      {state.status === 'ready' && state.explaining ? t.explaining : ''}
    </p>
  );
}

interface PlanErrorProps {
  readonly error: ApiError;
  readonly onRetry: () => void;
}

/** Why the plan could not be built, with a way to try again. */
function PlanError({ error, onRetry }: PlanErrorProps) {
  const t = useMessages().dashboard;
  return (
    <div role="alert" className="card grid gap-2">
      <p>{planErrorText(t, error)}</p>
      <button type="button" className="btn-primary justify-self-start" onClick={onRetry}>
        {t.retry}
      </button>
    </div>
  );
}

interface AiDialogsProps {
  readonly open: OpenDialog;
  readonly request: PlanRequest;
  readonly onClose: () => void;
}

/** The chat and notice dialogs, each loaded the first time it opens. */
function AiDialogs({ open, request, onClose }: AiDialogsProps) {
  return (
    <Suspense fallback={null}>
      {open === 'chat' ? <ChatDialog request={request} onClose={onClose} /> : null}
      {open === 'notice' ? <CommunityDialog request={request} onClose={onClose} /> : null}
    </Suspense>
  );
}

interface DashboardProps {
  readonly household: Household;
  readonly location: SavedLocation;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}

/** Today's plan for the household: loading, errors, the plan itself and the AI dialogs. */
export function Dashboard({ household, location, headingRef }: DashboardProps) {
  const t = useMessages();
  const { lang } = useAppState();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { state, request, retry } = usePlan(household.profile, location, lang);
  return (
    <div className="grid gap-4">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold">
        {t.dashboard.title(location.label ?? t.setup.location.myLocation)}
      </h1>
      <PlanStatus state={state} />
      {state.status === 'error' ? <PlanError error={state.error} onRetry={retry} /> : null}
      {state.status === 'ready' ? (
        <PlanView
          plan={state.plan}
          explanation={state.explanation}
          household={household}
          onOpen={setDialog}
        />
      ) : null}
      <AiDialogs
        open={dialog}
        request={request}
        onClose={() => {
          setDialog(null);
        }}
      />
    </div>
  );
}
