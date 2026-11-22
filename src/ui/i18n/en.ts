import type { Severity } from '../../shared/plan.js';
import type { OutdoorAdvice, RecommendationCategory } from '../../shared/recommendation.js';
import { options } from './en-options.js';
import { setup } from './en-setup.js';
import type { Labels } from './labels.js';

/** English interface text. Recommendation text itself comes from `src/core/explain`. */
export const en = {
  app: {
    name: 'SmogSense',
    tagline: 'Your family’s plan for smog season',
    skip: 'Skip to main content',
    language: 'Language',
    editHousehold: 'Edit household',
    dataCredit: 'Air quality and weather data:',
    disclaimer:
      'Numbers are planning estimates, not medical advice. Seek medical help for breathing problems.',
    notSaved:
      'This browser is not saving your household, so you will need to enter it again after a reload.',
  },
  setup,
  options,
  dashboard: {
    title: (place: string) => `Today in ${place}`,
    loading: 'Building your plan…',
    explaining: 'Writing explanations…',
    errors: {
      general: 'Your plan could not be loaded. Check your connection and try again.',
      upstream: 'Air-quality data is unavailable right now. Please try again shortly.',
      noData: 'There is not enough recent air-quality data for this place yet.',
      busy: 'Too many requests just now. Wait a minute and try again.',
    },
    retry: 'Try again',
    advice: {
      ok: 'Outdoor activity is fine for everyone.',
      reduce: 'Keep outdoor exertion short, especially for sensitive members.',
      avoid: 'Avoid exertion outdoors today.',
      stay_indoors: 'Stay indoors as much as possible today.',
    } satisfies Labels<OutdoorAdvice>,
    severity: {
      normal: 'Normal',
      caution: 'Caution',
      restrict: 'Unhealthy air: limit time outdoors',
      emergency: 'Smog emergency: protective actions come first',
    } satisfies Labels<Severity>,
    mean: (pm25: number) => `24-hour average PM2.5: ${pm25} µg/m³`,
    now: 'Right now (µg/m³)',
  },
  forecast: {
    title: 'PM2.5 over the next 24 hours',
    description: (hour: string, pm25: number) =>
      `Bar chart of hourly PM2.5. The cleanest daylight hour is ${hour}, at ${pm25} µg/m³.`,
    noClean: 'Bar chart of hourly PM2.5.',
    showTable: 'Show as a table',
    hideTable: 'Show as a chart',
    hour: 'Hour',
    pm25: 'PM2.5 (µg/m³)',
    cleanest: 'Cleanest daylight hour',
    missing: 'No data',
    missingNote: (count: number) =>
      count === 1
        ? 'One hour has no forecast and is drawn as a dashed outline.'
        : `${count} hours have no forecast and are drawn as dashed outlines.`,
  },
  inversion: {
    title: 'Why the air is worse in the morning',
    trapped: (hour: string) =>
      `A winter inversion is trapping pollution near the ground. Daytime mixing should clear it around ${hour}.`,
    trappedAllDay:
      'A winter inversion is trapping pollution near the ground, and it may not clear today.',
    clear: 'Air is mixing normally right now, so pollution can disperse.',
    windOnly: 'Based on wind speed only; boundary-layer data is unavailable.',
    unknown:
      'Weather data is unavailable right now, so we cannot tell whether pollution is trapped.',
  },
  plan: {
    title: 'Your plan',
    categories: {
      routine: 'Low-emission routines',
      indoor: 'Indoor air hacks',
      alternative: 'Sustainable alternatives',
      protection: 'Protection',
      community: 'Community',
    } satisfies Labels<RecommendationCategory>,
    empty: 'Nothing to add here today.',
    exposure: (pct: number) => `${pct}% less PM2.5 inhaled`,
    exposureUp: (pct: number) => `${pct}% more PM2.5 in transit`,
    indoor: (before: number, after: number) => `Indoors ${before} → ${after} µg/m³`,
    co2: (kg: number) => `Saves ${kg} kg CO₂ a week`,
    level: { low: 'Small benefit', medium: 'Clear benefit', high: 'Big benefit' },
    effort: { low: 'Easy', medium: 'Some effort', high: 'Bigger change' },
    forMembers: (names: string) => `For ${names}`,
    steps: 'How to do it',
    impact: 'Impact',
    source: { ai: 'AI explanation', fallback: 'Standard guidance' },
    timeline: 'Your day',
  },
  whatIf: {
    title: 'What if you moved your exercise?',
    label: 'Start time',
    result: (hour: string, pm25: number, dose: number, usualDose: number) =>
      `At ${hour}: PM2.5 about ${pm25} µg/m³, about ${dose} µg inhaled (usual time: ${usualDose} µg).`,
    noData: 'The forecast does not cover a whole session at this time.',
  },
  readAloud: { start: 'Read aloud', stop: 'Stop reading' },
  actions: { ask: 'Ask SmogSense', notice: 'Community notice', close: 'Close' },
  chat: {
    title: 'Ask SmogSense',
    intro: 'Ask about today’s air and your plan. Answers use your plan’s numbers.',
    language: 'Language of the answers',
    label: 'Your question',
    send: 'Send',
    sending: 'Thinking…',
    counter: (used: number, max: number) => `${used} of ${max} characters`,
    you: 'You',
    assistant: 'SmogSense',
    conversation: 'Conversation',
    error: 'The assistant could not answer. Please try again.',
    busy: 'Too many questions for now. Please ask again later.',
    suggestions: [
      'Can the children play outside at 4 pm?',
      'Is it safe to open the windows today?',
      'Which mask should my father wear?',
    ],
  },
  community: {
    title: 'Community notice',
    intro: 'Create a short notice for your housing society, school or office group.',
    audience: 'Who is it for?',
    audiences: { housing_society: 'Housing society', school: 'School', workplace: 'Workplace' },
    language: 'Language of the notice',
    generate: 'Create notice',
    generating: 'Writing…',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copying is blocked here. Select the notice and copy it yourself.',
    share: 'Share',
    shareFailed: 'Sharing did not work. Copy the notice instead.',
    error: 'The notice could not be created. Please try again.',
    busy: 'Too many requests for now. Please try again later.',
  },
};

export type Messages = typeof en;
