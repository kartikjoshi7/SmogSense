import { clock, type LanguagePack } from './format.js';
import { homeTemplates } from './en-home.js';
import { FUEL, MASK, qualitative, SENSITIVE_ADVICE, swap } from './en-words.js';

/** English text for each recommendation, written from its own facts and impact. */
export const recommendations: LanguagePack['recommendations'] = {
  exercise_window: (rec) => ({
    title: `Exercise at ${clock(rec.facts.bestHour)} instead of ${clock(rec.facts.usualHour)}`,
    why: `PM2.5 is forecast at ${rec.facts.bestPm25} µg/m³ at ${clock(rec.facts.bestHour)} versus ${rec.facts.usualPm25} at ${clock(rec.facts.usualHour)}, so you breathe in ${rec.impact.exposureReductionPct}% less (${rec.impact.doseBeforeUg} → ${rec.impact.doseAfterUg} µg).`,
    steps: [
      'Start at the cleaner time and finish inside the clean window.',
      'Keep the pace easy and stop if you cough or wheeze.',
      'Check again tomorrow: the clean hour moves with the weather.',
    ],
  }),
  exercise_indoors: (rec) => ({
    title: 'Exercise indoors today',
    why: `Outdoor air at ${clock(rec.facts.usualHour)} is about ${rec.facts.outdoorPm25} µg/m³ and your room about ${rec.facts.indoorPm25}. Exercising inside cuts the PM2.5 you breathe by ${rec.impact.exposureReductionPct}%.`,
    steps: [
      'Swap the outdoor session for yoga, stretching or stair climbing at home.',
      'Keep windows shut and the purifier on while you exercise.',
      'Skip hard exercise if anyone feels breathless.',
    ],
  }),
  commute_protection: (rec) => ({
    title: 'Wear an N95 on the commute',
    why: `A fitted N95 instead of ${MASK[rec.facts.currentMask]} cuts commute PM2.5 from ${rec.impact.doseBeforeUg} to ${rec.impact.doseAfterUg} µg a day (${rec.impact.exposureReductionPct}% less).`,
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
  ...homeTemplates,
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
    why: `With ${MASK[rec.facts.currentMask]} about ${rec.facts.inhaledShareNowPct}% of fine particles get through; a well-fitted N95 lets through about ${rec.facts.inhaledShareN95Pct}%, ${rec.impact.exposureReductionPct}% less.`,
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
