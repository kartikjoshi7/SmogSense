/** The loaded plan: the reading, the AI actions, the day in detail and every recommendation. */
import { planHeadline, planSummary } from '../../../core/explain/index.js';
import type { ExplainResponse, TextSource } from '../../../shared/api.js';
import type { UiLanguage } from '../../../shared/languages.js';
import type { Plan } from '../../../shared/plan.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import type { Household } from '../../state/storage.js';
import { explainedItems } from '../plan/explained.js';
import { PlanSection } from '../plan/plan-section.js';
import { Timeline } from '../plan/timeline.js';
import { WhatIf } from '../plan/what-if.js';
import { AqiCard } from './aqi-card.js';
import { ForecastChart } from './forecast-chart.js';
import { InversionCard } from './inversion-card.js';

/** The reading's headline and summary: the AI's when it wrote them, else standard guidance. */
function introFor(
  plan: Plan,
  explanation: ExplainResponse | null,
  lang: UiLanguage,
): { headline: string; summary: string; source: TextSource } {
  const intro = explanation?.intro ?? null;
  return intro === null
    ? { headline: planHeadline(plan, lang), summary: planSummary(plan, lang), source: 'fallback' }
    : { ...intro, source: 'ai' };
}

/** The AI dialog the dashboard has open, if any. */
export type OpenDialog = 'chat' | 'notice' | null;

interface PlanActionsProps {
  readonly onOpen: (dialog: OpenDialog) => void;
}

/** The two AI actions: ask about the plan, or write a notice for the community. */
function PlanActions({ onOpen }: PlanActionsProps) {
  const t = useMessages().actions;
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          onOpen('chat');
        }}
      >
        {t.ask}
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          onOpen('notice');
        }}
      >
        {t.notice}
      </button>
    </div>
  );
}

interface PlanViewProps {
  readonly plan: Plan;
  readonly explanation: ExplainResponse | null;
  readonly household: Household;
  readonly onOpen: (dialog: OpenDialog) => void;
}

/** Today's plan: the reading, the AI actions, the day in detail and every recommendation. */
export function PlanView({ plan, explanation, household, onOpen }: PlanViewProps) {
  const { lang } = useAppState();
  const items = explainedItems(plan, explanation, lang);
  const { exercise, members } = household.profile;
  return (
    <>
      <AqiCard plan={plan} {...introFor(plan, explanation, lang)} />
      <PlanActions onOpen={onOpen} />
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        <div className="grid gap-5 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <InversionCard inversion={plan.inversion} />
          <Timeline entries={plan.timeline} items={items} />
        </div>
        <div className="grid gap-5 lg:col-span-7">
          <ForecastChart plan={plan} />
          {exercise.activity === 'none' ? null : (
            <WhatIf plan={plan} exercise={exercise} members={members} />
          )}
        </div>
      </div>
      <PlanSection items={items} household={household} />
    </>
  );
}
