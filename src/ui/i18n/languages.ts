import type { Language } from '../../shared/api.js';

/** Each answer language, named in its own script so speakers can find it. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  mr: 'मराठी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  pa: 'ਪੰਜਾਬੀ',
};
