/** The example family and its place, which the demo button fills in. */
import { DEMO_PROFILE } from '../../../shared/demo.js';
import type { Household, SavedLocation } from '../../state/storage.js';

/** The example family used in the demo: Riya commutes, Aarav has asthma, Dadaji has COPD. */
export const DEMO_HOUSEHOLD: Household = {
  profile: DEMO_PROFILE,
  names: { m1: 'Riya', m2: 'Aarav', m3: 'Dadaji' },
};

export const DEMO_LOCATION: SavedLocation = { lat: 28.61, lon: 77.21, label: 'New Delhi' };
