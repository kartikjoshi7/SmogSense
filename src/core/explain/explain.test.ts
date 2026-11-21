import { describe, expect, it } from 'vitest';
import type { Language } from '../../shared/api.js';
import { planSchema, type Plan, type Recommendation } from '../../shared/plan.js';
import { makeAir } from '../fixtures/air.js';
import { SHARMA_FAMILY } from '../fixtures/profiles.js';
import { buildPlan } from '../plan.js';
import {
  categoryLabel,
  explainRecommendation,
  fallbackChatAnswer,
  fallbackCommunityNotice,
  planHeadline,
  planSummary,
} from './index.js';

const ALL_IDS = planSchema.shape.recommendations.element.shape.id.options;

function rec(id: Recommendation['id'], overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id,
    category: 'routine',
    priority: 1,
    effort: 'low',
    memberIds: [],
    impact: {},
    facts: {},
    ...overrides,
  };
}

function severePlan(): Plan {
  const result = buildPlan(SHARMA_FAMILY, makeAir({ scale: 2.4 }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

function find(plan: Plan, id: Recommendation['id']): Recommendation {
  const found = plan.recommendations.find((r) => r.id === id);
  if (found === undefined) {
    throw new Error(`missing ${id}`);
  }
  return found;
}

describe.each(['en', 'hi'] as const)('standard guidance in %s', (lang) => {
  it('explains every recommendation id, even with no facts, without blanks', () => {
    for (const id of ALL_IDS) {
      const explanation = explainRecommendation(rec(id), lang);

      expect(explanation.title.length, id).toBeGreaterThan(3);
      expect(explanation.why.length, id).toBeGreaterThan(10);
      expect(explanation.steps.length, id).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(explanation), id).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it("quotes the engine's numbers", () => {
    const plan = severePlan();
    const purifier = explainRecommendation(find(plan, 'run_purifier'), lang);
    const commute = explainRecommendation(find(plan, 'commute_protection'), lang);

    expect(purifier.why).toMatch(/201.*28.*86%/);
    expect(commute.steps[0]).toMatch(/08:00.*18:00/);
  });

  it('describes exposure gains, losses and neutral swaps differently', () => {
    const better = explainRecommendation(
      rec('switch_to_metro', { impact: { co2SavedKgPerWeek: 27, exposureReductionPct: 14 } }),
      lang,
    );
    const worse = explainRecommendation(
      rec('switch_to_bus', { impact: { co2SavedKgPerWeek: 20, exposureReductionPct: -30 } }),
      lang,
    );
    const neutral = explainRecommendation(
      rec('carpool', { impact: { co2SavedKgPerWeek: 20.4, exposureReductionPct: 0 } }),
      lang,
    );

    expect(better.why).toMatch(/27.*14%/);
    expect(worse.why).toMatch(/30%.*N95/);
    expect(neutral.why).toContain('20.4');
    expect(neutral.why).not.toContain('%');
  });

  it('adapts to what the household already has', () => {
    const owned = explainRecommendation(
      rec('run_purifier', { facts: { purifiersOwned: 1 } }),
      lang,
    );
    const none = explainRecommendation(rec('run_purifier', { facts: { purifiersOwned: 0 } }), lang);
    const smoky = explainRecommendation(
      rec('cooking_ventilation', { facts: { cookingFuel: 'biomass', hasExhaust: 'yes' } }),
      lang,
    );
    const noFan = explainRecommendation(
      rec('cooking_ventilation', { facts: { cookingFuel: 'lpg', hasExhaust: 'no' } }),
      lang,
    );

    expect(owned.title).not.toBe(none.title);
    expect(smoky.why).not.toBe(noFan.why);
  });

  it('summarises the day from the inversion, the cleanest hour or the reading alone', () => {
    const plan = severePlan();
    const trapped = planSummary(plan, lang);
    const clear = planSummary(
      { ...plan, inversion: { ...plan.inversion, trappedNow: false } },
      lang,
    );
    const bare = planSummary(
      { ...plan, inversion: { ...plan.inversion, trappedNow: false }, cleanestHour: null },
      lang,
    );

    expect(trapped).toContain('12:00');
    expect(clear).toContain('14:00');
    expect(bare).toContain(String(plan.index.value));
    expect(bare.length).toBeLessThan(clear.length);
    expect(planHeadline(plan, lang).length).toBeGreaterThan(5);
    expect(categoryLabel('severe', lang).length).toBeGreaterThan(2);
  });

  it('builds fallback chat answers and community notices from the plan', () => {
    const plan = severePlan();
    const topTitle = explainRecommendation(
      plan.recommendations[0] ?? rec('share_notice'),
      lang,
    ).title;

    expect(fallbackChatAnswer(plan, lang)).toContain(topTitle);
    for (const audience of ['housing_society', 'school', 'workplace'] as const) {
      expect(fallbackCommunityNotice(plan, audience, lang)).toContain(String(plan.index.value));
    }
  });
});

describe('languages without standard guidance', () => {
  it.each(['bn', 'ta', 'pa'] satisfies Language[])('%s falls back to English', (lang) => {
    expect(categoryLabel('very_poor', lang)).toBe('Very poor');
  });
});
