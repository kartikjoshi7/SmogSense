import type { Home } from '../shared/profile.js';
import {
  AIR_CHANGES_PER_H,
  CEILING_HEIGHT_M,
  DEFAULT_PURIFIER_CADR_M3H,
  INDOOR_DEPOSITION_PER_H,
  INDOOR_PENETRATION,
  INDOOR_SOURCE_UG_PER_H,
  TIGHTER_ENVELOPE,
} from './constants.js';

export interface RoomConditions {
  /** Outdoor PM2.5, µg/m³. */
  readonly outdoorPm25: number;
  readonly areaM2: number;
  readonly airChangesPerH: number;
  /** Purifier clean-air delivery rate, m³/h (0 = none running). */
  readonly cadrM3h: number;
  /** PM2.5 emitted indoors, µg/h. */
  readonly sourceUgPerH: number;
}

export type IndoorHackId =
  'run_purifier' | 'seal_gaps' | 'keep_windows_shut' | 'stop_incense' | 'no_indoor_smoking';

/** Indoor PM2.5 (µg/m³) before and after one change to the room. */
export interface IndoorHack {
  readonly id: IndoorHackId;
  readonly before: number;
  readonly after: number;
}

/**
 * Steady-state indoor PM2.5 in µg/m³ from a single-room mass balance:
 * C_in = (P·a·C_out + S/V) / (a + k + CADR/V), rounded to a whole number.
 */
export function indoorPm25(room: RoomConditions): number {
  const volume = room.areaM2 * CEILING_HEIGHT_M;
  const gains =
    INDOOR_PENETRATION * room.airChangesPerH * room.outdoorPm25 + room.sourceUgPerH / volume;
  const losses = room.airChangesPerH + INDOOR_DEPOSITION_PER_H + room.cadrM3h / volume;
  return Math.round(gains / losses);
}

/** The household's main room as it is today, without indoor smoke sources. */
export function currentRoom(home: Home, outdoorPm25: number): RoomConditions {
  return {
    outdoorPm25,
    areaM2: home.roomAreaM2,
    airChangesPerH: AIR_CHANGES_PER_H[home.airtightness],
    cadrM3h: home.purifierCount > 0 ? home.purifierCadrM3h : 0,
    sourceUgPerH: 0,
  };
}

function hack(id: IndoorHackId, before: RoomConditions, after: RoomConditions): IndoorHack {
  return { id, before: indoorPm25(before), after: indoorPm25(after) };
}

/**
 * Indoor changes that apply to this home, each with its estimated effect on the room's PM2.5:
 * running a purifier (a typical 250 m³/h unit if the family has none), sealing gaps, keeping
 * windows shut, and removing incense or tobacco smoke.
 */
export function indoorHacks(home: Home, outdoorPm25: number): IndoorHack[] {
  const room = currentRoom(home, outdoorPm25);
  const cadr = home.purifierCount > 0 ? home.purifierCadrM3h : DEFAULT_PURIFIER_CADR_M3H;
  const hacks = [
    hack('run_purifier', { ...room, cadrM3h: 0 }, { ...room, cadrM3h: cadr }),
    hack('keep_windows_shut', { ...room, airChangesPerH: AIR_CHANGES_PER_H.windows_open }, room),
  ];
  if (home.airtightness !== 'sealed') {
    const tighter = AIR_CHANGES_PER_H[TIGHTER_ENVELOPE[home.airtightness]];
    hacks.push(hack('seal_gaps', room, { ...room, airChangesPerH: tighter }));
  }
  if (home.incense !== 'never') {
    hacks.push(
      hack('stop_incense', { ...room, sourceUgPerH: INDOOR_SOURCE_UG_PER_H.incense }, room),
    );
  }
  if (home.indoorSmoking) {
    hacks.push(
      hack('no_indoor_smoking', { ...room, sourceUgPerH: INDOOR_SOURCE_UG_PER_H.smoking }, room),
    );
  }
  return hacks;
}
