import { z, type ZodType } from 'zod';
import { fallbackChatAnswer, fallbackCommunityNotice } from '../../core/explain/index.js';
import type { ChatResponse, CommunityResponse } from '../../shared/api.js';
import { CHAT_LIMITS } from '../../shared/limits.js';
import type { Plan } from '../../shared/plan.js';
import { SETTINGS } from '../config.js';
import type { AiClient } from './gemini-client.js';
import { allowedNumbers, isGrounded, logUngrounded, type ReplyKind } from './grounding.js';
import { SYSTEM_INSTRUCTION, type ChatInput, type NoticeInput } from './prompts.js';

/** A text reply: a chat answer or a community notice. */
type TextKind = Exclude<ReplyKind, 'explain'>;

/** An answer may be sent back as chat history, so it is no longer than a history turn. */
const chatReply = z.object({ answer: z.string().min(1).max(CHAT_LIMITS.turnChars) });
const noticeReply = z.object({ notice: z.string().min(1).max(SETTINGS.aiReplyChars.notice) });

/**
 * AI-written text when the model answered and every number in it is a plan fact, else null.
 * A reply dropped by the grounding check is logged.
 */
function groundedText(
  kind: TextKind,
  text: string | null,
  allowed: ReadonlySet<number>,
): string | null {
  if (text === null) {
    return null;
  }
  const passes = isGrounded(text, allowed);
  logUngrounded(kind, passes ? 0 : 1);
  return passes ? text : null;
}

/** One text reply the model is asked for: chat answers and notices differ only in these. */
interface TextRequest<F extends string> {
  readonly kind: TextKind;
  readonly field: F;
  readonly schema: ZodType<Record<F, string>>;
  readonly prompt: string;
}

/** The model's text when it answered and every number in it is a plan fact, else null. */
async function groundedReply<F extends string>(
  client: AiClient,
  plan: Plan,
  request: TextRequest<F>,
): Promise<string | null> {
  const reply = await client.generate({
    system: SYSTEM_INSTRUCTION,
    prompt: request.prompt,
    schema: request.schema,
    maxOutputTokens: SETTINGS.aiMaxOutputTokens[request.kind],
  });
  const text = reply.ok ? reply.value[request.field] : null;
  return groundedText(request.kind, text, allowedNumbers(plan));
}

/** A grounded answer to a chat question, or the day's top actions when there is none. */
export async function writeAnswer(
  client: AiClient,
  input: ChatInput,
  prompt: string,
): Promise<ChatResponse> {
  const request = { kind: 'chat', field: 'answer', schema: chatReply, prompt } as const;
  const answer = await groundedReply(client, input.plan, request);
  return answer === null
    ? { answer: fallbackChatAnswer(input.plan, input.lang), source: 'fallback' }
    : { answer, source: 'ai' };
}

/** A grounded community notice, or the standard notice when there is none. */
export async function writeNotice(
  client: AiClient,
  input: NoticeInput,
  prompt: string,
): Promise<CommunityResponse> {
  const request = { kind: 'notice', field: 'notice', schema: noticeReply, prompt } as const;
  const notice = await groundedReply(client, input.plan, request);
  return notice === null
    ? {
        notice: fallbackCommunityNotice(input.plan, input.audience, input.lang),
        source: 'fallback',
      }
    : { notice, source: 'ai' };
}
