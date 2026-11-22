import type { Messages } from './en.js';

/** Hindi names for the choices the setup form offers. */
export const options: Messages['options'] = {
  ageGroup: {
    infant: 'शिशु (0–2)',
    child: 'बच्चा (3–12)',
    teen: 'किशोर (13–17)',
    adult: 'वयस्क',
    senior: 'बुज़ुर्ग (65+)',
  },
  condition: { asthma: 'अस्थमा', copd: 'COPD', heart: 'दिल की बीमारी', pregnancy: 'गर्भावस्था' },
  commuteMode: {
    none: 'आना-जाना नहीं',
    walk: 'पैदल',
    cycle: 'साइकिल',
    two_wheeler: 'दोपहिया',
    auto: 'ऑटो-रिक्शा',
    bus: 'बस',
    metro: 'मेट्रो',
    car_petrol: 'कार (पेट्रोल)',
    car_diesel: 'कार (डीज़ल)',
    car_cng: 'कार (CNG)',
    car_ev: 'कार (इलेक्ट्रिक)',
  },
  alternative: {
    metro: 'मेट्रो',
    bus: 'बस',
    carpool: 'कारपूल',
    cycle: 'साइकिल',
    walk: 'पैदल',
    wfh: 'घर से काम',
  },
  activity: {
    none: 'नियमित व्यायाम नहीं',
    walk: 'सैर',
    run: 'दौड़',
    cycle: 'साइकिलिंग',
    yoga: 'योग',
    sports: 'खेल',
  },
  airtightness: { leaky: 'काफ़ी हवा रिसती है', average: 'सामान्य', sealed: 'अच्छी तरह बंद' },
  cookingFuel: {
    lpg: 'LPG',
    png: 'पाइप गैस (PNG)',
    induction: 'इंडक्शन / बिजली',
    biomass: 'लकड़ी या उपले',
    kerosene: 'केरोसिन',
  },
  incense: { never: 'कभी नहीं', sometimes: 'कभी-कभी', daily: 'रोज़' },
  heating: {
    none: 'हीटिंग नहीं',
    electric: 'बिजली का हीटर',
    gas: 'गैस हीटर',
    kerosene: 'केरोसिन हीटर',
    coal_wood: 'कोयले या लकड़ी की अंगीठी',
  },
  mask: { none: 'मास्क नहीं', cloth: 'कपड़े का मास्क', surgical: 'सर्जिकल मास्क', n95: 'N95 / FFP2' },
};
