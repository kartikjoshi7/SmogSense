import { clock } from '../../../core/explain/format.js';
import type { TimelineEntry } from '../../../shared/plan.js';
import { useMessages } from '../../state/app-context.js';
import type { ShownRecommendation } from './explained.js';

/** The day in order from now: when to do what. */
export function Timeline({
  entries,
  items,
}: {
  readonly entries: readonly TimelineEntry[];
  readonly items: readonly ShownRecommendation[];
}) {
  const t = useMessages().plan;
  if (entries.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="timeline-heading" className="card">
      <h2 id="timeline-heading" className="text-xl font-semibold">
        {t.timeline}
      </h2>
      <ol className="mt-2 grid gap-1">
        {entries.map((entry) => (
          <li key={`${entry.hour}-${entry.recommendationId}`} className="flex gap-3">
            <span className="w-14 font-mono font-semibold">{clock(entry.hour)}</span>
            <span>{items.find((i) => i.rec.id === entry.recommendationId)?.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
