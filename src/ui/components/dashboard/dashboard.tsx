import { lazy, Suspense, useState, type RefObject } from 'react';
import { planHeadline, planSummary } from '../../../core/explain/index.js';
import { API_STATUS, type ExplainResponse, type PlanRequest } from '../../../shared/api.js';
import type { Plan } from '../../../shared/plan.js';
import type { ApiError } from '../../api/client.js';
import { usePlan } from '../../hooks/use-plan.js';
import type { Messages } from '../../i18n/en.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import type { Household, SavedLocation } from '../../state/storage.js';
import { explainedItems } from '../plan/explained.js';
import { PlanSection } from '../plan/plan-section.js';
import { Timeline } from '../plan/timeline.js';
import { WhatIf } from '../plan/what-if.js';
import { AqiCard } from './aqi-card.js';
import { ForecastChart } from './forecast-chart.js';
import { InversionCard } from './inversion-card.js';

const ChatDialog = lazy(() =>
  import('../chat/chat-dialog.js').then((m) => ({ default: m.ChatDialog })),
);
const CommunityDialog = lazy(() =>
  import('../community/community-dialog.js').then((m) => ({ default: m.CommunityDialog })),
);

type OpenDialog = 'chat' | 'notice' | null;

/** What to say when the plan fails: the cause when the status tells it, else a general line. */
function planErrorText(t: Messages['dashboard'], error: ApiError): string {
  const byStatus: Readonly<Record<number, string>> = {
    [API_STATUS.tooManyRequests]: t.errors.busy,
    [API_STATUS.upstreamFailed]: t.errors.upstream,
    [API_STATUS.noData]: t.errors.noData,
  };
  return (error.status === null ? undefined : byStatus[error.status]) ?? t.errors.general;
}

function PlanView({
  plan,
  explanation,
  household,
  onOpen,
}: {
  readonly plan: Plan;
  readonly explanation: ExplainResponse | null;
  readonly household: Household;
  readonly onOpen: (dialog: OpenDialog) => void;
}) {
  const t = useMessages();
  const { lang } = useAppState();
  const items = explainedItems(plan, explanation, lang);
  const { exercise, members } = household.profile;
  return (
    <>
      <AqiCard
        plan={plan}
        headline={explanation?.headline ?? planHeadline(plan, lang)}
        summary={explanation?.summary ?? planSummary(plan, lang)}
        source={explanation?.introSource ?? 'fallback'}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onOpen('chat');
          }}
        >
          {t.actions.ask}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            onOpen('notice');
          }}
        >
          {t.actions.notice}
        </button>
      </div>
      <ForecastChart plan={plan} />
      <InversionCard inversion={plan.inversion} />
      <Timeline entries={plan.timeline} items={items} />
      <PlanSection items={items} household={household} />
      {exercise.activity === 'none' ? null : (
        <WhatIf plan={plan} exercise={exercise} members={members} />
      )}
    </>
  );
}

/** Today's plan for the household: loading, errors, the plan itself and the AI dialogs. */
export function Dashboard({
  household,
  location,
  headingRef,
}: {
  readonly household: Household;
  readonly location: SavedLocation;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const t = useMessages();
  const { lang } = useAppState();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const { state, retry } = usePlan(household.profile, location, lang);
  const request: PlanRequest = {
    profile: household.profile,
    location: { lat: location.lat, lon: location.lon },
  };
  const close = () => {
    setDialog(null);
  };

  return (
    <div className="grid gap-4" aria-busy={state.status === 'loading'}>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold">
        {t.dashboard.title(location.label)}
      </h1>
      <p role="status" className="muted">
        {state.status === 'loading' ? t.dashboard.loading : ''}
        {state.status === 'ready' && state.explaining ? t.dashboard.explaining : ''}
      </p>
      {state.status === 'error' ? (
        <div role="alert" className="card grid gap-2">
          <p>{planErrorText(t.dashboard, state.error)}</p>
          <button type="button" className="btn-primary justify-self-start" onClick={retry}>
            {t.dashboard.retry}
          </button>
        </div>
      ) : null}
      {state.status === 'ready' ? (
        <PlanView
          plan={state.plan}
          explanation={state.explanation}
          household={household}
          onOpen={setDialog}
        />
      ) : null}
      <Suspense fallback={null}>
        {dialog === 'chat' ? <ChatDialog request={request} onClose={close} /> : null}
        {dialog === 'notice' ? <CommunityDialog request={request} onClose={close} /> : null}
      </Suspense>
    </div>
  );
}
