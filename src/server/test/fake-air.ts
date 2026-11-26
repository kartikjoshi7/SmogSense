import { makeAir } from '../../core/fixtures/air.js';
import { ok } from '../../core/result.js';
import type { AirService } from '../air/air-service.js';

/** The one place every fake place search returns. */
export const GURUGRAM = {
  name: 'Gurugram',
  region: 'Haryana',
  country: 'India',
  lat: 28.46,
  lon: 77.03,
};

/** An air service stand-in: the fixture Delhi day for any place, and Gurugram for any search. */
export function fakeAir(overrides: Partial<AirService> = {}): AirService {
  return {
    getAir: () => Promise.resolve(ok(makeAir())),
    searchPlaces: () => Promise.resolve(ok([GURUGRAM])),
    ...overrides,
  };
}
