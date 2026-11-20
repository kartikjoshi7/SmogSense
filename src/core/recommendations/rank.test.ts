import { describe, expect, it } from 'vitest';
import type { Recommendation } from '../../shared/plan.js';
import { rank, score } from './rank.js';

type Unranked = Omit<Recommendation, 'priority'>;

function rec(overrides: Partial<Unranked>): Unranked {
  return {
    id: 'wet_mopping',
    category: 'indoor',
    effort: 'low',
    memberIds: [],
    impact: {},
    facts: {},
    ...overrides,
  };
}

const smoggy = { band: 3, sensitivity: 'normal', severity: 'restrict' } as const;

describe('score', () => {
  it('weights measured exposure cuts by band and sensitivity', () => {
    const r = rec({ impact: { exposureReductionPct: 50 } });

    expect(score(r, smoggy)).toBe(200);
    expect(score(r, { ...smoggy, sensitivity: 'high' })).toBe(400);
  });

  it('values described benefits by their level and ignores exposure increases', () => {
    expect(score(rec({ impact: { level: 'high' } }), smoggy)).toBe(120);
    expect(score(rec({ impact: { exposureReductionPct: -20 } }), smoggy)).toBe(0);
    expect(score(rec({ impact: {} }), smoggy)).toBe(0);
  });

  it('adds CO₂ savings and subtracts effort', () => {
    const swap = rec({
      effort: 'high',
      impact: { co2SavedKgPerWeek: 10, exposureReductionPct: 0 },
    });

    expect(score(swap, smoggy)).toBe(5);
  });

  it('puts protection, purifiers and indoor exercise first in an emergency', () => {
    const emergency = { ...smoggy, band: 5, severity: 'emergency' } as const;
    const mask = rec({ id: 'n95_outdoors', category: 'protection', impact: { level: 'low' } });
    const purifier = rec({ id: 'run_purifier', impact: { level: 'low' } });
    const mopping = rec({ impact: { level: 'high' } });

    expect(score(mask, emergency)).toBeGreaterThan(score(mopping, emergency));
    expect(score(purifier, emergency)).toBeGreaterThan(score(mopping, emergency));
    expect(score(mask, smoggy)).toBeLessThan(score(mopping, smoggy));
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
