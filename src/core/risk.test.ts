import { describe, it, expect } from 'vitest';
import type { Member } from '../shared/schemas.js';
import { memberSensitivity, householdSensitivity, outdoorAdvice } from './risk.js';

describe('risk', () => {
  describe('memberSensitivity', () => {
    it('returns high for members with any condition', () => {
      const adultWithAsthma: Member = { id: 'm1', ageGroup: 'adult', conditions: ['asthma'] };
      expect(memberSensitivity(adultWithAsthma)).toBe('high');

      const teenWithCopd: Member = { id: 'm2', ageGroup: 'teen', conditions: ['copd'] };
      expect(memberSensitivity(teenWithCopd)).toBe('high');
    });

    it('returns high for infants and seniors regardless of conditions', () => {
      const infant: Member = { id: 'm3', ageGroup: 'infant', conditions: [] };
      expect(memberSensitivity(infant)).toBe('high');

      const senior: Member = { id: 'm4', ageGroup: 'senior', conditions: [] };
      expect(memberSensitivity(senior)).toBe('high');
    });

    it('returns elevated for children without conditions', () => {
      const child: Member = { id: 'm5', ageGroup: 'child', conditions: [] };
      expect(memberSensitivity(child)).toBe('elevated');
    });

    it('returns normal for teens and adults without conditions', () => {
      const teen: Member = { id: 'm6', ageGroup: 'teen', conditions: [] };
      expect(memberSensitivity(teen)).toBe('normal');

      const adult: Member = { id: 'm7', ageGroup: 'adult', conditions: [] };
      expect(memberSensitivity(adult)).toBe('normal');
    });
  });

  describe('householdSensitivity', () => {
    it('returns normal for empty household or only normal members', () => {
      expect(householdSensitivity([])).toBe('normal');

      const normalMembers: Member[] = [
        { id: 'm1', ageGroup: 'adult', conditions: [] },
        { id: 'm2', ageGroup: 'teen', conditions: [] },
      ];
      expect(householdSensitivity(normalMembers)).toBe('normal');
    });

    it('returns elevated if highest member is elevated', () => {
      const members: Member[] = [
        { id: 'm1', ageGroup: 'adult', conditions: [] },
        { id: 'm2', ageGroup: 'child', conditions: [] },
      ];
      expect(householdSensitivity(members)).toBe('elevated');
    });

    it('returns high if any member is high', () => {
      const members: Member[] = [
        { id: 'm1', ageGroup: 'adult', conditions: [] },
        { id: 'm2', ageGroup: 'child', conditions: [] },
        { id: 'm3', ageGroup: 'adult', conditions: ['heart'] },
      ];
      expect(householdSensitivity(members)).toBe('high');
    });
  });

  describe('outdoorAdvice', () => {
    it('returns ok for bands 0 and 1 for all sensitivities', () => {
      for (const band of [0, 1]) {
        expect(outdoorAdvice(band, 'normal')).toBe('ok');
        expect(outdoorAdvice(band, 'elevated')).toBe('ok');
        expect(outdoorAdvice(band, 'high')).toBe('ok');
      }
    });

    it('handles band 2: reduce for high, ok otherwise', () => {
      expect(outdoorAdvice(2, 'high')).toBe('reduce');
      expect(outdoorAdvice(2, 'elevated')).toBe('ok');
      expect(outdoorAdvice(2, 'normal')).toBe('ok');
    });

    it('handles band 3: avoid for high, reduce otherwise', () => {
      expect(outdoorAdvice(3, 'high')).toBe('avoid');
      expect(outdoorAdvice(3, 'elevated')).toBe('reduce');
      expect(outdoorAdvice(3, 'normal')).toBe('reduce');
    });

    it('handles band 4: stay_indoors for high, avoid otherwise', () => {
      expect(outdoorAdvice(4, 'high')).toBe('stay_indoors');
      expect(outdoorAdvice(4, 'elevated')).toBe('avoid');
      expect(outdoorAdvice(4, 'normal')).toBe('avoid');
    });

    it('handles band 5: stay_indoors for everyone', () => {
      expect(outdoorAdvice(5, 'high')).toBe('stay_indoors');
      expect(outdoorAdvice(5, 'elevated')).toBe('stay_indoors');
      expect(outdoorAdvice(5, 'normal')).toBe('stay_indoors');
      expect(outdoorAdvice(6, 'normal')).toBe('stay_indoors');
    });
  });
});
