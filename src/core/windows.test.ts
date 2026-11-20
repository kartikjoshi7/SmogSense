import { describe, it, expect } from 'vitest';
import type { Daylight, HourlyReading } from '../shared/schemas.js';
import { isDaylight, hourDistance, bestActivityWindow, ventilationHour } from './windows.js';

describe('windows', () => {
  const sampleDaylight: Daylight[] = [
    { sunrise: '2026-11-20T06:00:00Z', sunset: '2026-11-20T18:00:00Z' },
    { sunrise: '2026-11-21T06:00:00Z', sunset: '2026-11-21T18:00:00Z' },
  ];

  describe('isDaylight', () => {
    it('detects hours within daylight', () => {
      expect(isDaylight('2026-11-20T07:00:00Z', sampleDaylight)).toBe(true);
      expect(isDaylight('2026-11-20T18:00:00Z', sampleDaylight)).toBe(true);
      expect(isDaylight('2026-11-20T05:00:00Z', sampleDaylight)).toBe(false);
      expect(isDaylight('2026-11-20T21:00:00Z', sampleDaylight)).toBe(false);
    });

    it('falls back to string comparison if timestamps are non-standard', () => {
      const daylight = [{ sunrise: '06:00', sunset: '18:00' }];
      expect(isDaylight('12:00', daylight)).toBe(true);
      expect(isDaylight('05:00', daylight)).toBe(false);
    });
  });

  describe('hourDistance', () => {
    it('computes circular clock distance', () => {
      expect(hourDistance(8, 8)).toBe(0);
      expect(hourDistance(8, 10)).toBe(2);
      expect(hourDistance(10, 8)).toBe(2);
      expect(hourDistance(23, 1)).toBe(2);
      expect(hourDistance(1, 23)).toBe(2);
      expect(hourDistance(0, 12)).toBe(12);
    });
  });

  describe('bestActivityWindow', () => {
    function createHourlyReadings(
      startHour: number,
      hoursCount: number,
      pm25Fn: (hour: number, index: number) => number | null,
    ): HourlyReading[] {
      return Array.from({ length: hoursCount }, (_, i) => {
        const hour = (startHour + i) % 24;
        const day = 20 + Math.floor((startHour + i) / 24);
        const dayStr = String(day);
        const hourStr = String(hour).padStart(2, '0');
        return {
          time: `2026-11-${dayStr}T${hourStr}:00:00Z`,
          hour,
          pm25: pm25Fn(hour, i),
          pm10: null,
          no2: null,
          o3: null,
          co: null,
          so2: null,
          blhM: null,
          windKmh: null,
        };
      });
    }

    it('finds best window in daytime and calculates reductionPct against usualHour', () => {
      const hourly = createHourlyReadings(0, 24, (h) => {
        if (h === 7) {
          return 200;
        }
        if (h === 14) {
          return 50;
        }
        return 120;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 60, 7);
      expect(res).not.toBeNull();
      expect(res?.startHour).toBe(14);
      expect(res?.meanPm25).toBe(50);
      expect(res?.usualMeanPm25).toBe(200);
      expect(res?.reductionPct).toBe(75);
    });

    it('handles evening looking ahead to tomorrow daylight', () => {
      const hourly = createHourlyReadings(20, 30, (_h, idx) => {
        if (idx === 14) {
          return 40;
        }
        return 150;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 30, 7);
      expect(res).not.toBeNull();
      expect(res?.startHour).toBe(10);
      expect(res?.meanPm25).toBe(40);
    });

    it('breaks ties in window selection by closeness to usualHour', () => {
      const hourly = createHourlyReadings(0, 24, (h) => {
        if (h === 8 || h === 16) {
          return 60;
        }
        return 150;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 45, 7);
      expect(res).not.toBeNull();
      expect(res?.startHour).toBe(8);
      expect(res?.meanPm25).toBe(60);
    });

    it('keeps earlier window when both PM2.5 and distance to usualHour are tied', () => {
      const hourly = createHourlyReadings(0, 24, (h) => {
        if (h === 10 || h === 14) {
          return 70;
        }
        return 180;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 60, 12);
      expect(res).not.toBeNull();
      expect(res?.startHour).toBe(10);
    });

    it('averages over multi-hour activity duration', () => {
      const hourly = createHourlyReadings(0, 24, (h) => {
        if (h === 10) {
          return 80;
        }
        if (h === 11) {
          return 100;
        }
        if (h === 14) {
          return 60;
        }
        if (h === 15) {
          return 80;
        }
        return 150;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 90, 7);
      expect(res).not.toBeNull();
      expect(res?.startHour).toBe(14);
      expect(res?.meanPm25).toBe(70);
    });

    it('returns null when no valid daylight readings exist', () => {
      const hourly = createHourlyReadings(0, 24, () => null);
      const res = bestActivityWindow(hourly, 0, sampleDaylight, 60, 7);
      expect(res).toBeNull();
    });

    it('returns null usualMeanPm25 when usualHour has no valid data', () => {
      const hourly = createHourlyReadings(0, 24, (h) => {
        if (h === 7) {
          return null;
        }
        if (h === 12) {
          return 50;
        }
        return 100;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 60, 7);
      expect(res).not.toBeNull();
      expect(res?.startHour).toBe(12);
      expect(res?.usualMeanPm25).toBeNull();
      expect(res?.reductionPct).toBeNull();
    });

    it('returns null usualMeanPm25 when usualHour is not found or out of bounds', () => {
      // Daylight hours 6, 7, 8
      // Usual hour 20 is not present in the array
      const hourly = createHourlyReadings(6, 3, () => 50);
      const res = bestActivityWindow(hourly, 0, sampleDaylight, 60, 20);
      expect(res).not.toBeNull();
      expect(res?.usualMeanPm25).toBeNull();
      expect(res?.reductionPct).toBeNull();

      // Span 2: reading ends before completing window for usualHour at end of array
      const res2 = bestActivityWindow(hourly, 0, sampleDaylight, 120, 8);
      expect(res2).not.toBeNull();
      expect(res2?.usualMeanPm25).toBeNull();
    });

    it('sets reductionPct to 0 when usualMeanPm25 is 0', () => {
      const hourly = createHourlyReadings(0, 24, (h) => {
        if (h === 7) {
          return 0;
        }
        return 100;
      });

      const res = bestActivityWindow(hourly, 0, sampleDaylight, 60, 7);
      expect(res).not.toBeNull();
      expect(res?.usualMeanPm25).toBe(0);
      expect(res?.reductionPct).toBe(0);
    });
  });

  describe('ventilationHour', () => {
    it('returns the daylight hour with the lowest PM2.5', () => {
      const hourly: HourlyReading[] = Array.from({ length: 24 }, (_, i) => ({
        time: `2026-11-20T${String(i).padStart(2, '0')}:00:00Z`,
        hour: i,
        pm25: i === 13 ? 35 : 120,
        pm10: null,
        no2: null,
        o3: null,
        co: null,
        so2: null,
        blhM: null,
        windKmh: null,
      }));

      const vHour = ventilationHour(hourly, 0, sampleDaylight);
      expect(vHour).toBe(13);
    });

    it('ignores night-time low PM2.5 values', () => {
      const hourly: HourlyReading[] = Array.from({ length: 24 }, (_, i) => {
        let pm25 = 150;
        if (i === 3) {
          pm25 = 10;
        } else if (i === 14) {
          pm25 = 50;
        }
        return {
          time: `2026-11-20T${String(i).padStart(2, '0')}:00:00Z`,
          hour: i,
          pm25,
          pm10: null,
          no2: null,
          o3: null,
          co: null,
          so2: null,
          blhM: null,
          windKmh: null,
        };
      });

      const vHour = ventilationHour(hourly, 0, sampleDaylight);
      expect(vHour).toBe(14);
    });

    it('returns null if no daylight hours have valid PM2.5 readings', () => {
      const hourly: HourlyReading[] = Array.from({ length: 24 }, (_, i) => ({
        time: `2026-11-20T${String(i).padStart(2, '0')}:00:00Z`,
        hour: i,
        pm25: null,
        pm10: null,
        no2: null,
        o3: null,
        co: null,
        so2: null,
        blhM: null,
        windKmh: null,
      }));

      expect(ventilationHour(hourly, 0, sampleDaylight)).toBeNull();
    });
  });
});
