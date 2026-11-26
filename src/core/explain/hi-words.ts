/** Hindi words and phrases the recommendation templates share. */
import type { CookingFuel, MaskType, SmokyHeating } from '../../shared/profile.js';
import type { OutdoorAdvice } from '../../shared/recommendation.js';
import { templateKit, type ImpactPhrases } from './format.js';

export const MASK: Readonly<Record<MaskType, string>> = {
  none: 'बिना मास्क',
  cloth: 'कपड़े के मास्क',
  surgical: 'सर्जिकल मास्क',
  n95: 'N95 मास्क',
};

export const FUEL: Readonly<Record<CookingFuel, string>> = {
  lpg: 'LPG',
  png: 'पाइप वाली गैस',
  induction: 'इंडक्शन',
  biomass: 'लकड़ी या उपले',
  kerosene: 'केरोसिन',
};

export const HEATER: Readonly<Record<SmokyHeating, string>> = {
  kerosene: 'केरोसिन हीटर',
  coal_wood: 'कोयले या लकड़ी की अंगीठी',
};

export const SENSITIVE_ADVICE: Readonly<Record<OutdoorAdvice, string>> = {
  ok: 'बाहर उन पर नज़र रखें',
  reduce: 'बाहर कम और हल्का समय बिताएँ',
  avoid: 'बाहर मेहनत वाले काम से बचें',
  stay_indoors: 'उन्हें घर के अंदर रखें',
};

const PHRASES: ImpactPhrases = {
  indoorChange: (before, after, percent) =>
    `पिछले 24 घंटों की बाहरी हवा के हिसाब से घर के अंदर PM2.5 लगभग ${before} से घटकर ${after} µg/m³ हो जाता है (${percent}% कम)।`,
  co2Saved: (kg, exposureClause) => `इससे हर हफ़्ते ${kg} kg CO₂ बचता है${exposureClause}।`,
  exposureDown: (percent) => ` और रास्ते में साँस से जाने वाला PM2.5 ${percent}% घटता है`,
  exposureUp: (percent) => `; रास्ते में प्रदूषण ${percent}% बढ़ता है, इसलिए N95 पहनें`,
  saferCommute: (percent, extraKg) =>
    extraKg > 0
      ? `धुंध वाले दिनों में इससे रास्ते में साँस से जाने वाला PM2.5 ${percent}% घटता है, पर हर हफ़्ते लगभग ${extraKg} kg CO₂ ज़्यादा बनता है।`
      : `धुंध वाले दिनों में इससे रास्ते में साँस से जाने वाला PM2.5 ${percent}% घटता है।`,
};

/** The template shapes several recommendations share. */
export const { indoor, swap, qualitative } = templateKit(PHRASES);
