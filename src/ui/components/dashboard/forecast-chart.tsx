import { useId, useState } from 'react';
import { clock } from '../../../core/explain/format.js';
import type { Plan } from '../../../shared/plan.js';
import { useMessages } from '../../state/app-context.js';

const WIDTH = 480;
const HEIGHT = 160;
const LABEL_SPACE = 18;
const LABEL_EVERY_HOURS = 3;

interface ForecastTableProps {
  readonly plan: Plan;
}

function ForecastTable({ plan }: ForecastTableProps) {
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

interface MissingBarProps {
  readonly x: number;
  readonly width: number;
  readonly height: number;
}

/** An hour with no forecast: a dashed outline the full height of the chart, never a zero bar. */
function MissingBar({ x, width, height }: MissingBarProps) {
  return (
    <rect
      x={x + 2}
      y={1}
      width={width - 4}
      height={height - 2}
      fill="none"
      stroke="var(--muted)"
      strokeDasharray="3 3"
    />
  );
}

interface ForecastBarsProps {
  readonly plan: Plan;
  readonly descriptionId: string;
}

function ForecastBars({ plan, descriptionId }: ForecastBarsProps) {
  const values = plan.forecast.flatMap((p) => (p.pm25 === null ? [] : [p.pm25]));
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
        const clean = point.hour === plan.cleanestHour?.hour;
        return (
          <g key={point.time}>
            {point.pm25 === null ? (
              <MissingBar x={i * barWidth} width={barWidth} height={usable} />
            ) : (
              <rect
                x={i * barWidth + 1}
                y={usable - (point.pm25 / max) * usable}
                width={barWidth - 2}
                height={(point.pm25 / max) * usable}
                fill={clean ? 'var(--bar-clean)' : 'var(--bar)'}
              />
            )}
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

interface ForecastChartProps {
  readonly plan: Plan;
}

/**
 * Hourly PM2.5 for the next day, drawn as bars with the cleanest hour highlighted, or as a table.
 */
export function ForecastChart({ plan }: ForecastChartProps) {
  const t = useMessages().forecast;
  const [asTable, setAsTable] = useState(false);
  const descriptionId = useId();
  const cleanest = plan.cleanestHour;
  const missing = plan.forecast.filter((point) => point.pm25 === null).length;
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
        {missing === 0 ? '' : ` ${t.missingNote(missing)}`}
      </p>
      {asTable ? (
        <ForecastTable plan={plan} />
      ) : (
        <ForecastBars plan={plan} descriptionId={descriptionId} />
      )}
    </section>
  );
}
