/** The example household: the demo fills the form with it, and the engine tests plan for it. */
import type { Profile } from './profile.js';

/**
 * The Sharma family in Delhi NCR: Riya drives 18 km to Gurugram, Aarav (8) has asthma and
 * Dadaji (68) has COPD and walks at 6 every morning. No purifier, cloth masks, LPG cooking.
 */
export const DEMO_PROFILE: Profile = {
  members: [
    { id: 'm1', ageGroup: 'adult', conditions: [] },
    { id: 'm2', ageGroup: 'child', conditions: ['asthma'] },
    { id: 'm3', ageGroup: 'senior', conditions: ['copd'] },
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
    memberId: 'm3',
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
    heating: 'none',
  },
  mask: 'cloth',
};
