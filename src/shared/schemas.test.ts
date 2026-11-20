import { describe, it, expect } from 'vitest';
import {
  ageGroupSchema,
  conditionSchema,
  memberSchema,
  commuteModeSchema,
  commuteAlternativeSchema,
  commuteSchema,
  exerciseActivitySchema,
  exerciseSchema,
  airtightnessSchema,
  cookingFuelSchema,
  incenseSchema,
  homeSchema,
  maskTypeSchema,
  profileSchema,
  hourlyReadingSchema,
  daylightSchema,
  airDataSchema,
  type AgeGroup,
  type Condition,
  type Member,
  type CommuteMode,
  type CommuteAlternative,
  type Commute,
  type ExerciseActivity,
  type Exercise,
  type Airtightness,
  type CookingFuel,
  type Incense,
  type Home,
  type MaskType,
  type Profile,
  type HourlyReading,
  type Daylight,
  type AirData,
} from './schemas.js';

describe('domain schemas', () => {
  it('validates AgeGroup', () => {
    const valid: AgeGroup[] = ['infant', 'child', 'teen', 'adult', 'senior'];
    for (const age of valid) {
      expect(ageGroupSchema.parse(age)).toBe(age);
    }
    expect(() => ageGroupSchema.parse('toddler')).toThrow();
  });

  it('validates Condition', () => {
    const valid: Condition[] = ['asthma', 'copd', 'heart', 'pregnancy'];
    for (const cond of valid) {
      expect(conditionSchema.parse(cond)).toBe(cond);
    }
    expect(() => conditionSchema.parse('flu')).toThrow();
  });

  it('validates Member', () => {
    const valid: Member = {
      id: 'm12345678901',
      ageGroup: 'senior',
      conditions: ['asthma', 'heart'],
    };
    expect(memberSchema.parse(valid)).toEqual(valid);

    // Max 12 chars
    expect(() =>
      memberSchema.parse({
        id: '1234567890123', // 13 chars
        ageGroup: 'adult',
        conditions: [],
      }),
    ).toThrow();

    // Min 1 char
    expect(() =>
      memberSchema.parse({
        id: '',
        ageGroup: 'adult',
        conditions: [],
      }),
    ).toThrow();
  });

  it('validates CommuteMode and CommuteAlternative', () => {
    const modes: CommuteMode[] = [
      'walk',
      'cycle',
      'two_wheeler',
      'auto',
      'bus',
      'metro',
      'car_petrol',
      'car_diesel',
      'car_cng',
      'car_ev',
      'none',
    ];
    for (const mode of modes) {
      expect(commuteModeSchema.parse(mode)).toBe(mode);
    }
    expect(() => commuteModeSchema.parse('helicopter')).toThrow();

    const alts: CommuteAlternative[] = ['metro', 'bus', 'carpool', 'cycle', 'walk', 'wfh'];
    for (const alt of alts) {
      expect(commuteAlternativeSchema.parse(alt)).toBe(alt);
    }
    expect(() => commuteAlternativeSchema.parse('taxi')).toThrow();
  });

  it('validates Commute schema boundaries', () => {
    const valid: Commute = {
      mode: 'metro',
      oneWayKm: 15.5,
      departHour: 8,
      returnHour: 18,
      daysPerWeek: 5,
      alternatives: ['bus', 'wfh'],
    };
    expect(commuteSchema.parse(valid)).toEqual(valid);

    expect(() => commuteSchema.parse({ ...valid, oneWayKm: -1 })).toThrow();
    expect(() => commuteSchema.parse({ ...valid, oneWayKm: 101 })).toThrow();
    expect(() => commuteSchema.parse({ ...valid, departHour: 24 })).toThrow();
    expect(() => commuteSchema.parse({ ...valid, returnHour: -1 })).toThrow();
    expect(() => commuteSchema.parse({ ...valid, daysPerWeek: 8 })).toThrow();
  });

  it('validates Exercise schema', () => {
    const valid: Exercise = {
      activity: 'run',
      usualHour: 6,
      durationMin: 45,
      canMoveIndoors: true,
    };
    expect(exerciseSchema.parse(valid)).toEqual(valid);

    const activities: ExerciseActivity[] = ['walk', 'run', 'cycle', 'yoga', 'sports', 'none'];
    for (const act of activities) {
      expect(exerciseActivitySchema.parse(act)).toBe(act);
    }
    expect(() => exerciseActivitySchema.parse('swimming')).toThrow();

    expect(() => exerciseSchema.parse({ ...valid, durationMin: 5 })).toThrow();
    expect(() => exerciseSchema.parse({ ...valid, durationMin: 185 })).toThrow();
    expect(() => exerciseSchema.parse({ ...valid, usualHour: 25 })).toThrow();
  });

  it('validates Home schema and defaults', () => {
    const airtight: Airtightness[] = ['leaky', 'average', 'sealed'];
    for (const a of airtight) {
      expect(airtightnessSchema.parse(a)).toBe(a);
    }
    expect(() => airtightnessSchema.parse('unknown')).toThrow();

    const fuels: CookingFuel[] = ['lpg', 'png', 'induction', 'biomass', 'kerosene'];
    for (const f of fuels) {
      expect(cookingFuelSchema.parse(f)).toBe(f);
    }
    expect(() => cookingFuelSchema.parse('wood')).toThrow();

    const incs: Incense[] = ['never', 'sometimes', 'daily'];
    for (const i of incs) {
      expect(incenseSchema.parse(i)).toBe(i);
    }
    expect(() => incenseSchema.parse('yearly')).toThrow();

    const rawHome = {
      purifierCount: 2,
      roomAreaM2: 25,
      airtightness: 'average' as const,
      cookingFuel: 'induction' as const,
      hasExhaustOrChimney: true,
      incense: 'sometimes' as const,
      indoorSmoking: false,
    };
    const parsed = homeSchema.parse(rawHome);
    expect(parsed.purifierCadrM3h).toBe(250);

    const explicitHome: Home = {
      purifierCount: 5,
      purifierCadrM3h: 400,
      roomAreaM2: 60,
      airtightness: 'sealed',
      cookingFuel: 'lpg',
      hasExhaustOrChimney: false,
      incense: 'never',
      indoorSmoking: true,
    };
    expect(homeSchema.parse(explicitHome)).toEqual(explicitHome);

    expect(() => homeSchema.parse({ ...explicitHome, purifierCount: 6 })).toThrow();
    expect(() => homeSchema.parse({ ...explicitHome, purifierCadrM3h: 40 })).toThrow();
    expect(() => homeSchema.parse({ ...explicitHome, purifierCadrM3h: 1050 })).toThrow();
    expect(() => homeSchema.parse({ ...explicitHome, roomAreaM2: 4 })).toThrow();
    expect(() => homeSchema.parse({ ...explicitHome, roomAreaM2: 65 })).toThrow();
  });

  it('validates MaskType', () => {
    const masks: MaskType[] = ['none', 'cloth', 'surgical', 'n95'];
    for (const m of masks) {
      expect(maskTypeSchema.parse(m)).toBe(m);
    }
    expect(() => maskTypeSchema.parse('gasmask')).toThrow();
  });

  it('validates Profile schema', () => {
    const validProfile: Profile = {
      members: [
        { id: 'm1', ageGroup: 'adult', conditions: [] },
        { id: 'm2', ageGroup: 'child', conditions: ['asthma'] },
      ],
      commute: {
        mode: 'car_ev',
        oneWayKm: 12,
        departHour: 9,
        returnHour: 17,
        daysPerWeek: 4,
        alternatives: ['metro'],
      },
      exercise: {
        activity: 'yoga',
        usualHour: 7,
        durationMin: 30,
        canMoveIndoors: true,
      },
      home: {
        purifierCount: 1,
        purifierCadrM3h: 300,
        roomAreaM2: 20,
        airtightness: 'average',
        cookingFuel: 'png',
        hasExhaustOrChimney: true,
        incense: 'never',
        indoorSmoking: false,
      },
      mask: 'n95',
    };
    expect(profileSchema.parse(validProfile)).toEqual(validProfile);

    // members min 1, max 8
    expect(() => profileSchema.parse({ ...validProfile, members: [] })).toThrow();
    const nineMembers = Array.from({ length: 9 }, (_, i) => ({
      id: `m${String(i)}`,
      ageGroup: 'adult' as const,
      conditions: [],
    }));
    expect(() => profileSchema.parse({ ...validProfile, members: nineMembers })).toThrow();
  });

  it('validates HourlyReading, Daylight and AirData schemas', () => {
    const reading: HourlyReading = {
      time: '2026-11-20T10:00:00Z',
      hour: 10,
      pm25: 45.2,
      pm10: 88.0,
      no2: 22.1,
      o3: 15.0,
      co: 0.8,
      so2: 5.4,
      blhM: 650,
      windKmh: 8.5,
    };
    expect(hourlyReadingSchema.parse(reading)).toEqual(reading);

    const nullReading: HourlyReading = {
      time: '2026-11-20T11:00:00Z',
      hour: 11,
      pm25: null,
      pm10: null,
      no2: null,
      o3: null,
      co: null,
      so2: null,
      blhM: null,
      windKmh: null,
    };
    expect(hourlyReadingSchema.parse(nullReading)).toEqual(nullReading);

    const daylight: Daylight = {
      sunrise: '2026-11-20T06:45:00Z',
      sunset: '2026-11-20T17:30:00Z',
    };
    expect(daylightSchema.parse(daylight)).toEqual(daylight);

    const airData: AirData = {
      lat: 28.61,
      lon: 77.23,
      timezone: 'Asia/Kolkata',
      countryCode: 'IN',
      hourly: [reading, nullReading],
      daylight: [daylight],
      nowIndex: 1,
    };
    expect(airDataSchema.parse(airData)).toEqual(airData);

    const airDataNullCountry: AirData = {
      ...airData,
      countryCode: null,
    };
    expect(airDataSchema.parse(airDataNullCountry)).toEqual(airDataNullCountry);

    expect(() => airDataSchema.parse({ ...airData, nowIndex: -1 })).toThrow();
  });
});
