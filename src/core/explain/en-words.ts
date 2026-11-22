/** English words and phrases the recommendation templates share. */
import type { CookingFuel, MaskType, SmokyHeating } from '../../shared/profile.js';
import type { OutdoorAdvice } from '../../shared/recommendation.js';
import { templateKit, type ImpactPhrases } from './format.js';

export const MASK: Readonly<Record<MaskType, string>> = {
  none: 'no mask',
  cloth: 'a cloth mask',
  surgical: 'a surgical mask',
  n95: 'an N95',
};

export const FUEL: Readonly<Record<CookingFuel, string>> = {
  lpg: 'LPG',
  png: 'piped gas',
  induction: 'induction',
  biomass: 'wood or dung',
  kerosene: 'kerosene',
};

export const HEATER: Readonly<Record<SmokyHeating, string>> = {
  kerosene: 'A kerosene heater',
  coal_wood: 'A coal or wood fire (angithi)',
};

export const SENSITIVE_ADVICE: Readonly<Record<OutdoorAdvice, string>> = {
  ok: 'keep an eye on them outdoors',
  reduce: 'keep their time outdoors short and gentle',
  avoid: 'they should avoid exertion outdoors',
  stay_indoors: 'keep them indoors',
};

const PHRASES: ImpactPhrases = {
  indoorChange: (before, after, percent) =>
    `Indoor PM2.5 goes from about ${before} to ${after} µg/m³ (${percent}% less).`,
  co2Saved: (kg, exposureClause) => `This saves ${kg} kg of CO₂ a week${exposureClause}.`,
  exposureDown: (percent) => ` and cuts the PM2.5 you breathe on the way by ${percent}%`,
  exposureUp: (percent) => `; in-transit exposure rises by ${percent}%, so wear an N95`,
  saferCommute: (percent, extraKg) =>
    extraKg > 0
      ? `On smoggy days this cuts the PM2.5 you breathe on the way by ${percent}%, for about ${extraKg} kg more CO₂ a week.`
      : `On smoggy days this cuts the PM2.5 you breathe on the way by ${percent}%.`,
};

/** The template shapes several recommendations share. */
export const { indoor, swap, qualitative } = templateKit(PHRASES);
