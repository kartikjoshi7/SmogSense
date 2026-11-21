import { describe, expect, it } from 'vitest';
import { makeAir } from '../../core/fixtures/air.js';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { buildPlan } from '../../core/plan.js';
import { allowedNumbers, extractNumbers, isGrounded } from './grounding.js';

function severePlan() {
  const result = buildPlan(SHARMA_FAMILY, makeAir({ scale: 2.4 }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('extractNumbers', () => {
  it('reads decimals, thousands separators and percentages', () => {
    expect(extractNumbers('PM2.5 hit 1,234 µg/m³, 12.5% more')).toEqual([2.5, 1234, 12.5]);
  });

  it('reads Devanagari digits in Hindi text', () => {
    expect(extractNumbers('PM2.5 २०१ से घटकर २८ µg/m³')).toEqual([2.5, 201, 28]);
  });
});

describe('isGrounded', () => {
  const allowed = allowedNumbers(severePlan());

  it('accepts numbers from the plan, rounded numbers, clock times and common terms', () => {
    expect(isGrounded('A purifier takes the room from 201 to 28 µg/m³ (86% less).', allowed)).toBe(
      true,
    );
    expect(isGrounded('PM2.5 averages 301 today; wear an N95 and go out at 14:00.', allowed)).toBe(
      true,
    );
    expect(isGrounded('दादाजी के लिए २०१ से २८।', allowed)).toBe(true);
  });

  it('accepts the pollutant readings for the current hour', () => {
    const plan = severePlan();

    expect(isGrounded(`PM2.5 is ${plan.current.pm25 ?? 0} right now.`, allowed)).toBe(true);
  });

  it('rejects numbers the plan does not support', () => {
    expect(isGrounded('PM2.5 will fall by 73% tomorrow.', allowed)).toBe(false);
    expect(isGrounded('The index is 999.', allowed)).toBe(false);
  });

  it('accepts text with no numbers at all', () => {
    expect(isGrounded('Keep windows shut and stay indoors.', allowed)).toBe(true);
  });
});
