import { categoryLabel } from '../../../core/explain/index.js';
import type { TextSource } from '../../../shared/api.js';
import type { Plan, Pollutants } from '../../../shared/plan.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { SourceTag } from '../common/source-tag.js';

/** One symbol per band so the level is never shown by colour alone. */
const BAND_ICON = ['☺', '◔', '◑', '◕', '●', '⚠'] as const;

/** Each pollutant with its chemical symbol, which reads the same in every language. */
const POLLUTANTS: readonly (readonly [keyof Pollutants, string])[] = [
  ['pm25', 'PM2.5'],
  ['pm10', 'PM10'],
  ['no2', 'NO₂'],
  ['o3', 'O₃'],
  ['co', 'CO'],
  ['so2', 'SO₂'],
];

/** Every pollutant measured this hour, so the index is not the only number shown. */
function CurrentPollutants({ current }: { readonly current: Pollutants }) {
  const t = useMessages();
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">{t.dashboard.now}</p>
      <dl className="mt-1 grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-6">
        {POLLUTANTS.map(([key, symbol]) => (
          <div key={key}>
            <dt className="font-semibold">{symbol}</dt>
            <dd>{current[key] ?? t.forecast.missing}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The headline reading: index, category in words, what it means today, and how to react. */
export function AqiCard({
  plan,
  headline,
  summary,
  source,
}: {
  readonly plan: Plan;
  readonly headline: string;
  readonly summary: string;
  /** Who wrote the headline and summary: the AI, or standard guidance. */
  readonly source: TextSource;
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
      <SourceTag source={source} />
      <p className="mt-2 font-semibold">{t.dashboard.advice[plan.outdoorAdvice]}</p>
      <p className="mt-1 text-sm">{t.dashboard.mean(index.pm25Mean24h)}</p>
      <CurrentPollutants current={plan.current} />
    </section>
  );
}
