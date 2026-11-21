import { useState } from 'react';
import type { ChatTurn, PlanRequest, TextSource } from '../../shared/api.js';
import { CHAT_LIMITS } from '../../shared/limits.js';
import type { UiLanguage } from '../../shared/languages.js';
import { api } from '../api/client.js';

/** One turn of the conversation as shown; assistant turns carry where their text came from. */
export interface ChatMessage extends ChatTurn {
  readonly id: number;
  readonly source?: TextSource;
}

export type ChatStatus = 'idle' | 'sending' | 'error';

/** The conversation so far and a way to ask the next question; resolves true once answered. */
export function useChat(request: PlanRequest, lang: UiLanguage) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');

  const ask = async (question: string): Promise<boolean> => {
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
      { id: m.length + 1, role: 'assistant', text: answer, source },
    ]);
    setStatus('idle');
    return true;
  };

  return { messages, status, ask };
}
