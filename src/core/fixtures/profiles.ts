import type { Profile } from '../../shared/profile.js';

/**
 * The Sharma family in Delhi NCR: Riya drives 18 km to Gurugram, Aarav (8) has asthma and
 * Dadaji (68) has COPD and walks at 6:30 every morning. No purifier, cloth masks, LPG cooking.
 */
export const SHARMA_FAMILY: Profile = {
  members: [
    { id: 'riya', ageGroup: 'adult', conditions: [] },
    { id: 'aarav', ageGroup: 'child', conditions: ['asthma'] },
    { id: 'dadaji', ageGroup: 'senior', conditions: ['copd'] },
  ],
  commute: {
    mode: 'car_petrol',
    oneWayKm: 18,
    departHour: 8,
    returnHour: 18,
    daysPerWeek: 5,
    alternatives: ['metro', 'carpool'],
  },
  exercise: {
    activity: 'walk',
    memberId: 'dadaji',
    usualHour: 6,
    durationMin: 30,
    canMoveIndoors: true,
  },
  home: {
    purifierCount: 0,
    purifierCadrM3h: 250,
    roomAreaM2: 12,
    airtightness: 'average',
    cookingFuel: 'lpg',
    hasExhaustOrChimney: true,
    incense: 'sometimes',
    indoorSmoking: false,
  },
  mask: 'cloth',
};

/** Two healthy adults who run at 6 am and ride a two-wheeler 6 km to work. */
export const HEALTHY_COUPLE: Profile = {
  members: [
    { id: 'kabir', ageGroup: 'adult', conditions: [] },
    { id: 'meera', ageGroup: 'adult', conditions: [] },
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
  },
  mask: 'none',
};

/** A household that does not commute or exercise and already wears N95s indoors and out. */
export const HOMEBOUND_SENIOR: Profile = {
  members: [{ id: 'nani', ageGroup: 'senior', conditions: [] }],
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
  },
  mask: 'n95',
};
