import { describe, expect, it } from 'vitest';
import type { Profile } from '../../shared/profile.js';
import { makeAir, MODERATE, SEVERE } from '../fixtures/air.js';
import { SHARMA_FAMILY } from '../fixtures/profiles.js';
import {
  findRecommendation as find,
  idsOf as ids,
  planFor as plan,
} from '../fixtures/recommendations.js';

/** The Sharma family, but Riya walks 2 km to work and could take the metro instead. */
const WALKER: Profile = {
  ...SHARMA_FAMILY,
  commute: { ...SHARMA_FAMILY.commute, mode: 'walk', oneWayKm: 2, alternatives: ['metro'] },
};

describe('commute alternatives in the plan', () => {
  it('suggests walking to work on a moderate day but not when exertion outdoors is unsafe', () => {
    const shortDrive: Profile = {
      ...SHARMA_FAMILY,
      commute: { ...SHARMA_FAMILY.commute, oneWayKm: 2, alternatives: ['walk', 'cycle', 'metro'] },
    };

    expect(ids(plan(shortDrive, makeAir({ scale: MODERATE })))).toContain('switch_to_walk');
    const severe = ids(plan(shortDrive, makeAir({ scale: SEVERE })));
    expect(severe).not.toContain('switch_to_walk');
    expect(severe).not.toContain('switch_to_cycle');
    expect(severe).toContain('switch_to_metro');
  });

  it('offers a walker the metro as protection on a smoggy day, with the CO₂ it adds', () => {
    const metro = find(plan(WALKER, makeAir({ scale: SEVERE })), 'switch_to_metro');

    expect(metro?.category).toBe('protection');
    expect(metro?.impact.co2SavedKgPerWeek).toBeLessThan(0);
    expect(metro?.impact.exposureReductionPct).toBeGreaterThanOrEqual(10);
  });

  it('does not suggest it on a clean day, when the walk does no harm', () => {
    const clean = makeAir({ pm25Day: Array<number>(24).fill(20) });

    expect(ids(plan(WALKER, clean))).not.toContain('switch_to_metro');
  });
});
