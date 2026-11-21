import { useState } from 'react';
import { replyLanguage } from '../../core/explain/index.js';
import type { PlanRequest, TextSource } from '../../shared/api.js';
import type { Language } from '../../shared/languages.js';
import { CHAT_LIMITS } from '../../shared/limits.js';
import { api } from '../api/client.js';

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

export type ChatStatus = 'idle' | 'sending' | 'error';

/** The conversation so far and a way to ask the next question; resolves true once answered. */
export function useChat(request: PlanRequest) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');

  const ask = async (question: string, lang: Language): Promise<boolean> => {
    setStatus('sending');
    const history = messages
      .slice(-CHAT_LIMITS.historyTurns)
      .map(({ role, text }) => ({ role, text }));
    const result = await api.chat({ ...request, lang, question, history });
    if (!result.ok) {
      setStatus('error');
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
