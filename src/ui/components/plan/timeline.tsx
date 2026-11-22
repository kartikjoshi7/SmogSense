/** The day's timeline: when to do what, from now on. */
import { clock } from '../../../core/explain/format.js';
import type { TimelineEntry } from '../../../shared/plan.js';
import { useMessages } from '../../state/app-context.js';
import type { ShownRecommendation } from './explained.js';

interface TimelineProps {
  readonly entries: readonly TimelineEntry[];
  readonly items: readonly ShownRecommendation[];
}

/** The day in order from now: when to do what. */
export function Timeline({ entries, items }: TimelineProps) {
  const t = useMessages().plan;
  if (entries.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="timeline-heading" className="card">
      <h2 id="timeline-heading" className="text-xl font-semibold">
        {t.timeline}
      </h2>
      <ol className="mt-3 grid gap-2">
        {entries.map((entry) => (
          <li key={`${entry.hour}-${entry.recommendationId}`} className="flex gap-3">
            <span className="time-chip">{clock(entry.hour)}</span>
            <span>{items.find((i) => i.rec.id === entry.recommendationId)?.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
