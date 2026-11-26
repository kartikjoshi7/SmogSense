/** The ranked recommendations, one tab per category. */
import { useId } from 'react';
import { recommendationCategorySchema } from '../../../shared/recommendation.js';
import { memberName } from '../../members.js';
import { useMessages } from '../../state/app-context.js';
import type { Household } from '../../state/storage.js';
import { CategoryTabs } from './category-tabs.js';
import type { ShownRecommendation } from './explained.js';
import { RecommendationCard } from './recommendation-card.js';

interface PlanSectionProps {
  readonly items: readonly ShownRecommendation[];
  readonly household: Household;
}

/** The ranked plan, grouped under the problem's own headings, one tab per category. */
export function PlanSection({ items, household }: PlanSectionProps) {
  const headingId = useId();
  const t = useMessages();
  const { members } = household.profile;
  const tabs = recommendationCategorySchema.options.map((category) => {
    const inCategory = items.filter((item) => item.rec.category === category);
    return {
      key: category,
      label: `${t.plan.categories[category]} (${inCategory.length})`,
      content:
        inCategory.length === 0 ? (
          <p className="muted">{t.plan.empty}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inCategory.map((item) => (
              <RecommendationCard
                key={item.rec.id}
                item={item}
                memberNames={item.rec.memberIds.map((id) =>
                  memberName(members, household.names, id, t.setup.household.member),
                )}
              />
            ))}
          </div>
        ),
    };
  });
  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <h2 id={headingId} className="text-xl font-semibold">
        {t.plan.title}
      </h2>
      <CategoryTabs label={t.plan.title} items={tabs} />
    </section>
  );
}
