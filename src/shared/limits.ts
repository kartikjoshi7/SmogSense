/**
 * Numeric bounds of the API contract, and units of time. The Zod schemas, the form controls and
 * the engine all read them from here. This module imports nothing, so `src/core` may use it.
 */

/** An inclusive numeric range, used to build a schema and the form control for the same value. */
export interface Range {
  readonly min: number;
  readonly max: number;
  /** Whole numbers only: the schema rejects fractions and the form asks for a whole number. */
  readonly whole?: boolean;
}

export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

/** Clock hours, 00:00 to 23:00. */
export const CLOCK_HOURS = { min: 0, max: HOURS_PER_DAY - 1, whole: true } as const satisfies Range;

/** Latitude and longitude in decimal degrees. */
export const LATITUDE = { min: -90, max: 90 } as const satisfies Range;
export const LONGITUDE = { min: -180, max: 180 } as const satisfies Range;

/** Longest IANA time zone name accepted from upstream (real names are under 40 characters). */
export const TIME_ZONE_CHARS = 64;

/** Most days of hourly air data accepted from upstream (a week). */
export const AIR_DATA_MAX_DAYS = 7;

/** Index values: India's NAQI and the US AQI both run from 0 to 500. */
export const INDEX_VALUES = { min: 0, max: 500, whole: true } as const satisfies Range;

/** A category's position on its scale: both scales have six, from 0 (best) to 5 (worst). */
export const INDEX_BANDS = { min: 0, max: 5, whole: true } as const satisfies Range;

/** Bounds on every number in a profile, shared by the schema and the setup form's inputs. */
export const PROFILE_LIMITS = {
  members: { min: 1, max: 8, whole: true },
  oneWayKm: { min: 0, max: 100 },
  daysPerWeek: { min: 0, max: 7, whole: true },
  durationMin: { min: 10, max: 180, whole: true },
  purifierCount: { min: 0, max: 5, whole: true },
  purifierCadrM3h: { min: 50, max: 1000 },
  roomAreaM2: { min: 5, max: 60 },
} as const satisfies Record<string, Range>;

/** Longest display name for a member (names stay on the device) and saved place label. */
export const MEMBER_NAME_CHARS = 40;
export const PLACE_LABEL_CHARS = 120;

/** Length of a city search, shared by the query schema and the search box. */
export const PLACE_QUERY_CHARS = { min: 2, max: 60 } as const satisfies Range;

/**
 * Chat size limits, shared by the request schema, the AI reply schema and the chat dialog.
 * An answer may be sent back as history, so a turn may be as long as the longest answer.
 */
export const CHAT_LIMITS = { questionChars: 500, historyTurns: 6, turnChars: 1200 } as const;
