import { categoryLabel } from '../../../core/explain/index.js';
import type { Plan } from '../../../shared/plan.js';
import { useAppState, useMessages } from '../../state/app-context.js';

/** One symbol per band so the level is never shown by colour alone. */
const BAND_ICON = ['☺', '◔', '◑', '◕', '●', '⚠'] as const;

/** The headline reading: index, category in words, what it means today, and how to react. */
export function AqiCard({
  plan,
  headline,
  summary,
}: {
  readonly plan: Plan;
  readonly headline: string;
  readonly summary: string;
}) {
  const t = useMessages();
  const { lang } = useAppState();
  const { index, severity } = plan;
  const urgent = severity === 'restrict' || severity === 'emergency';
  return (
    <section aria-labelledby="aqi-heading" className={`card band-${index.band}`}>
      <p className="text-sm font-semibold">{t.dashboard.severity[severity]}</p>
      <p className="mt-1 flex items-baseline gap-3">
        <span aria-hidden="true" className="text-3xl">
          {BAND_ICON[index.band] ?? BAND_ICON[0]}
        </span>
        <span className="text-5xl font-bold">{index.value}</span>
        <span className="text-lg font-semibold">{categoryLabel(index.category, lang)}</span>
      </p>
      <h2
        id="aqi-heading"
        className={urgent ? 'mt-3 text-lg font-bold' : 'mt-3 text-lg font-semibold'}
      >
        {headline}
      </h2>
      <p className="mt-1">{summary}</p>
      <p className="mt-2 font-semibold">{t.dashboard.advice[plan.outdoorAdvice]}</p>
      <p className="mt-1 text-sm">{t.dashboard.mean(index.pm25Mean24h)}</p>
    </section>
  );
}
