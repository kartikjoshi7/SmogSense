/**
 * The indoor mass-balance model: penetration, deposition, air changes and indoor sources.
 * Sources: docs/ARCHITECTURE.md › Assumptions behind the numbers.
 */
import type { Airtightness, CookingFuel } from '../../shared/profile.js';

// ---------------------------------------------------------------- Indoor air (mass-balance model)

/** Share of outdoor PM2.5 that penetrates the building envelope (estimate; typical 0.6–1.0). */
export const INDOOR_PENETRATION = 0.8;

/** PM2.5 loss to indoor surfaces, per hour (estimate; typical 0.1–0.4). */
export const INDOOR_DEPOSITION_PER_H = 0.2;

/** Air changes per hour for each envelope, plus windows open (estimates). */
export const AIR_CHANGES_PER_H: Readonly<Record<Airtightness | 'windows_open', number>> = {
  leaky: 1.5,
  average: 1.0,
  sealed: 0.5,
  windows_open: 5.0,
};

/** One step tighter for the "seal gaps" advice. */
export const TIGHTER_ENVELOPE: Readonly<Record<Airtightness, Airtightness>> = {
  leaky: 'average',
  average: 'sealed',
  sealed: 'sealed',
};

/** Ceiling height used to turn floor area into room volume, in metres (estimate). */
export const CEILING_HEIGHT_M = 2.8;

/** Clean-air delivery rate assumed for a typical home purifier, m³/h (estimate). */
export const DEFAULT_PURIFIER_CADR_M3H = 250;

/** Cooking fuels that fill the home with smoke: solid biomass and kerosene (WHO household-energy guidance). */
export const SMOKY_FUELS: readonly CookingFuel[] = ['biomass', 'kerosene'];

/**
 * PM2.5 emitted while burning, µg/h (order-of-magnitude estimates). `kerosene` and `coal_wood`
 * are room heaters: an unvented kerosene heater, and a coal or wood fire (angithi) that burns
 * like a stove with no chimney.
 */
export const INDOOR_SOURCE_UG_PER_H = {
  incense: 20_000,
  smoking: 25_000,
  kerosene: 10_000,
  coal_wood: 100_000,
} as const;
