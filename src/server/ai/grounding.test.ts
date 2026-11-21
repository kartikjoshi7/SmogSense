import { describe, expect, it } from 'vitest';
import { makeAir } from '../../core/fixtures/air.js';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { buildPlan } from '../../core/plan.js';
import { allowedNumbers, isGrounded } from './grounding.js';

function severePlan() {
  const result = buildPlan(SHARMA_FAMILY, makeAir({ scale: 2.4 }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('reading numbers', () => {
  it('reads decimals and thousands separators as single numbers', () => {
    const allowed = new Set([2.5, 1234, 12.5]);

    expect(isGrounded('PM2.5 hit 1,234 µg/m³, 12.5% more', allowed)).toBe(true);
    expect(isGrounded('PM2.5 hit 1,235 µg/m³', allowed)).toBe(false);
    expect(isGrounded('13.5% more', allowed)).toBe(false);
  });

  it('reads Devanagari digits in Hindi text', () => {
    const allowed = new Set([2.5, 201, 28]);

    expect(isGrounded('PM2.5 २०१ से घटकर २८ µg/m³', allowed)).toBe(true);
    expect(isGrounded('PM2.5 ९९९ µg/m³', allowed)).toBe(false);
  });

  it.each([
    ['Bengali', '২০১ থেকে ২৮', 'এক্সপোজার ৯৯৯% কমবে'],
    ['Gujarati', '૨૦૧ થી ૨૮', '૯૯૯% ઘટશે'],
    ['Gurmukhi', '੨੦੧ ਤੋਂ ੨੮', '੯੯੯% ਘੱਟ'],
    ['Tamil', '௨௦௧ இலிருந்து ௨௮', '௯௯௯% குறையும்'],
    ['Telugu', '౨౦౧ నుండి ౨౮', '౯౯౯% తగ్గుతుంది'],
    ['Kannada', '೨೦೧ ರಿಂದ ೨೮', '೯೯೯% ಕಡಿಮೆ'],
    ['Malayalam', '൨൦൧ ൽ നിന്ന് ൨൮', '൯൯൯% കുറയും'],
  ])('reads %s digits', (_script, supported, invented) => {
    const allowed = new Set([201, 28]);

    expect(isGrounded(supported, allowed)).toBe(true);
    expect(isGrounded(invented, allowed)).toBe(false);
  });

  it('reads digits from scripts outside the Basic Multilingual Plane', () => {
    expect(isGrounded('𝟗𝟗𝟗 µg/m³', new Set([999]))).toBe(true);
    expect(isGrounded('𝟗𝟗𝟗 µg/m³', new Set([28]))).toBe(false);
  });

  it.each([
    ['Hindi', '१७ प्रतिशत कम'],
    ['Marathi', '१७ टक्के कमी'],
    ['Bengali', '১৭ শতাংশ কম'],
    ['Gujarati', '૧૭ ટકા ઓછું'],
    ['Tamil', '17 சதவீதம் குறைவு'],
    ['Telugu', '17 శాతం తక్కువ'],
    ['Malayalam', '17 ശതമാനം കുറവ്'],
    ['Punjabi', '17 ਪ੍ਰਤੀਸ਼ਤ ਘੱਟ'],
    ['Kannada, word first', 'ಶೇ 17 ಕಡಿಮೆ'],
    ['Bengali, word first', 'শতকরা ১৭ ভাগ কম'],
  ])('treats a small number with the %s word for "percent" as a measurement', (_lang, text) => {
    expect(isGrounded(text, new Set())).toBe(false);
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

  it('treats a small number as a clock time or count unless a percent or mass follows it', () => {
    const none = new Set<number>();

    expect(isGrounded('Go out at 14:00 for 3 short walks.', none)).toBe(true);
    expect(isGrounded('This cuts 20%.', none)).toBe(false);
    expect(isGrounded('This saves 3 kg.', none)).toBe(false);
    expect(isGrounded('Breathe 5 µg less.', none)).toBe(false);
  });

  it('rejects small invented percentages and masses that pass as clock hours otherwise', () => {
    expect([allowed.has(17), allowed.has(7)]).toEqual([false, false]);
    expect(isGrounded('This cuts exposure by 17%.', allowed)).toBe(false);
    expect(isGrounded('You save 7 kg of CO₂.', allowed)).toBe(false);
    expect(isGrounded('Go out at 3 in the afternoon, for 20 minutes.', allowed)).toBe(true);
  });

  it('rejects numbers the plan does not support', () => {
    expect(isGrounded('PM2.5 will fall by 73% tomorrow.', allowed)).toBe(false);
    expect(isGrounded('The index is 999.', allowed)).toBe(false);
  });

  it('accepts text with no numbers at all', () => {
    expect(isGrounded('Keep windows shut and stay indoors.', allowed)).toBe(true);
  });
});
