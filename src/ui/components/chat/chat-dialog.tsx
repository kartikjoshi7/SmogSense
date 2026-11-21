import { useId, useState, type SyntheticEvent } from 'react';
import type { ChatTurn, PlanRequest } from '../../../shared/api.js';
import { api } from '../../api/client.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { Dialog } from '../common/dialog.js';
import { SourceTag } from '../common/source-tag.js';

const MAX_QUESTION = 500;
const MAX_HISTORY = 6;

interface Message extends ChatTurn {
  readonly id: number;
  readonly source?: 'ai' | 'fallback';
}

type ChatStatus = 'idle' | 'sending' | 'error';

/** The conversation so far and a way to ask the next question. */
function useChat(request: PlanRequest) {
  const { lang } = useAppState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');

  const ask = async (question: string) => {
    setStatus('sending');
    const history = messages.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text }));
    const result = await api.chat({ ...request, lang, question, history });
    if (!result.ok) {
      setStatus('error');
      return false;
    }
    setMessages((m) => [
      ...m,
      { id: m.length, role: 'user', text: question },
      { id: m.length + 1, role: 'assistant', text: result.data.answer, source: result.data.source },
    ]);
    setStatus('idle');
    return true;
  };

  return { messages, status, ask };
}

function MessageList({ messages }: { readonly messages: readonly Message[] }) {
  const t = useMessages().chat;
  return (
    <ol aria-live="polite" className="grid gap-3">
      {messages.map((message) => (
        <li key={message.id} className={message.role === 'user' ? 'text-right' : ''}>
          <p className="text-sm font-semibold">{message.role === 'user' ? t.you : t.assistant}</p>
          <p className="whitespace-pre-line">{message.text}</p>
          {message.source === undefined ? null : <SourceTag source={message.source} />}
        </li>
      ))}
    </ol>
  );
}

function Suggestions({ onPick }: { readonly onPick: (question: string) => void }) {
  const t = useMessages().chat;
  return (
    <ul className="mb-3 flex flex-wrap gap-2">
      {t.suggestions.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            className="btn-secondary text-left"
            onClick={() => {
              onPick(suggestion);
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
  onChange,
  onSubmit,
}: {
  readonly question: string;
  readonly status: ChatStatus;
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
          id={inputId}
          rows={3}
          maxLength={MAX_QUESTION}
          value={question}
          aria-describedby={counterId}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        <p id={counterId} className="muted text-sm">
          {t.counter(question.length, MAX_QUESTION)}
        </p>
      </div>
      <p role="status" className={status === 'error' ? 'field-error' : 'muted'}>
        {status === 'sending' ? t.sending : ''}
        {status === 'error' ? t.error : ''}
      </p>
      <button
        type="submit"
        className="btn-primary justify-self-start"
        disabled={status === 'sending' || question.trim() === ''}
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
  const [question, setQuestion] = useState('');
  const { messages, status, ask } = useChat(request);
  const send = async (text: string) => {
    if (text.trim() !== '' && (await ask(text.trim()))) {
      setQuestion('');
    }
  };
  return (
    <Dialog title={t.chat.title} closeLabel={t.actions.close} onClose={onClose}>
      <p className="muted mb-3">{t.chat.intro}</p>
      {messages.length === 0 ? (
        <Suggestions onPick={(suggestion) => void send(suggestion)} />
      ) : (
        <MessageList messages={messages} />
      )}
      <ChatForm
        question={question}
        status={status}
        onChange={setQuestion}
        onSubmit={() => void send(question)}
      />
    </Dialog>
  );
}
