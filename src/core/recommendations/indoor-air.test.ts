import { describe, expect, it } from 'vitest';
import type { Profile } from '../../shared/profile.js';
import { makeAir } from '../fixtures/air.js';
import { SHARMA_FAMILY } from '../fixtures/profiles.js';
import { findRecommendation as find, planFor as plan } from '../fixtures/recommendations.js';

/** The Sharma family, warming the main room with a coal fire. */
const ANGITHI: Profile = {
  ...SHARMA_FAMILY,
  home: { ...SHARMA_FAMILY.home, heating: 'coal_wood' },
};

describe('indoor air advice in the plan', () => {
  it('advises smoke-free heating, with the fire named and the room before and after', () => {
    const heating = find(plan(ANGITHI, makeAir({ scale: 2.4 })), 'safer_heating');

    expect(heating).toMatchObject({ category: 'indoor', facts: { heating: 'coal_wood' } });
    expect(heating?.impact.indoorBeforeUgM3).toBeGreaterThan(heating?.impact.indoorAfterUgM3 ?? 0);
    expect(heating?.impact.exposureReductionPct).toBeGreaterThan(50);
  });

  it('says nothing about heating for a home warmed electrically', () => {
    const electric: Profile = { ...ANGITHI, home: { ...ANGITHI.home, heating: 'electric' } };

    expect(find(plan(electric, makeAir({ scale: 2.4 })), 'safer_heating')).toBeUndefined();
  });
});
