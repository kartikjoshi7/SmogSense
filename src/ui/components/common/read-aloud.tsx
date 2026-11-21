import { useEffect, useState } from 'react';
import { useAppState, useMessages } from '../../state/app-context.js';

const VOICE_LANG = { en: 'en-IN', hi: 'hi-IN' } as const;

function speech(): SpeechSynthesis | null {
  return 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/** Reads text aloud in the interface language; hidden where speech synthesis is unsupported. */
export function ReadAloudButton({ text }: { readonly text: string }) {
  const t = useMessages();
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
    utterance.onend = () => {
      setSpeaking(false);
    };
    synth.speak(utterance);
    setSpeaking(true);
  };
  return (
    <button type="button" className="btn-secondary" onClick={toggle}>
      {speaking ? t.readAloud.stop : t.readAloud.start}
    </button>
  );
}
