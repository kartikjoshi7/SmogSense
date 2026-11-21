import { z } from 'zod';

/** Languages the assistant can answer in. */
export const languageSchema = z.enum(['en', 'hi', 'bn', 'mr', 'ta', 'te', 'gu', 'kn', 'ml', 'pa']);
export type Language = z.infer<typeof languageSchema>;

/** Languages with interface text and standard guidance; AI text can use any `Language`. */
export const uiLanguageSchema = languageSchema.extract(['en', 'hi']);
export type UiLanguage = z.infer<typeof uiLanguageSchema>;

/** Each language in its own script, so speakers can find it. */
export const NATIVE_NAMES: Readonly<Record<Language, string>> = {
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

/** The interface languages, in their own script. */
export const UI_LANGUAGE_NAMES: Readonly<Record<UiLanguage, string>> = {
  en: NATIVE_NAMES.en,
  hi: NATIVE_NAMES.hi,
};

/** Each language's English name, used in the model's instructions. */
export const ENGLISH_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
};
