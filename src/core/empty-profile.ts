/** The household nobody has described yet: where setup starts and whom a community plan is for. */
import type { Profile } from '../shared/profile.js';
import { DEFAULT_PURIFIER_CADR_M3H } from './constants.js';

/** One healthy adult at home, with no commute or exercise filled in yet. */
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
