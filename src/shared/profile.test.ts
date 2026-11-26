import { describe, expect, it } from 'vitest';
import { SHARMA_FAMILY } from '../core/fixtures/profiles.js';
import { profileSchema } from './profile.js';

describe('profileSchema', () => {
  it('accepts a complete household', () => {
    expect(profileSchema.parse(SHARMA_FAMILY)).toEqual(SHARMA_FAMILY);
  });

  it('accepts only opaque member ids, so a name cannot reach the server as an id', () => {
    const named = [{ id: 'riya', ageGroup: 'adult', conditions: [] }];

    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, members: named }).success).toBe(false);
    expect(profileSchema.safeParse(SHARMA_FAMILY).success).toBe(true);
  });

  it('rejects duplicate member ids', () => {
    const members = [...SHARMA_FAMILY.members, { id: 'm1', ageGroup: 'teen', conditions: [] }];

    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, members }).success).toBe(false);
  });

  it('rejects a condition or a commute alternative listed twice', () => {
    const members = [{ id: 'm1', ageGroup: 'child', conditions: ['asthma', 'asthma'] }];
    const commute = { ...SHARMA_FAMILY.commute, alternatives: ['metro', 'metro'] };

    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, members }).success).toBe(false);
    expect(profileSchema.safeParse({ ...SHARMA_FAMILY, commute }).success).toBe(false);
  });

  it('rejects an exercising member who is not in the household', () => {
    const exercise = { ...SHARMA_FAMILY.exercise, memberId: 'm9' };

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
