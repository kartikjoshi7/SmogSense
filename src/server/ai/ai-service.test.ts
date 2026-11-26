import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { severePlan } from '../../core/fixtures/recommendations.js';
import { fail, ok } from '../../core/result.js';
import { createAiService } from './ai-service.js';
import type { AiClient } from './gemini-client.js';

/**
 * A model stand-in: replies with `value` (validated by the request's own schema), or is down when
 * null.
 */
function service(value: unknown) {
  const generate = vi.fn();
  const client: AiClient = {
    generate(request) {
      generate(request);
      if (value === null) {
        return Promise.resolve(fail('unavailable'));
      }
      const parsed = request.schema.safeParse(value);
      return Promise.resolve(parsed.success ? ok(parsed.data) : fail('unavailable'));
    },
  };
  return { ai: createAiService({ client, now: () => 0 }), generate };
}

const plan = severePlan();
/** The client asking, for the daily AI allowance. */
const CALLER = '203.0.113.7';
const [first, second] = plan.recommendations;

const parseLine = (line: unknown): unknown => JSON.parse(String(line));

/** Capture warnings; each logged line is parsed back into its JSON fields. */
function warnings() {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  return () => warn.mock.calls.map(([line]) => parseLine(line));
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** The explanation the service builds from this model reply for the severe-day plan. */
function explainWith(reply: unknown) {
  return service(reply).ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'en' }, CALLER);
}

describe('keeping only the grounded parts of the model’s explanation', () => {
  it('keeps grounded items and drops the rest, item by item', async () => {
    const logged = warnings();
    const response = await explainWith({
      headline: 'Smog emergency today',
      summary: `India AQI ${plan.index.value}: stay in.`,
      items: [
        {
          id: first?.id ?? '',
          why: 'A purifier takes the room from 201 to 28 µg/m³.',
          steps: ['Run it on high.'],
        },
        { id: second?.id ?? '', why: 'This cuts 73% of exposure.', steps: ['Shut the windows.'] },
      ],
    });

    expect(response.intro?.headline).toBe('Smog emergency today');
    expect(response.items).toEqual([
      {
        id: first?.id,
        why: 'A purifier takes the room from 201 to 28 µg/m³.',
        steps: ['Run it on high.'],
      },
    ]);
    expect(logged()).toEqual([
      expect.objectContaining({
        message: 'AI text failed the grounding check',
        kind: 'explain',
        rejected: 1,
      }),
    ]);
  });

  it('drops the headline and summary when they quote an unsupported number', async () => {
    const logged = warnings();
    const response = await explainWith({
      headline: 'AQI 999!',
      summary: 'Bad.',
      items: [],
    });

    expect(response.intro).toBeNull();
    expect(logged()).toEqual([expect.objectContaining({ kind: 'explain', rejected: 1 })]);
  });

  it('keeps AI text only for the recommendations the prompt sent', async () => {
    const logged = warnings();
    const top = plan.recommendations.slice(0, 8);
    const items = plan.recommendations
      .slice(0, top.length + 1)
      .map((rec) => ({ id: rec.id, why: 'Do this today.', steps: ['Start now.'] }));

    const response = await explainWith({ headline: 'Today', summary: 'Stay in.', items });

    expect(plan.recommendations.length).toBeGreaterThan(top.length);
    expect(response.intro).toEqual({ headline: 'Today', summary: 'Stay in.' });
    expect(response.items.map((item) => item.id)).toEqual(top.map((rec) => rec.id));
    expect(logged()).toEqual([]);
  });

  it('treats an item without steps as not written, not as a grounding failure', async () => {
    const logged = warnings();
    const item = { id: first?.id ?? '', why: 'Run the purifier tonight.', steps: [] };

    const response = await explainWith({ headline: 'Today', summary: 'Stay in.', items: [item] });

    expect(response.items).toEqual([]);
    expect(logged()).toEqual([]);
  });
});

describe('createAiService', () => {
  it('explains a plan and caches AI answers', async () => {
    const { ai, generate } = service({ headline: 'Today', summary: 'Stay in.', items: [] });

    await ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'en' }, CALLER);
    await ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'en' }, CALLER);

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('keys cached explanations on the prompt, as it does chat answers', async () => {
    const { ai, generate } = service({ headline: 'Today', summary: 'Stay in.', items: [] });
    const last = plan.recommendations.length - 1;
    const changedBelowTop = {
      ...plan,
      recommendations: plan.recommendations.map((rec, i) =>
        i === last ? { ...rec, memberIds: [...rec.memberIds, 'm1'] } : rec,
      ),
    };

    await ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'en' }, CALLER);
    await ai.explain({ plan: changedBelowTop, profile: SHARMA_FAMILY, lang: 'en' }, CALLER);
    await ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'hi' }, CALLER);

    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('sends no AI text when the model is unavailable, and caches nothing', async () => {
    const { ai, generate } = service(null);

    const response = await ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'hi' }, CALLER);
    await ai.explain({ plan: plan, profile: SHARMA_FAMILY, lang: 'hi' }, CALLER);

    expect(response).toEqual({ intro: null, items: [] });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('answers chat questions with grounded AI text, or the day’s top actions', async () => {
    const logged = warnings();
    const good = service({
      answer: 'Keep Aarav indoors; the room is 201 µg/m³ without a purifier.',
    });
    const invented = service({ answer: 'It will be 12 tomorrow at 999.' });
    const input = {
      plan,
      profile: SHARMA_FAMILY,
      lang: 'en' as const,
      question: 'Can Aarav play?',
      history: [],
    };

    expect(await good.ai.chat(input, CALLER)).toEqual({
      answer: 'Keep Aarav indoors; the room is 201 µg/m³ without a purifier.',
      source: 'ai',
    });
    expect(await invented.ai.chat(input, CALLER)).toMatchObject({ source: 'fallback' });
    expect((await invented.ai.chat(input, CALLER)).answer).toContain('Use an air purifier');
    expect(logged()).toContainEqual(expect.objectContaining({ kind: 'chat', rejected: 1 }));
  });

  it('charges the daily allowance only for answers the model writes, never for cached ones', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { ai, generate } = service({ answer: 'Stay inside and keep the windows shut.' });
    const ask = (question: string, caller = CALLER) =>
      ai.chat({ plan, profile: SHARMA_FAMILY, lang: 'en', question, history: [] }, caller);
    for (let i = 1; i <= 30; i++) {
      await ask(`Question ${String(i)}?`);
    }

    expect(await ask('Question 31?')).toMatchObject({ source: 'fallback' });
    expect(await ask('Question 1?')).toMatchObject({ source: 'ai' });
    expect(generate).toHaveBeenCalledTimes(30);
    expect(await ask('Question 31?', '198.51.100.4')).toMatchObject({ source: 'ai' });
    expect(generate).toHaveBeenCalledTimes(31);
  });

  it('writes community notices, falling back to a standard one', async () => {
    const good = service({ notice: `Air quality index ${plan.index.value} today. Stay indoors.` });
    const down = service(null);

    const fallback = await down.ai.communityNotice(
      { plan, audience: 'school', lang: 'en' },
      CALLER,
    );

    expect(
      await good.ai.communityNotice({ plan, audience: 'school', lang: 'en' }, CALLER),
    ).toMatchObject({
      source: 'ai',
    });
    expect(fallback.source).toBe('fallback');
    expect(fallback.notice).toContain('Dear parents and staff');
  });
});
