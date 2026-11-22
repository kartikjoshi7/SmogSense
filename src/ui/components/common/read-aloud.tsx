/** The read-aloud button, shown only where the browser can speak. */
import { useSpeech } from '../../hooks/use-speech.js';
import { useMessages } from '../../state/app-context.js';

interface ReadAloudButtonProps {
  readonly text: string;
  readonly subject?: string;
}

/**
 * Reads text aloud in the interface language; hidden where speech synthesis is unsupported.
 * `subject` names what is read, so a screen reader's list of buttons can tell the cards apart.
 */
export function ReadAloudButton({ text, subject }: ReadAloudButtonProps) {
  const t = useMessages();
  const speech = useSpeech(text);
  if (speech === null) {
    return null;
  }
  const label = speech.speaking ? t.readAloud.stop : t.readAloud.start;
  return (
    <button
      type="button"
      className="btn-secondary"
      aria-label={subject === undefined ? undefined : `${label}: ${subject}`}
      onClick={speech.toggle}
    >
      {label}
    </button>
  );
}
