/** The Hindi language pack: category and scale names, headlines, the day in a sentence, notices. */
import type { Audience } from '../../shared/api.js';
import type { Severity } from '../../shared/plan.js';
import { languagePack, type DayPhrases, type LanguagePack } from './format.js';
import { recommendations } from './hi-recommendations.js';

const AUDIENCE: Readonly<Record<Audience, string>> = {
  housing_society: 'प्रिय निवासियों',
  school: 'प्रिय अभिभावकों और स्टाफ़',
  workplace: 'प्रिय सहकर्मियों',
};

const PHRASES: DayPhrases = {
  reading: (scale, value, category) => `${scale} ${value}: ${category}।`,
  trappedUntil: (time) => `लगभग ${time} तक प्रदूषण ज़मीन के पास फँसा रहेगा।`,
  cleanestAt: (time, pm25) => `सबसे साफ़ समय लगभग ${time} है (${pm25} µg/m³)।`,
};

const categories: LanguagePack['categories'] = {
  good: 'अच्छा',
  satisfactory: 'संतोषजनक',
  moderate: 'मध्यम',
  poor: 'खराब',
  very_poor: 'बहुत खराब',
  severe: 'गंभीर',
  unhealthy_sensitive: 'संवेदनशील लोगों के लिए अस्वस्थ',
  unhealthy: 'अस्वस्थ',
  very_unhealthy: 'बहुत अस्वस्थ',
  hazardous: 'खतरनाक',
};

const scales: LanguagePack['scales'] = { naqi: 'भारत AQI', us_aqi: 'US AQI' };

/** Worded by severity alone, never by category, so they read true on both index scales. */
const headlines: LanguagePack['headlines'] = {
  normal: 'सामान्य दिन: किसी खास सावधानी की ज़रूरत नहीं',
  caution: 'संवेदनशील समूहों के लोग आज सावधानी रखें',
  restrict: 'आज बाहर कम समय बिताएँ',
  emergency: 'धुंध आपातकाल: घर में रहें और संवेदनशील सदस्यों को बचाएँ',
};

/** What a community notice asks everyone to do, as strongly as the day calls for. */
const NOTICE_ADVICE: Readonly<Record<Severity, string>> = {
  normal: 'कृपया पत्ते या कूड़ा न जलाएँ, ताकि हवा साफ़ रहे।',
  caution: 'बच्चे, बुज़ुर्ग और अस्थमा या दिल की बीमारी वाले लोग बाहर सावधानी रखें। कृपया कुछ भी न जलाएँ।',
  restrict: 'कृपया बाहर कम समय बिताएँ, सबसे ज़्यादा धुंध के समय बच्चों और बुज़ुर्गों को घर में रखें और कुछ भी न जलाएँ।',
  emergency: 'कृपया जहाँ हो सके घर में रहें, बाहर N95 मास्क पहनें और कुछ भी न जलाएँ।',
};

/** Hindi text for everything the app says without AI. */
export const pack = languagePack({
  recommendations,
  categories,
  scales,
  headlines,
  dayPhrases: PHRASES,
  greetings: AUDIENCE,
  noticeAdvice: NOTICE_ADVICE,
  chatIntro: 'AI सहायक अभी जाँचा हुआ जवाब नहीं दे सका, इसलिए आज की मानक सलाह यह है।',
  mostImportant: 'सबसे ज़रूरी:',
  sharedVia: 'SmogSense से साझा',
  fullStop: '।',
});
