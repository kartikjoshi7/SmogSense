import type { Impact } from '../../../shared/plan.js';
import type { Messages } from '../../i18n/en.js';
import { useMessages } from '../../state/app-context.js';
import { ReadAloudButton } from '../common/read-aloud.js';
import { SourceTag } from '../common/source-tag.js';
import type { ShownRecommendation } from './explained.js';

/** Short badges for every measurable effect, or the qualitative level when nothing is measured. */
function impactBadges(impact: Impact, t: Messages['plan']): string[] {
  const badges: string[] = [];
  const pct = impact.exposureReductionPct;
  if (impact.indoorBeforeUgM3 !== undefined && impact.indoorAfterUgM3 !== undefined) {
    badges.push(t.indoor(impact.indoorBeforeUgM3, impact.indoorAfterUgM3));
  } else if (pct !== undefined && pct !== 0) {
    badges.push(pct > 0 ? t.exposure(pct) : t.exposureUp(-pct));
  }
  if (impact.co2SavedKgPerWeek !== undefined && impact.co2SavedKgPerWeek > 0) {
    badges.push(t.co2(impact.co2SavedKgPerWeek));
  }
  if (badges.length === 0 && impact.level !== undefined) {
    badges.push(t.level[impact.level]);
  }
  return badges;
}

/** One recommendation: what to do, its measured impact, why, how, and for whom. */
export function RecommendationCard({
  item,
  memberNames,
}: {
  readonly item: ShownRecommendation;
  readonly memberNames: readonly string[];
}) {
  const t = useMessages().plan;
  const headingId = `rec-${item.rec.id}`;
  return (
    <article aria-labelledby={headingId} className="card grid gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={headingId} className="text-lg font-semibold">
          {item.title}
        </h3>
        <SourceTag source={item.source} />
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={t.impact}>
        {impactBadges(item.rec.impact, t).map((badge) => (
          <li key={badge} className="tag tag-impact">
            {badge}
          </li>
        ))}
        <li className="tag">{t.effort[item.rec.effort]}</li>
      </ul>
      {memberNames.length > 0 ? (
        <p className="text-sm font-semibold">{t.forMembers(memberNames.join(', '))}</p>
      ) : null}
      <p>{item.why}</p>
      <h4 className="font-semibold">{t.steps}</h4>
      <ol className="ml-5 list-decimal">
        {item.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div>
        <ReadAloudButton text={[item.title, item.why, ...item.steps].join('. ')} />
      </div>
    </article>
  );
}
