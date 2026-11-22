import { useRef, useState } from 'react';
import type { PlanRequest } from '../../../shared/api.js';
import { NATIVE_NAMES, type Language } from '../../../shared/languages.js';
import { useChat } from '../../hooks/use-chat.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { Dialog } from '../common/dialog.js';
import { SelectField } from '../common/fields.js';
import { ChatForm } from './chat-form.js';
import { MessageList, Suggestions } from './chat-messages.js';

/** The conversation and the question being typed; the box empties once its question is answered. */
function useQuestion(request: PlanRequest, lang: Language) {
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
  return { question, setQuestion, input, messages, status, send };
}

interface ChatDialogProps {
  readonly request: PlanRequest;
  readonly onClose: () => void;
}

/** Ask SmogSense anything about today's plan; answers come back grounded in the plan's numbers. */
export function ChatDialog({ request, onClose }: ChatDialogProps) {
  const t = useMessages();
  const { lang: uiLang } = useAppState();
  const [lang, setLang] = useState<Language>(uiLang);
  const chat = useQuestion(request, lang);
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
      {chat.messages.length === 0 ? (
        <Suggestions
          busy={chat.status === 'sending'}
          onPick={(suggestion) => void chat.send(suggestion)}
        />
      ) : null}
      <MessageList messages={chat.messages} />
      <ChatForm
        question={chat.question}
        status={chat.status}
        inputRef={chat.input}
        onChange={chat.setQuestion}
        onSubmit={() => void chat.send(chat.question)}
      />
    </Dialog>
  );
}
