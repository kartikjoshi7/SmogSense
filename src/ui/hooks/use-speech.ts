import { useEffect, useState } from 'react';
import { useAppState } from '../state/app-context.js';

const VOICE_LANG = { en: 'en-IN', hi: 'hi-IN' } as const;

function speech(): SpeechSynthesis | null {
  return 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/**
 * Read a text aloud in the interface language, or stop. Null where the browser cannot speak.
 * The button goes back to "Read aloud" when speech ends, fails (no voice for the language) or is
 * interrupted because another text started.
 */
export function useSpeech(text: string) {
  const { lang } = useAppState();
  const [speaking, setSpeaking] = useState(false);
  const synth = speech();

  useEffect(() => () => synth?.cancel(), [synth]);

  if (synth === null) {
    return null;
  }
  const toggle = () => {
    synth.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = VOICE_LANG[lang];
    const done = () => {
      setSpeaking(false);
    };
    utterance.onend = done;
    utterance.onerror = done;
    synth.speak(utterance);
    setSpeaking(true);
  };
  return { speaking, toggle };
}
