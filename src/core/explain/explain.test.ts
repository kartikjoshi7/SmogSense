import { describe, expect, it } from 'vitest';
import type { Language } from '../../shared/languages.js';
import { planSchema, recommendationIdSchema, type Plan } from '../../shared/plan.js';
import { makeAir } from '../fixtures/air.js';
import { SHARMA_FAMILY } from '../fixtures/profiles.js';
import {
  findRecommendation,
  SAMPLE_RECOMMENDATIONS as SAMPLE,
} from '../fixtures/recommendations.js';
import { buildPlan } from '../plan.js';
import {
  categoryLabel,
  explainRecommendation,
  fallbackChatAnswer,
  fallbackCommunityNotice,
  planHeadline,
  planSummary,
  scaleLabel,
} from './index.js';

function severePlan(): Plan {
  const result = buildPlan(SHARMA_FAMILY, makeAir({ scale: 2.4 }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('scale names', () => {
  it('names each index scale in both languages', () => {
    expect(scaleLabel('naqi', 'en')).toBe('India AQI');
    expect(scaleLabel('naqi', 'hi')).toBe('भारत AQI');
    expect(scaleLabel('us_aqi', 'en')).toBe('US AQI');
  });
});

describe.each(['en', 'hi'] as const)('standard guidance in %s', (lang) => {
  it('explains every recommendation id without blanks', () => {
    expect(Object.keys(SAMPLE)).toEqual(recommendationIdSchema.options);
    for (const [id, sample] of Object.entries(SAMPLE)) {
      const explanation = explainRecommendation(sample, lang);

      expect(explanation.title.length, id).toBeGreaterThan(3);
      expect(explanation.why.length, id).toBeGreaterThan(10);
      expect(explanation.steps.length, id).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(explanation), id).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('explains a swap that only cuts the commute dose, and says what CO₂ it adds', () => {
    const adds = explainRecommendation(
      { ...SAMPLE.switch_to_metro, impact: { co2SavedKgPerWeek: -0.4, exposureReductionPct: 96 } },
      lang,
    ).why;
    const neutral = explainRecommendation(
      { ...SAMPLE.switch_to_cycle, impact: { co2SavedKgPerWeek: 0, exposureReductionPct: 30 } },
      lang,
    ).why;

    expect(adds).toMatch(/96%.*0\.4 kg/);
    expect(neutral).toMatch(/30%/);
    expect(neutral).not.toMatch(/kg/);
  });

  it("quotes the engine's numbers", () => {
    const plan = severePlan();
    const purifier = findRecommendation(plan, 'run_purifier');
    const commute = findRecommendation(plan, 'commute_protection');

    expect(purifier && explainRecommendation(purifier, lang).why).toMatch(/201.*28.*86%/);
    expect(commute && explainRecommendation(commute, lang).steps[0]).toMatch(/08:00.*18:00/);
  });

  it('describes exposure gains, losses and neutral swaps differently', () => {
    const better = explainRecommendation(
      { ...SAMPLE.switch_to_metro, impact: { co2SavedKgPerWeek: 27, exposureReductionPct: 14 } },
      lang,
    );
    const worse = explainRecommendation(
      { ...SAMPLE.switch_to_bus, impact: { co2SavedKgPerWeek: 20, exposureReductionPct: -30 } },
      lang,
    );
    const neutral = explainRecommendation(
      { ...SAMPLE.carpool, impact: { co2SavedKgPerWeek: 20.4, exposureReductionPct: 0 } },
      lang,
    );

    expect(better.why).toMatch(/27.*14%/);
    expect(worse.why).toMatch(/30%.*N95/);
    expect(neutral.why).toContain('20.4');
    expect(neutral.why).not.toContain('%');
  });

  it('adapts to what the household already has', () => {
    const purifier = SAMPLE.run_purifier;
    const owned = explainRecommendation(
      { ...purifier, facts: { ...purifier.facts, purifiersOwned: 1 } },
      lang,
    );
    const none = explainRecommendation(
      { ...purifier, facts: { ...purifier.facts, purifiersOwned: 0 } },
      lang,
    );
    const smoky = explainRecommendation(
      { ...SAMPLE.cooking_ventilation, facts: { cookingFuel: 'biomass', hasExhaust: true } },
      lang,
    );
    const noFan = explainRecommendation(
      { ...SAMPLE.cooking_ventilation, facts: { cookingFuel: 'lpg', hasExhaust: false } },
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

  it('words every headline without naming a category, so it fits both scales', () => {
    const plan = severePlan();
    const categories = planSchema.shape.index.shape.category.options.map((category) =>
      categoryLabel(category, lang),
    );

    for (const severity of ['normal', 'caution', 'restrict', 'emergency'] as const) {
      const headline = planHeadline({ ...plan, severity }, lang).toLowerCase();

      expect(
        categories.filter((name) => headline.includes(name.toLowerCase())),
        severity,
      ).toEqual([]);
    }
  });

  it('asks a community for as much care as the day needs, and no more', () => {
    const plan = severePlan();
    const normal = fallbackCommunityNotice({ ...plan, severity: 'normal' }, 'school', lang);
    const emergency = fallbackCommunityNotice(plan, 'school', lang);

    expect(emergency).toContain('N95');
    expect(normal).not.toContain('N95');
    expect(normal).toContain(planHeadline({ ...plan, severity: 'normal' }, lang));
  });

  it('builds fallback chat answers and community notices from the plan', () => {
    const plan = severePlan();
    const topTitle = explainRecommendation(
      plan.recommendations[0] ?? SAMPLE.share_notice,
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
