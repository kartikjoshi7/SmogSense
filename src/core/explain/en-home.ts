/** English templates for the recommendations about the air at home. */
import { FUEL, HEATER, indoor, qualitative } from './en-words.js';
import type { LanguagePack } from './format.js';

/** English text for the recommendations about the air at home. */
export const homeTemplates = {
  run_purifier: (rec) => ({
    title: rec.facts.purifiersOwned > 0 ? 'Run your purifier on high' : 'Use an air purifier',
    why: `In your ${rec.facts.roomAreaM2} m² room, the day's average PM2.5 drops from about ${rec.impact.indoorBeforeUgM3} to ${rec.impact.indoorAfterUgM3} µg/m³ (${rec.impact.exposureReductionPct}% less) with a purifier running.`,
    steps: [
      'Keep it in the room where the family sleeps, with the door closed.',
      'Run it on high overnight and during the smoggiest hours.',
      'Replace the filter on schedule.',
    ],
  }),
  seal_gaps: indoor('Seal gaps around doors and windows', 'Less leakage keeps smog out.', [
    'Use weather strips or a rolled towel at door gaps.',
    'Close unused vents and openings.',
  ]),
  keep_windows_shut: indoor(
    'Keep windows shut during smog',
    'Open windows let the outdoor smog straight in.',
    [
      'Keep them closed through the morning and evening peaks.',
      'Air the home only briefly at the cleanest hour.',
    ],
  ),
  stop_incense: indoor(
    'Pause incense, dhoop and mosquito coils',
    'They release a lot of fine smoke while burning.',
    ['Use electric repellents or nets instead of coils.', 'If you burn incense, keep it brief.'],
  ),
  no_indoor_smoking: indoor(
    'Keep smoking outdoors',
    'Tobacco smoke is a strong indoor source of PM2.5.',
    [
      'Smoke outside, away from doors and windows.',
      'Ask visitors to do the same.',
      'Ask a doctor about support to quit.',
    ],
  ),
  safer_heating: (rec) => ({
    title: 'Heat the room without smoke',
    why: `${HEATER[rec.facts.heating]} burns its fuel inside the room. Without it, the day's average indoor PM2.5 drops from about ${rec.impact.indoorBeforeUgM3} to ${rec.impact.indoorAfterUgM3} µg/m³ (${rec.impact.exposureReductionPct}% less).`,
    steps: [
      'Use an electric heater, warm layers and blankets instead.',
      'Never leave a fire or heater burning in a closed room while people sleep: its carbon monoxide can kill.',
      'If you must use it, keep a window slightly open and put it out before bed.',
    ],
  }),
  cooking_ventilation: (rec) => ({
    title: 'Vent cooking smoke',
    why: rec.facts.hasExhaust
      ? `Cooking on ${FUEL[rec.facts.cookingFuel]} fills the home with fine smoke, one of the biggest indoor sources.`
      : 'Without an exhaust fan or chimney, smoke from frying and tempering stays indoors.',
    steps: [
      rec.facts.hasExhaust
        ? 'Run the exhaust fan or chimney while cooking and for a while after.'
        : 'Open a kitchen window while cooking and keep the door to the other rooms shut.',
      'Use lids and lower heat to cut smoke.',
      'Keep children and older relatives out of the kitchen while frying.',
    ],
  }),
  wet_mopping: qualitative(
    'Wet-mop instead of sweeping',
    'Dry sweeping throws settled dust and soot back into the air you breathe.',
    ['Mop floors and wipe surfaces with a damp cloth.', 'Do it daily during smog season.'],
  ),
} satisfies Partial<LanguagePack['recommendations']>;
