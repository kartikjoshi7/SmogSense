import type { Audience } from '../../shared/api.js';
import type { Severity } from '../../shared/plan.js';
import { recommendations } from './en-recommendations.js';
import { languagePack, type DayPhrases, type LanguagePack } from './format.js';

const AUDIENCE: Readonly<Record<Audience, string>> = {
  housing_society: 'Dear residents',
  school: 'Dear parents and staff',
  workplace: 'Dear colleagues',
};

const PHRASES: DayPhrases = {
  reading: (scale, value, category) => `${scale} ${value}: ${category}.`,
  trappedUntil: (time) => `Pollution is trapped near the ground until about ${time}.`,
  cleanestAt: (time, pm25) => `The cleanest hour is around ${time} (${pm25} µg/m³).`,
};

const categories: LanguagePack['categories'] = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderate: 'Moderate',
  poor: 'Poor',
  very_poor: 'Very poor',
  severe: 'Severe',
  unhealthy_sensitive: 'Unhealthy for sensitive groups',
  unhealthy: 'Unhealthy',
  very_unhealthy: 'Very unhealthy',
  hazardous: 'Hazardous',
};

const scales: LanguagePack['scales'] = { naqi: 'India AQI', us_aqi: 'US AQI' };

/** Worded by severity alone, never by category, so they read true on both index scales. */
const headlines: LanguagePack['headlines'] = {
  normal: 'A normal day: no extra precautions needed',
  caution: 'People in sensitive groups should take it easy today',
  restrict: 'Limit time outdoors today',
  emergency: 'Smog emergency: stay indoors and protect sensitive family members',
};

/** What a community notice asks everyone to do, as strongly as the day calls for. */
const NOTICE_ADVICE: Readonly<Record<Severity, string>> = {
  normal: 'Please avoid burning leaves or rubbish, so the air stays clean.',
  caution:
    'Children, older people and anyone with asthma or a heart condition should take it easy outdoors. Please avoid burning anything.',
  restrict:
    'Please limit time outdoors, keep children and older people in at the smoggiest hours and avoid burning anything.',
  emergency:
    'Please stay indoors where you can, wear N95 masks outside and avoid burning anything.',
};

/** English text for everything the app says without AI. */
export const pack = languagePack({
  recommendations,
  categories,
  scales,
  headlines,
  dayPhrases: PHRASES,
  greetings: AUDIENCE,
  noticeAdvice: NOTICE_ADVICE,
  chatIntro:
    "The AI assistant could not give a checked answer right now, so here is today's standard guidance.",
  mostImportant: 'Most important:',
  sharedVia: 'Shared via SmogSense',
  fullStop: '.',
});
