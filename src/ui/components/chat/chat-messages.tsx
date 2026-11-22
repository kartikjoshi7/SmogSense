import type { ChatMessage } from '../../hooks/use-chat.js';
import { useMessages } from '../../state/app-context.js';
import { SourceTag } from '../common/source-tag.js';

interface MessageListProps {
  readonly messages: readonly ChatMessage[];
}

/** The conversation. It is a live region from the start, so the first answer is announced too. */
export function MessageList({ messages }: MessageListProps) {
  const t = useMessages().chat;
  return (
    <ol aria-live="polite" aria-label={t.conversation} className="grid gap-3">
      {messages.map((message) =>
        message.role === 'user' ? (
          <li key={message.id} className="text-right">
            <p className="text-sm font-semibold">{t.you}</p>
            <p className="whitespace-pre-line">{message.text}</p>
          </li>
        ) : (
          <li key={message.id}>
            <p className="text-sm font-semibold">{t.assistant}</p>
            <p className="whitespace-pre-line" lang={message.lang}>
              {message.text}
            </p>
            <SourceTag source={message.source} />
          </li>
        ),
      )}
    </ol>
  );
}

interface SuggestionsProps {
  /** An answer is on its way: the buttons stay focusable but do nothing. */
  readonly busy: boolean;
  readonly onPick: (question: string) => void;
}

/** Example questions to start with; each one is asked when picked. */
export function Suggestions({ busy, onPick }: SuggestionsProps) {
  const t = useMessages().chat;
  return (
    <ul className="mb-3 flex flex-wrap gap-2">
      {t.suggestions.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            className="btn-secondary text-left"
            aria-disabled={busy}
            onClick={() => {
              if (!busy) {
                onPick(suggestion);
              }
            }}
          >
            {suggestion}
          </button>
        </li>
      ))}
    </ul>
  );
}
