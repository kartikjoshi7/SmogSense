import { DEMO_PROFILE } from '../../shared/demo.js';
import type { Profile } from '../../shared/profile.js';

/** The Sharma family: the same household the demo fills in. */
export const SHARMA_FAMILY: Profile = DEMO_PROFILE;

/** Two healthy adults who run at 6 am and ride a two-wheeler 6 km to work. */
export const HEALTHY_COUPLE: Profile = {
  members: [
    { id: 'm1', ageGroup: 'adult', conditions: [] },
    { id: 'm2', ageGroup: 'adult', conditions: [] },
  ],
  commute: {
    mode: 'two_wheeler',
    oneWayKm: 6,
    departHour: 9,
    returnHour: 19,
    daysPerWeek: 5,
    alternatives: ['metro', 'cycle', 'walk', 'carpool', 'wfh'],
  },
  exercise: {
    activity: 'run',
    memberId: null,
    usualHour: 6,
    durationMin: 45,
    canMoveIndoors: false,
  },
  home: {
    purifierCount: 1,
    purifierCadrM3h: 300,
    roomAreaM2: 15,
    airtightness: 'leaky',
    cookingFuel: 'biomass',
    hasExhaustOrChimney: false,
    incense: 'never',
    indoorSmoking: true,
    heating: 'none',
  },
  mask: 'none',
};

/** A household that does not commute or exercise and already wears N95s indoors and out. */
export const HOMEBOUND_SENIOR: Profile = {
  members: [{ id: 'm1', ageGroup: 'senior', conditions: [] }],
  commute: {
    mode: 'none',
    oneWayKm: 0,
    departHour: 9,
    returnHour: 17,
    daysPerWeek: 0,
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
    purifierCount: 2,
    purifierCadrM3h: 400,
    roomAreaM2: 10,
    airtightness: 'sealed',
    cookingFuel: 'induction',
    hasExhaustOrChimney: true,
    incense: 'never',
    indoorSmoking: false,
    heating: 'none',
  },
  mask: 'n95',
};
