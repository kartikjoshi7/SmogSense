import { describe, expect, it } from 'vitest';
import type { Home } from '../shared/profile.js';
import { currentRoom, indoorHacks, indoorPm25 } from './indoor.js';

const home: Home = {
  purifierCount: 0,
  purifierCadrM3h: 250,
  roomAreaM2: 12,
  airtightness: 'average',
  cookingFuel: 'lpg',
  hasExhaustOrChimney: true,
  incense: 'never',
  indoorSmoking: false,
};

describe('indoorPm25', () => {
  it('reproduces the worked example: 12 m² room, outdoor 300 → about 200 indoors, 28 with a purifier', () => {
    const room = currentRoom(home, 300);

    expect(indoorPm25(room)).toBe(200);
    expect(indoorPm25({ ...room, cadrM3h: 250 })).toBe(28);
  });

  it('adds indoor smoke on top of what comes in from outside', () => {
    const room = currentRoom(home, 100);

    expect(indoorPm25({ ...room, sourceUgPerH: 20_000 })).toBeGreaterThan(indoorPm25(room) + 400);
  });
});

describe('indoorHacks', () => {
  it('offers a purifier, shut windows and sealing gaps for a basic home', () => {
    const hacks = indoorHacks(home, 300);

    expect(hacks).toEqual([
      { id: 'run_purifier', before: 200, after: 28 },
      { id: 'keep_windows_shut', before: 231, after: 200 },
      { id: 'seal_gaps', before: 200, after: 171 },
    ]);
  });

  it("uses the family's own purifier and skips sealing an already sealed home", () => {
    const hacks = indoorHacks(
      { ...home, purifierCount: 1, purifierCadrM3h: 400, airtightness: 'sealed' },
      300,
    );

    expect(hacks.map((h) => h.id)).toEqual(['run_purifier', 'keep_windows_shut']);
    expect(hacks[0]).toEqual({ id: 'run_purifier', before: 171, after: 10 });
  });

  it('adds incense and smoking when the household burns them indoors', () => {
    const hacks = indoorHacks({ ...home, incense: 'daily', indoorSmoking: true }, 300);
    const incense = hacks.find((h) => h.id === 'stop_incense');

    expect(hacks.map((h) => h.id)).toContain('no_indoor_smoking');
    expect(incense?.after).toBe(200);
    expect(incense?.before).toBeGreaterThan(600);
  });
});
