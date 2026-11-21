import type { OutdoorAdvice } from '../../shared/plan.js';
import type { CookingFuel, MaskType } from '../../shared/profile.js';
import {
  clock,
  impact,
  pct,
  templateKit,
  type ImpactPhrases,
  type LanguagePack,
} from './format.js';

const MASK: Readonly<Record<MaskType, string>> = {
  none: 'no mask',
  cloth: 'a cloth mask',
  surgical: 'a surgical mask',
  n95: 'an N95',
};

const FUEL: Readonly<Record<CookingFuel, string>> = {
  lpg: 'LPG',
  png: 'piped gas',
  induction: 'induction',
  biomass: 'wood or dung',
  kerosene: 'kerosene',
};

const SENSITIVE_ADVICE: Readonly<Record<OutdoorAdvice, string>> = {
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
};

const { indoor, swap, qualitative } = templateKit(PHRASES);

/** English text for each recommendation, written from its own facts and impact. */
export const recommendations: LanguagePack['recommendations'] = {
  exercise_window: (rec) => ({
    title: `Exercise at ${clock(rec.facts.bestHour)} instead of ${clock(rec.facts.usualHour)}`,
    why: `PM2.5 is forecast at ${rec.facts.bestPm25} µg/m³ at ${clock(rec.facts.bestHour)} versus ${rec.facts.usualPm25} at ${clock(rec.facts.usualHour)}, so you breathe in ${pct(rec)}% less (${impact(rec, 'doseBeforeUg')} → ${impact(rec, 'doseAfterUg')} µg).`,
    steps: [
      'Start at the cleaner time and finish inside the clean window.',
      'Keep the pace easy and stop if you cough or wheeze.',
      'Check again tomorrow: the clean hour moves with the weather.',
    ],
  }),
  exercise_indoors: (rec) => ({
    title: 'Exercise indoors today',
    why: `Outdoor air at ${clock(rec.facts.usualHour)} is about ${rec.facts.outdoorPm25} µg/m³ and your room about ${rec.facts.indoorPm25}. Exercising inside cuts the PM2.5 you breathe by ${pct(rec)}%.`,
    steps: [
      'Swap the outdoor session for yoga, stretching or stair climbing at home.',
      'Keep windows shut and the purifier on while you exercise.',
      'Skip hard exercise if anyone feels breathless.',
    ],
  }),
  commute_protection: (rec) => ({
    title: 'Wear an N95 on the commute',
    why: `A fitted N95 instead of ${MASK[rec.facts.currentMask]} cuts commute PM2.5 from ${impact(rec, 'doseBeforeUg')} to ${impact(rec, 'doseAfterUg')} µg a day (${pct(rec)}% less).`,
    steps: [
      `Wear it on both trips, at ${clock(rec.facts.departHour)} and ${clock(rec.facts.returnHour)}.`,
      'Pinch the nose clip and check the seal before you set off.',
      'In a car, keep windows up with air recirculation on.',
    ],
  }),
  ventilate_briefly: (rec) => ({
    title: `Air the home at ${clock(rec.facts.hour)}`,
    why: `${clock(rec.facts.hour)} is the cleanest daylight hour (about ${rec.facts.pm25} µg/m³). A short airing then clears cooking fumes and stale air without letting in the worst smog.`,
    steps: [
      'Open windows for 10 to 15 minutes only.',
      'Close them again before the evening build-up.',
    ],
  }),
  engine_off_at_signals: qualitative(
    'Switch off at red lights',
    'Idling burns fuel and puts exhaust right where people walk and breathe.',
    ['Turn the engine off at long signals and in jams.', 'Avoid revving and hard acceleration.'],
  ),
  combine_errands: qualitative(
    'Combine errands into one trip',
    'Fewer short trips and cold starts mean less fuel burned and less exhaust nearby.',
    [
      'Plan the week’s errands along one route.',
      'Walk for very short errands when the air allows.',
    ],
  ),
  run_purifier: (rec) => ({
    title: rec.facts.purifiersOwned > 0 ? 'Run your purifier on high' : 'Use an air purifier',
    why: `In your ${rec.facts.roomAreaM2} m² room, PM2.5 drops from about ${impact(rec, 'indoorBeforeUgM3')} to ${impact(rec, 'indoorAfterUgM3')} µg/m³ (${pct(rec)}% less) with a purifier running.`,
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
  switch_to_metro: swap('Take the metro to work', [
    'Check the route and the last-mile options from your station.',
    'Start with two days a week.',
  ]),
  switch_to_bus: swap('Take the bus to work', [
    'Pick a direct route to keep the trip short.',
    'Wear an N95 at the bus stop on smoggy days.',
  ]),
  switch_to_cycle: swap('Cycle to work', [
    'Choose quieter roads away from heavy traffic.',
    'Ride at the cleaner hours when you can.',
  ]),
  switch_to_walk: swap('Walk to work', [
    'Use side streets rather than main roads.',
    'Wear an N95 on smoggy days.',
  ]),
  carpool: swap('Carpool with neighbours or colleagues', [
    'Ask your housing society or office group who travels your way.',
    'Agree a fixed pickup time.',
  ]),
  work_from_home: swap('Work from home one day a week', [
    'Pick the day with the worst forecast.',
    'Ask your employer about a smog-season arrangement.',
  ]),
  clean_cooking_fuel: (rec) => ({
    title: 'Switch to LPG, PNG or induction',
    why: `Cooking on ${FUEL[rec.facts.cookingFuel]} is a leading cause of household air pollution; clean fuels remove most of that smoke.`,
    steps: [
      'Ask about LPG connection schemes in your area.',
      'Use induction for quick heating and boiling.',
    ],
  }),
  n95_outdoors: (rec) => ({
    title: 'Wear a fitted N95 outdoors',
    why: `With ${MASK[rec.facts.currentMask]} about ${rec.facts.inhaledShareNowPct}% of fine particles get through; a well-fitted N95 lets through about ${rec.facts.inhaledShareN95Pct}%, ${pct(rec)}% less.`,
    steps: [
      'Choose a certified N95 or FFP2 that fits the face closely.',
      'Use child-size masks for children.',
      'Replace it when it gets damp or hard to breathe through.',
    ],
  }),
  sensitive_members: (rec) => ({
    title: 'Extra care for sensitive family members',
    why: `Today's air is especially risky for children, older people, pregnancy and anyone with asthma, COPD or heart disease: ${SENSITIVE_ADVICE[rec.facts.outdoorAdvice]}.`,
    steps: [
      'Keep inhalers and medicines at hand.',
      'Watch for breathlessness, chest tightness or wheezing, and get medical help if they appear.',
      'Give them the cleanest room, with the purifier.',
    ],
  }),
  ncr_grap_check: qualitative(
    "Check today's GRAP restrictions",
    'Delhi NCR applies staged emergency rules (GRAP) when the air turns very poor; they can affect vehicles, construction and schools.',
    ['See the current stage on the CAQM website.', 'Plan travel around any vehicle restrictions.'],
  ),
  check_on_neighbours: qualitative(
    'Check on elderly and unwell neighbours',
    'On days this bad, people living alone may not know how to protect themselves.',
    [
      'Share masks or time near a purifier if you can.',
      'Help them get medical care if they feel unwell.',
    ],
  ),
  report_open_burning: qualitative(
    'Report open burning',
    'Burning leaves, rubbish or crop waste adds smoke right where people live.',
    [
      "Report it to your city's pollution or municipal helpline.",
      'Ask your society to stop burning garden waste.',
    ],
  ),
  share_notice: qualitative(
    "Share today's advisory",
    'A short notice helps your housing society, school or office act together.',
    ['Create the community notice in your language.', 'Share it on your society or school group.'],
  ),
};
