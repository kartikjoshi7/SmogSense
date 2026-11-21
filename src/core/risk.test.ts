import { describe, expect, it } from 'vitest';
import type { Member } from '../shared/profile.js';
import { highRiskMemberIds, householdSensitivity, outdoorAdvice } from './risk.js';

const adult: Member = { id: 'a', ageGroup: 'adult', conditions: [] };
const child: Member = { id: 'c', ageGroup: 'child', conditions: [] };
const infant: Member = { id: 'i', ageGroup: 'infant', conditions: [] };
const senior: Member = { id: 's', ageGroup: 'senior', conditions: [] };
const asthmaticTeen: Member = { id: 't', ageGroup: 'teen', conditions: ['asthma'] };

describe('one member’s sensitivity', () => {
  it.each([
    [adult, 'normal'],
    [child, 'elevated'],
    [infant, 'high'],
    [senior, 'high'],
    [asthmaticTeen, 'high'],
  ] as const)('%o is %s', (member, expected) => {
    expect(householdSensitivity([member])).toBe(expected);
  });
});

describe('householdSensitivity', () => {
  it('takes the most sensitive member', () => {
    expect(householdSensitivity([adult])).toBe('normal');
    expect(householdSensitivity([adult, child])).toBe('elevated');
    expect(householdSensitivity([adult, child, senior])).toBe('high');
  });

  it('treats an empty list as normal', () => {
    expect(householdSensitivity([])).toBe('normal');
  });
});

describe('highRiskMemberIds', () => {
  it('lists only high-sensitivity members', () => {
    expect(highRiskMemberIds([adult, child, infant, asthmaticTeen])).toEqual(['i', 't']);
  });
});

describe('outdoorAdvice', () => {
  it.each([
    [0, 'high', 'ok'],
    [1, 'high', 'ok'],
    [2, 'normal', 'ok'],
    [2, 'high', 'reduce'],
    [3, 'elevated', 'reduce'],
    [3, 'high', 'avoid'],
    [4, 'normal', 'avoid'],
    [4, 'high', 'stay_indoors'],
    [5, 'normal', 'stay_indoors'],
  ] as const)('band %d with %s sensitivity → %s', (band, sensitivity, expected) => {
    expect(outdoorAdvice(band, sensitivity)).toBe(expected);
  });
});
