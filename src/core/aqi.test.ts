import { describe, it, expect } from 'vitest';
import type { AirData, HourlyReading } from '../shared/schemas.js';
import {
  computeNaqiPm25,
  computeNaqiPm10,
  computeUsAqiPm25,
  computeUsAqiPm10,
  getNaqiBand,
  getUsAqiBand,
  selectAqiScale,
  computeIndex,
  interpolateSubIndex,
  getCategoryName,
} from './aqi.js';

describe('aqi', () => {
  describe('interpolateSubIndex', () => {
    it('interpolates correctly at bounds and midpoints', () => {
      const bp = { bpLo: 0, bpHi: 30, iLo: 0, iHi: 50 };
      expect(interpolateSubIndex(0, bp)).toBe(0);
      expect(interpolateSubIndex(15, bp)).toBe(25);
      expect(interpolateSubIndex(30, bp)).toBe(50);
    });

    it('resolves category names safely with out-of-range fallback', () => {
      expect(getCategoryName(['Good', 'Poor'], 1)).toBe('Poor');
      expect(getCategoryName(['Good', 'Poor'], 99)).toBe('Good');
    });
  });

  describe('India NAQI PM2.5 breakpoints', () => {
    it('handles negative or zero concentration', () => {
      expect(computeNaqiPm25(0)).toBe(0);
      expect(computeNaqiPm25(-5)).toBe(0);
    });

    it('calculates exact values at every band boundary', () => {
      // Band 0: [0, 30] -> [0, 50]
      expect(computeNaqiPm25(30)).toBe(50);
      expect(getNaqiBand(computeNaqiPm25(30))).toBe(0);

      // Band 1: (30, 60] -> [51, 100]
      expect(computeNaqiPm25(30.1)).toBe(51);
      expect(computeNaqiPm25(60)).toBe(100);
      expect(getNaqiBand(computeNaqiPm25(60))).toBe(1);

      // Band 2: (60, 90] -> [101, 200]
      expect(computeNaqiPm25(60.1)).toBe(101);
      expect(computeNaqiPm25(90)).toBe(200);
      expect(getNaqiBand(computeNaqiPm25(90))).toBe(2);

      // Band 3: (90, 120] -> [201, 300]
      expect(computeNaqiPm25(90.1)).toBe(201);
      expect(computeNaqiPm25(120)).toBe(300);
      expect(getNaqiBand(computeNaqiPm25(120))).toBe(3);

      // Band 4: (120, 250] -> [301, 400]
      expect(computeNaqiPm25(120.1)).toBe(301);
      expect(computeNaqiPm25(250)).toBe(400);
      expect(getNaqiBand(computeNaqiPm25(250))).toBe(4);

      // Band 5: (250, 380] -> [401, 500]
      expect(computeNaqiPm25(250.1)).toBe(401);
      expect(computeNaqiPm25(380)).toBe(500);
      expect(getNaqiBand(computeNaqiPm25(380))).toBe(5);

      // Above Severe upper reference (capped at 500)
      expect(computeNaqiPm25(450)).toBe(500);
      expect(getNaqiBand(computeNaqiPm25(450))).toBe(5);
    });
  });

  describe('India NAQI PM10 breakpoints', () => {
    it('handles negative or zero concentration', () => {
      expect(computeNaqiPm10(0)).toBe(0);
      expect(computeNaqiPm10(-10)).toBe(0);
    });

    it('calculates exact values at every band boundary', () => {
      // Band 0: [0, 50] -> [0, 50]
      expect(computeNaqiPm10(50)).toBe(50);
      // Band 1: (50, 100] -> [51, 100]
      expect(computeNaqiPm10(50.1)).toBe(51);
      expect(computeNaqiPm10(100)).toBe(100);
      // Band 2: (100, 250] -> [101, 200]
      expect(computeNaqiPm10(100.1)).toBe(101);
      expect(computeNaqiPm10(250)).toBe(200);
      // Band 3: (250, 350] -> [201, 300]
      expect(computeNaqiPm10(250.1)).toBe(201);
      expect(computeNaqiPm10(350)).toBe(300);
      // Band 4: (350, 430] -> [301, 400]
      expect(computeNaqiPm10(350.1)).toBe(301);
      expect(computeNaqiPm10(430)).toBe(400);
      // Band 5: (430, 510] -> [401, 500]
      expect(computeNaqiPm10(430.1)).toBe(401);
      expect(computeNaqiPm10(510)).toBe(500);
      // Above 510
      expect(computeNaqiPm10(600)).toBe(500);
    });
  });

  describe('US AQI PM2.5 breakpoints', () => {
    it('handles negative or zero concentration', () => {
      expect(computeUsAqiPm25(0)).toBe(0);
      expect(computeUsAqiPm25(-1)).toBe(0);
    });

    it('calculates exact values at every band boundary (Feb 2024)', () => {
      // Band 0: 0.0 - 9.0 -> 0 - 50
      expect(computeUsAqiPm25(9.0)).toBe(50);
      expect(computeUsAqiPm25(9.09)).toBe(50); // truncated to 9.0
      expect(getUsAqiBand(computeUsAqiPm25(9.0))).toBe(0);

      // Band 1: 9.1 - 35.4 -> 51 - 100
      expect(computeUsAqiPm25(9.1)).toBe(51);
      expect(computeUsAqiPm25(35.4)).toBe(100);
      expect(getUsAqiBand(computeUsAqiPm25(35.4))).toBe(1);

      // Band 2: 35.5 - 55.4 -> 101 - 150
      expect(computeUsAqiPm25(35.5)).toBe(101);
      expect(computeUsAqiPm25(55.4)).toBe(150);
      expect(getUsAqiBand(computeUsAqiPm25(55.4))).toBe(2);

      // Band 3: 55.5 - 125.4 -> 151 - 200
      expect(computeUsAqiPm25(55.5)).toBe(151);
      expect(computeUsAqiPm25(125.4)).toBe(200);
      expect(getUsAqiBand(computeUsAqiPm25(125.4))).toBe(3);

      // Band 4: 125.5 - 225.4 -> 201 - 300
      expect(computeUsAqiPm25(125.5)).toBe(201);
      expect(computeUsAqiPm25(225.4)).toBe(300);
      expect(getUsAqiBand(computeUsAqiPm25(225.4))).toBe(4);

      // Band 5: 225.5 - 325.4 -> 301 - 500
      expect(computeUsAqiPm25(225.5)).toBe(301);
      expect(computeUsAqiPm25(325.4)).toBe(500);
      expect(getUsAqiBand(computeUsAqiPm25(325.4))).toBe(5);

      // Capped above 325.4
      expect(computeUsAqiPm25(400)).toBe(500);
    });
  });

  describe('US AQI PM10 breakpoints', () => {
    it('handles negative or zero concentration', () => {
      expect(computeUsAqiPm10(0)).toBe(0);
      expect(computeUsAqiPm10(-2)).toBe(0);
    });

    it('calculates exact values at every band boundary', () => {
      // Band 0: 0 - 54 -> 0 - 50
      expect(computeUsAqiPm10(54.9)).toBe(50); // truncated to 54
      // Band 1: 55 - 154 -> 51 - 100
      expect(computeUsAqiPm10(55)).toBe(51);
      expect(computeUsAqiPm10(154.8)).toBe(100);
      // Band 2: 155 - 254 -> 101 - 150
      expect(computeUsAqiPm10(155)).toBe(101);
      expect(computeUsAqiPm10(254)).toBe(150);
      // Band 3: 255 - 354 -> 151 - 200
      expect(computeUsAqiPm10(255)).toBe(151);
      expect(computeUsAqiPm10(354)).toBe(200);
      // Band 4: 355 - 424 -> 201 - 300
      expect(computeUsAqiPm10(355)).toBe(201);
      expect(computeUsAqiPm10(424)).toBe(300);
      // Band 5: 425 - 604 -> 301 - 500
      expect(computeUsAqiPm10(425)).toBe(301);
      expect(computeUsAqiPm10(604)).toBe(500);
      // Above 604
      expect(computeUsAqiPm10(700)).toBe(500);
    });
  });

  describe('selectAqiScale', () => {
    it('chooses NAQI when countryCode is IN (case insensitive)', () => {
      expect(selectAqiScale('IN', 'UTC')).toBe('naqi');
      expect(selectAqiScale('in', 'Asia/Kolkata')).toBe('naqi');
    });

    it('chooses NAQI when countryCode is null and timezone is Kolkata/Calcutta', () => {
      expect(selectAqiScale(null, 'Asia/Kolkata')).toBe('naqi');
      expect(selectAqiScale(null, 'Asia/Calcutta')).toBe('naqi');
    });

    it('defaults to US AQI otherwise', () => {
      expect(selectAqiScale('US', 'America/New_York')).toBe('us_aqi');
      expect(selectAqiScale(null, 'Europe/London')).toBe('us_aqi');
      expect(selectAqiScale('GB', 'Europe/London')).toBe('us_aqi');
    });
  });

  describe('computeIndex', () => {
    function makeAirData(pm25Values: (number | null)[], pm10Values?: (number | null)[]): AirData {
      const hourly: HourlyReading[] = pm25Values.map((v, i) => ({
        time: `2026-11-20T${String(i % 24).padStart(2, '0')}:00:00Z`,
        hour: i % 24,
        pm25: v,
        pm10: pm10Values?.[i] ?? null,
        no2: null,
        o3: null,
        co: null,
        so2: null,
        blhM: null,
        windKmh: null,
      }));
      return {
        lat: 28.61,
        lon: 77.23,
        timezone: 'Asia/Kolkata',
        countryCode: 'IN',
        hourly,
        daylight: [{ sunrise: '2026-11-20T06:30:00Z', sunset: '2026-11-20T17:30:00Z' }],
        nowIndex: pm25Values.length - 1,
      };
    }

    it('returns insufficient_data when fewer than 16 non-null PM2.5 readings are available', () => {
      const validReadings: (number | null)[] = Array.from({ length: 15 }, () => 40);
      const nullReadings: (number | null)[] = Array.from({ length: 9 }, () => null);
      const pm25s = [...validReadings, ...nullReadings];
      const air = makeAirData(pm25s);
      const res = computeIndex(air);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('insufficient_data');
      }
    });

    it('computes headline NAQI when at least 16 readings are present', () => {
      const nullReadings: (number | null)[] = Array.from({ length: 8 }, () => null);
      const validReadings: (number | null)[] = Array.from({ length: 16 }, () => 60);
      const pm25s = [...nullReadings, ...validReadings];
      const air = makeAirData(pm25s);
      const res = computeIndex(air);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.scale).toBe('naqi');
        expect(res.pm25Mean24h).toBe(60);
        expect(res.value).toBe(100);
        expect(res.category).toBe('Satisfactory');
        expect(res.band).toBe(1);
      }
    });

    it('uses the larger of PM2.5 and PM10 sub-indices in NAQI', () => {
      const pm25s: (number | null)[] = Array.from({ length: 24 }, () => 30);
      const pm10s: (number | null)[] = Array.from({ length: 24 }, () => 250);
      const air = makeAirData(pm25s, pm10s);
      const res = computeIndex(air);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe(200);
        expect(res.category).toBe('Moderate');
        expect(res.band).toBe(2);
      }
    });

    it('computes US AQI when location is non-Indian', () => {
      const pm25s: (number | null)[] = Array.from({ length: 24 }, () => 35.4);
      const air: AirData = {
        ...makeAirData(pm25s),
        countryCode: 'US',
        timezone: 'America/New_York',
      };
      const res = computeIndex(air);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.scale).toBe('us_aqi');
        expect(res.value).toBe(100);
        expect(res.category).toBe('Moderate');
        expect(res.band).toBe(1);
      }
    });

    it('uses PM10 in US AQI when it yields a higher sub-index', () => {
      const pm25s: (number | null)[] = Array.from({ length: 24 }, () => 9.0);
      const pm10s: (number | null)[] = Array.from({ length: 24 }, () => 154);
      const air: AirData = {
        ...makeAirData(pm25s, pm10s),
        countryCode: 'US',
        timezone: 'America/New_York',
      };
      const res = computeIndex(air);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe(100);
        expect(res.category).toBe('Moderate');
        expect(res.band).toBe(1);
      }
    });
  });
});
