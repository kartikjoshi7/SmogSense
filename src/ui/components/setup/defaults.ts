/** The empty household a new setup starts from, and the example family. */
import { DEFAULT_PURIFIER_CADR_M3H } from '../../../core/constants.js';
import { DEMO_PROFILE } from '../../../shared/demo.js';
import type { Profile } from '../../../shared/profile.js';
import type { Household, SavedLocation } from '../../state/storage.js';

/** A one-adult household with nothing filled in yet. */
export const EMPTY_PROFILE: Profile = {
  members: [{ id: 'm1', ageGroup: 'adult', conditions: [] }],
  commute: {
    mode: 'none',
    oneWayKm: 0,
    departHour: 9,
    returnHour: 18,
    daysPerWeek: 5,
    alternatives: [],
  },
  exercise: {
    activity: 'none',
    memberId: null,
    usualHour: 7,
    durationMin: 30,
    canMoveIndoors: true,
  },
  home: {
    purifierCount: 0,
    purifierCadrM3h: DEFAULT_PURIFIER_CADR_M3H,
    roomAreaM2: 12,
    airtightness: 'average',
    cookingFuel: 'lpg',
    hasExhaustOrChimney: true,
    incense: 'never',
    indoorSmoking: false,
    heating: 'none',
  },
  mask: 'none',
};

/** The example family used in the demo: Riya commutes, Aarav has asthma, Dadaji has COPD. */
export const DEMO_HOUSEHOLD: Household = {
  profile: DEMO_PROFILE,
  names: { m1: 'Riya', m2: 'Aarav', m3: 'Dadaji' },
};

export const DEMO_LOCATION: SavedLocation = { lat: 28.61, lon: 77.21, label: 'New Delhi' };
