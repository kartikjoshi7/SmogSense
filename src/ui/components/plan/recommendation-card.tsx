/** One recommendation card: what to do, its impact, why, how and for whom. */
import type { Impact } from '../../../shared/recommendation.js';
import type { Messages } from '../../i18n/en.js';
import { useMessages } from '../../state/app-context.js';
import { ReadAloudButton } from '../common/read-aloud.js';
import { SourceTag } from '../common/source-tag.js';
import type { ShownRecommendation } from './explained.js';

/** Short badges for every measurable effect, or the qualitative level when nothing is measured. */
function impactBadges(impact: Impact, t: Messages['plan']): string[] {
  if ('level' in impact) {
    return [t.level[impact.level]];
  }
  const badges: string[] = [];
  const pct = impact.exposureReductionPct;
  if ('indoorBeforeUgM3' in impact) {
    badges.push(t.indoor(impact.indoorBeforeUgM3, impact.indoorAfterUgM3));
  } else if (pct !== 0) {
    badges.push(pct > 0 ? t.exposure(pct) : t.exposureUp(-pct));
  }
  if ('co2SavedKgPerWeek' in impact && impact.co2SavedKgPerWeek > 0) {
    badges.push(t.co2(impact.co2SavedKgPerWeek));
  }
  return badges;
}

interface RecommendationCardProps {
  readonly item: ShownRecommendation;
  readonly memberNames: readonly string[];
}

/** One recommendation: what to do, its measured impact, why, how, and for whom. */
export function RecommendationCard({ item, memberNames }: RecommendationCardProps) {
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
      <ul className="flex flex-wrap items-center gap-2" aria-label={t.impact}>
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
        {/* A step written twice is shown once, so each text is a unique key. */}
        {[...new Set(item.steps)].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div>
        <ReadAloudButton
          text={[item.title, item.why, ...item.steps].join('. ')}
          subject={item.title}
        />
      </div>
    </article>
  );
}
