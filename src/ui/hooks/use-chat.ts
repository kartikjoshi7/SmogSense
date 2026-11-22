import { useRef, useState } from 'react';
import { replyLanguage } from '../../core/explain/index.js';
import type { PlanRequest, TextSource } from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import { CHAT_LIMITS } from '../../shared/limits.js';
import { api, failureKind } from '../api/client.js';

/** One turn of the conversation as shown. Answers say who wrote them and in which language. */
export type ChatMessage =
  | { readonly id: number; readonly role: 'user'; readonly text: string }
  | {
      readonly id: number;
      readonly role: 'assistant';
      readonly text: string;
      readonly source: TextSource;
      readonly lang: Language;
    };

/** "busy" when the server's AI rate limit was reached, "error" for any other failure. */
export type ChatStatus = 'idle' | 'sending' | 'error' | 'busy';

/** The conversation so far and a way to ask the next question; resolves true once answered. */
function useChat(request: PlanRequest) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');

  const ask = async (question: string, lang: Language): Promise<boolean> => {
    setStatus('sending');
    const history = messages
      .slice(-CHAT_LIMITS.historyTurns)
      .map(({ role, text }) => ({ role, text }));
    const result = await api.chat({ ...request, lang, question, history });
    if (!result.ok) {
      setStatus(failureKind(result.error));
      return false;
    }
    const { answer, source } = result.value;
    setMessages((m) => [
      ...m,
      { id: m.length, role: 'user', text: question },
      {
        id: m.length + 1,
        role: 'assistant',
        text: answer,
        source,
        lang: replyLanguage(source, lang),
      },
    ]);
    setStatus('idle');
    return true;
  };

  return { messages, status, ask };
}

/** The conversation and the question being typed; the box empties once its question is answered. */
export function useChatSession(request: PlanRequest, lang: Language) {
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
