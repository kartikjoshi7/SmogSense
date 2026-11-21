/**
 * Numeric bounds of the API contract, and units of time. The Zod schemas, the form controls and
 * the engine all read them from here. This module imports nothing, so `src/core` may use it.
 */

/** An inclusive numeric range, used to build a schema and the form control for the same value. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

/** Clock hours, 00:00 to 23:00. */
export const CLOCK_HOURS = { min: 0, max: HOURS_PER_DAY - 1 } as const satisfies Range;

/** Latitude and longitude in decimal degrees. */
export const LATITUDE = { min: -90, max: 90 } as const satisfies Range;
export const LONGITUDE = { min: -180, max: 180 } as const satisfies Range;

/** Index values: India's NAQI and the US AQI both run from 0 to 500. */
export const INDEX_VALUES = { min: 0, max: 500 } as const satisfies Range;

/** A category's position on its scale: both scales have six, from 0 (best) to 5 (worst). */
export const INDEX_BANDS = { min: 0, max: 5 } as const satisfies Range;

/** Bounds on every number in a profile, shared by the schema and the setup form's inputs. */
export const PROFILE_LIMITS = {
  members: { min: 1, max: 8 },
  oneWayKm: { min: 0, max: 100 },
  daysPerWeek: { min: 0, max: 7 },
  durationMin: { min: 10, max: 180 },
  purifierCount: { min: 0, max: 5 },
  purifierCadrM3h: { min: 50, max: 1000 },
  roomAreaM2: { min: 5, max: 60 },
} as const satisfies Record<string, Range>;

/** Length of a city search, shared by the query schema and the search box. */
export const PLACE_QUERY_CHARS = { min: 2, max: 60 } as const satisfies Range;

/**
 * Chat size limits, shared by the request schema, the AI reply schema and the chat dialog.
 * An answer may be sent back as history, so a turn may be as long as the longest answer.
 */
export const CHAT_LIMITS = { questionChars: 500, historyTurns: 6, turnChars: 1200 } as const;
