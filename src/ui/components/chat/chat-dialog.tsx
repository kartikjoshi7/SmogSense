import { useId, useRef, useState, type RefObject, type SyntheticEvent } from 'react';
import type { PlanRequest } from '../../../shared/api.js';
import { NATIVE_NAMES, type Language } from '../../../shared/languages.js';
import { CHAT_LIMITS } from '../../../shared/limits.js';
import { useChat, type ChatMessage, type ChatStatus } from '../../hooks/use-chat.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { Dialog } from '../common/dialog.js';
import { SelectField } from '../common/fields.js';
import { SourceTag } from '../common/source-tag.js';

/** The conversation. It is a live region from the start, so the first answer is announced too. */
function MessageList({ messages }: { readonly messages: readonly ChatMessage[] }) {
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

function Suggestions({
  busy,
  onPick,
}: {
  /** An answer is on its way: the buttons stay focusable but do nothing. */
  readonly busy: boolean;
  readonly onPick: (question: string) => void;
}) {
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

function ChatForm({
  question,
  status,
  inputRef,
  onChange,
  onSubmit,
}: {
  readonly question: string;
  readonly status: ChatStatus;
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
  readonly onChange: (question: string) => void;
  readonly onSubmit: () => void;
}) {
  const t = useMessages().chat;
  const inputId = useId();
  const counterId = useId();
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form className="mt-3 grid gap-2" onSubmit={submit}>
      <div className="field">
        <label htmlFor={inputId}>{t.label}</label>
        <textarea
          ref={inputRef}
          id={inputId}
          rows={3}
          maxLength={CHAT_LIMITS.questionChars}
          value={question}
          aria-describedby={counterId}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        <p id={counterId} className="muted text-sm">
          {t.counter(question.length, CHAT_LIMITS.questionChars)}
        </p>
      </div>
      <p role="status" className={status === 'sending' ? 'muted' : 'field-error'}>
        {status === 'sending' ? t.sending : ''}
        {status === 'error' ? t.error : ''}
        {status === 'busy' ? t.busy : ''}
      </p>
      <button
        type="submit"
        className="btn-primary justify-self-start"
        disabled={question.trim() === ''}
        aria-disabled={status === 'sending'}
      >
        {t.send}
      </button>
    </form>
  );
}

/** Ask SmogSense anything about today's plan; answers come back grounded in the plan's numbers. */
export function ChatDialog({
  request,
  onClose,
}: {
  readonly request: PlanRequest;
  readonly onClose: () => void;
}) {
  const t = useMessages();
  const { lang: uiLang } = useAppState();
  const [lang, setLang] = useState<Language>(uiLang);
  const [question, setQuestion] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const { messages, status, ask } = useChat(request);
  const send = async (text: string) => {
    if (status === 'sending' || text.trim() === '') {
      return;
    }
    if (await ask(text.trim(), lang)) {
      setQuestion('');
    }
    // Answered or not, focus goes back to the question box (a clicked suggestion may be gone).
    input.current?.focus();
  };
  return (
    <Dialog title={t.chat.title} closeLabel={t.actions.close} onClose={onClose}>
      <p className="muted mb-3">{t.chat.intro}</p>
      <div className="mb-3">
        <SelectField
          label={t.chat.language}
          value={lang}
          options={NATIVE_NAMES}
          keysAreLanguages
          onChange={setLang}
        />
      </div>
      {messages.length === 0 ? (
        <Suggestions busy={status === 'sending'} onPick={(suggestion) => void send(suggestion)} />
      ) : null}
      <MessageList messages={messages} />
      <ChatForm
        question={question}
        status={status}
        inputRef={input}
        onChange={setQuestion}
        onSubmit={() => void send(question)}
      />
    </Dialog>
  );
}
