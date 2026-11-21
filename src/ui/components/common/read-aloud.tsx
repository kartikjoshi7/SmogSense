import { useSpeech } from '../../hooks/use-speech.js';
import { useMessages } from '../../state/app-context.js';

/** Reads text aloud in the interface language; hidden where speech synthesis is unsupported. */
export function ReadAloudButton({ text }: { readonly text: string }) {
  const t = useMessages();
  const speech = useSpeech(text);
  if (speech === null) {
    return null;
  }
  return (
    <button type="button" className="btn-secondary" onClick={speech.toggle}>
      {speech.speaking ? t.readAloud.stop : t.readAloud.start}
    </button>
  );
}
