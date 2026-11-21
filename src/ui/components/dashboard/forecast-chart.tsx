import { useId, useState } from 'react';
import { clock } from '../../../core/explain/format.js';
import type { Plan } from '../../../shared/plan.js';
import { useMessages } from '../../state/app-context.js';

const WIDTH = 480;
const HEIGHT = 160;
const LABEL_SPACE = 18;
const LABEL_EVERY_HOURS = 3;

function ForecastTable({ plan }: { readonly plan: Plan }) {
  const t = useMessages().forecast;
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{t.title}</caption>
      <thead>
        <tr>
          <th scope="col">{t.hour}</th>
          <th scope="col">{t.pm25}</th>
        </tr>
      </thead>
      <tbody>
        {plan.forecast.map((point) => (
          <tr key={point.time}>
            <th scope="row" className="font-normal">
              {clock(point.hour)}
              {point.hour === plan.cleanestHour?.hour ? ` (${t.cleanest})` : ''}
            </th>
            <td>{point.pm25 ?? t.missing}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ForecastBars({
  plan,
  descriptionId,
}: {
  readonly plan: Plan;
  readonly descriptionId: string;
}) {
  const values = plan.forecast.map((p) => p.pm25 ?? 0);
  const max = Math.max(1, ...values);
  const barWidth = WIDTH / Math.max(1, plan.forecast.length);
  const usable = HEIGHT - LABEL_SPACE;
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="forecast-heading"
      aria-describedby={descriptionId}
      className="w-full"
    >
      {plan.forecast.map((point, i) => {
        const height = ((point.pm25 ?? 0) / max) * usable;
        const clean = point.hour === plan.cleanestHour?.hour;
        return (
          <g key={point.time}>
            <rect
              x={i * barWidth + 1}
              y={usable - height}
              width={barWidth - 2}
              height={height}
              fill={clean ? 'var(--bar-clean)' : 'var(--bar)'}
            />
            {i % LABEL_EVERY_HOURS === 0 ? (
              <text x={i * barWidth} y={HEIGHT - 4} fontSize="11" fill="currentColor">
                {clock(point.hour).slice(0, 2)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Hourly PM2.5 for the next day, drawn as bars with the cleanest hour highlighted, or as a table. */
export function ForecastChart({ plan }: { readonly plan: Plan }) {
  const t = useMessages().forecast;
  const [asTable, setAsTable] = useState(false);
  const descriptionId = useId();
  const cleanest = plan.cleanestHour;
  return (
    <section aria-labelledby="forecast-heading" className="card grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="forecast-heading" className="text-xl font-semibold">
          {t.title}
        </h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setAsTable((v) => !v);
          }}
        >
          {asTable ? t.hideTable : t.showTable}
        </button>
      </div>
      <p id={descriptionId} className="muted">
        {cleanest === null ? t.noClean : t.description(clock(cleanest.hour), cleanest.pm25)}
      </p>
      {asTable ? (
        <ForecastTable plan={plan} />
      ) : (
        <ForecastBars plan={plan} descriptionId={descriptionId} />
      )}
    </section>
  );
}
