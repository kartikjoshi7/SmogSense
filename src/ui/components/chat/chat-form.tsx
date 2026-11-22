/** The chat question form: the box with its character count, status and send button. */
import { useId, type RefObject, type SyntheticEvent } from 'react';
import { CHAT_LIMITS } from '../../../shared/limits.js';
import type { ChatStatus } from '../../hooks/use-chat.js';
import { useMessages } from '../../state/app-context.js';

interface QuestionFieldProps {
  readonly question: string;
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
  readonly onChange: (question: string) => void;
}

/** The question box, with a count of the characters used against the limit. */
function QuestionField({ question, inputRef, onChange }: QuestionFieldProps) {
  const t = useMessages().chat;
  const inputId = useId();
  const counterId = useId();
  return (
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
  );
}

interface ChatFormProps extends QuestionFieldProps {
  readonly status: ChatStatus;
  readonly onSubmit: () => void;
}

/** The question box, what is happening to the last question, and the send button. */
export function ChatForm({ question, status, inputRef, onChange, onSubmit }: ChatFormProps) {
  const t = useMessages().chat;
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form className="mt-3 grid gap-2" onSubmit={submit}>
      <QuestionField question={question} inputRef={inputRef} onChange={onChange} />
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
