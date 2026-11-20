import { describe, expect, it } from 'vitest';
import { SHARMA_FAMILY } from '../core/fixtures/profiles.js';
import { profileSchema } from './profile.js';

describe('profileSchema', () => {
  it('accepts a complete household', () => {
    expect(profileSchema.parse(SHARMA_FAMILY)).toEqual(SHARMA_FAMILY);
  });

  it('rejects duplicate member ids', () => {
    const members = [...SHARMA_FAMILY.members, { id: 'riya', ageGroup: 'teen', conditions: [] }];

    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, members }).success).toBe(false);
  });

  it('rejects an exercising member who is not in the household', () => {
    const exercise = { ...SHARMA_FAMILY.exercise, memberId: 'stranger' };

    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, exercise }).success).toBe(false);
  });

  it.each([
    [
      'a member id that could carry a name',
      { members: [{ id: 'Riya Sharma', ageGroup: 'adult', conditions: [] }] },
    ],
    ['an empty household', { members: [] }],
    ['an impossible hour', { commute: { ...SHARMA_FAMILY.commute, departHour: 24 } }],
    ['a negative distance', { commute: { ...SHARMA_FAMILY.commute, oneWayKm: -1 } }],
    ['an unknown mask', { mask: 'bandana' }],
    ['a tiny room', { home: { ...SHARMA_FAMILY.home, roomAreaM2: 1 } }],
  ])('rejects %s', (_label, override) => {
    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, ...override }).success).toBe(false);
  });
});
