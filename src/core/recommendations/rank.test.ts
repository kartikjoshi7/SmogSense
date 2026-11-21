import { describe, expect, it } from 'vitest';
import type { Recommendation } from '../../shared/plan.js';
import { rank, type RankingContext } from './rank.js';

type Unranked = Omit<Recommendation, 'priority'>;

function rec(overrides: Partial<Unranked>): Unranked {
  return {
    id: 'wet_mopping',
    category: 'indoor',
    effort: 'low',
    memberIds: [],
    impact: { exposureReductionPct: 0 },
    facts: {},
    ...overrides,
  };
}

const smoggy = { band: 3, sensitivity: 'normal', severity: 'restrict' } as const;

/** The order rank() puts recommendations in. */
function order(recs: readonly Unranked[], ctx: RankingContext): string[] {
  return rank(recs, ctx).map((r) => r.id);
}

describe('ranking weights', () => {
  it('weights measured exposure cuts by sensitivity, against unweighted CO₂ savings', () => {
    const seal = rec({ id: 'seal_gaps', impact: { exposureReductionPct: 20 } });
    const metro = rec({
      id: 'switch_to_metro',
      impact: { co2SavedKgPerWeek: 50, exposureReductionPct: 0 },
    });

    expect(order([seal, metro], smoggy)).toEqual(['switch_to_metro', 'seal_gaps']);
    expect(order([seal, metro], { ...smoggy, sensitivity: 'high' })).toEqual([
      'seal_gaps',
      'switch_to_metro',
    ]);
  });

  it('values described benefits by their level and counts exposure increases as zero', () => {
    const ranked = order(
      [
        rec({ id: 'wet_mopping', impact: { exposureReductionPct: 0 } }),
        rec({ id: 'switch_to_walk', impact: { exposureReductionPct: -20 } }),
        rec({ id: 'ncr_grap_check', impact: { level: 'high' } }),
      ],
      smoggy,
    );

    expect(ranked).toEqual(['ncr_grap_check', 'switch_to_walk', 'wet_mopping']);
  });

  it('adds CO₂ savings and subtracts effort', () => {
    const lowEffort = rec({ id: 'wet_mopping', impact: { level: 'low' } });
    const highEffort = rec({ id: 'carpool', effort: 'high', impact: { level: 'low' } });
    const moreCo2 = rec({
      id: 'switch_to_bus',
      impact: { co2SavedKgPerWeek: 10, exposureReductionPct: 0 },
    });
    const lessCo2 = rec({
      id: 'carpool',
      impact: { co2SavedKgPerWeek: 5, exposureReductionPct: 0 },
    });

    expect(order([highEffort, lowEffort], smoggy)).toEqual(['wet_mopping', 'carpool']);
    expect(order([lessCo2, moreCo2], smoggy)).toEqual(['switch_to_bus', 'carpool']);
  });

  it('puts protection, purifiers and indoor exercise first in an emergency', () => {
    const emergency = { ...smoggy, band: 5, severity: 'emergency' } as const;
    const recs = [
      rec({ id: 'wet_mopping', impact: { level: 'high' } }),
      rec({ id: 'n95_outdoors', category: 'protection', impact: { level: 'low' } }),
      rec({ id: 'run_purifier', impact: { level: 'low' } }),
    ];

    expect(order(recs, emergency)).toEqual(['n95_outdoors', 'run_purifier', 'wet_mopping']);
    expect(order(recs, smoggy)[0]).toBe('wet_mopping');
  });
});

describe('rank', () => {
  it('orders by score, breaks ties by id and numbers priorities from 1', () => {
    const ranked = rank(
      [
        rec({ id: 'share_notice', impact: { level: 'low' } }),
        rec({ id: 'seal_gaps', impact: { exposureReductionPct: 40 } }),
        rec({ id: 'report_open_burning', impact: { level: 'low' } }),
      ],
      smoggy,
    );

    expect(ranked.map((r) => [r.priority, r.id])).toEqual([
      [1, 'seal_gaps'],
      [2, 'report_open_burning'],
      [3, 'share_notice'],
    ]);
  });
});
