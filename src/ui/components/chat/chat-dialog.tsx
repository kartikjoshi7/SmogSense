/** The chat dialog: questions about today's plan, answered from its numbers. */
import { useState } from 'react';
import type { PlanRequest } from '../../../shared/api.js';
import { NATIVE_NAMES, type Language } from '../../../shared/languages.js';
import { useChatSession } from '../../hooks/use-chat.js';
import { useAppState, useMessages } from '../../state/app-context.js';
import { Dialog } from '../common/dialog.js';
import { SelectField } from '../common/fields.js';
import { ChatForm } from './chat-form.js';
import { MessageList, Suggestions } from './chat-messages.js';

interface ChatDialogProps {
  readonly request: PlanRequest;
  readonly onClose: () => void;
}

/** Ask SmogSense anything about today's plan; answers come back grounded in the plan's numbers. */
export function ChatDialog({ request, onClose }: ChatDialogProps) {
  const t = useMessages();
  const { lang: uiLang } = useAppState();
  const [lang, setLang] = useState<Language>(uiLang);
  const chat = useChatSession(request, lang);
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
