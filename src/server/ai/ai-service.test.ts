import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeAir } from '../../core/fixtures/air.js';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { buildPlan } from '../../core/plan.js';
import type { Plan } from '../../shared/plan.js';
import { fail, ok } from '../../core/result.js';
import { createAiService } from './ai-service.js';
import type { AiClient } from './gemini-client.js';

function severePlan(): Plan {
  const result = buildPlan(SHARMA_FAMILY, makeAir({ scale: 2.4 }));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

/** A model stand-in: replies with `value` (validated by the request's own schema), or is down when null. */
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
  return service(reply).ai.explain(plan, SHARMA_FAMILY, 'en');
}

describe('merging the model’s explanation with standard guidance', () => {
  it('uses grounded AI text item by item and standard guidance for the rest', async () => {
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
        { id: second?.id ?? '', why: 'This cuts 73% of exposure.', steps: [] },
      ],
    });

    expect(response.headline).toBe('Smog emergency today');
    expect(response.items[0]).toMatchObject({
      source: 'ai',
      why: 'A purifier takes the room from 201 to 28 µg/m³.',
    });
    expect(response.items[1]?.source).toBe('fallback');
    expect(response.source).toBe('mixed');
    expect(response.items[0]?.title).toBe('Use an air purifier');
    expect(logged()).toEqual([
      expect.objectContaining({
        message: 'AI text failed the grounding check',
        kind: 'explain',
        rejected: 1,
      }),
    ]);
  });

  it('keeps the standard headline when the AI one quotes an unsupported number', async () => {
    const logged = warnings();
    const response = await explainWith({
      headline: 'AQI 999!',
      summary: 'Bad.',
      items: [],
    });

    expect(response.headline).toBe(
      'Smog emergency: stay indoors and protect sensitive family members',
    );
    expect(response.source).toBe('fallback');
    expect(logged()).toEqual([expect.objectContaining({ kind: 'explain', rejected: 1 })]);
  });

  it('reports "ai" when every item is AI-written, and logs nothing', async () => {
    const logged = warnings();
    const items = plan.recommendations.map((rec) => ({
      id: rec.id,
      why: 'Do this today.',
      steps: [],
    }));

    expect((await explainWith({ headline: 'Today', summary: 'Stay in.', items })).source).toBe(
      'ai',
    );
    expect(logged()).toEqual([]);
  });
});

describe('createAiService', () => {
  it('explains a plan and caches AI answers', async () => {
    const { ai, generate } = service({ headline: 'Today', summary: 'Stay in.', items: [] });

    await ai.explain(plan, SHARMA_FAMILY, 'en');
    await ai.explain(plan, SHARMA_FAMILY, 'en');

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('keys cached explanations on the whole plan, not only the part the model sees', async () => {
    const { ai, generate } = service({ headline: 'Today', summary: 'Stay in.', items: [] });
    const last = plan.recommendations.length - 1;
    const changedBelowTop = {
      ...plan,
      recommendations: plan.recommendations.map((rec, i) =>
        i === last ? { ...rec, memberIds: [...rec.memberIds, 'riya'] } : rec,
      ),
    };

    await ai.explain(plan, SHARMA_FAMILY, 'en');
    await ai.explain(changedBelowTop, SHARMA_FAMILY, 'en');

    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('falls back to standard guidance without caching the fallback', async () => {
    const { ai, generate } = service(null);

    const response = await ai.explain(plan, SHARMA_FAMILY, 'hi');
    await ai.explain(plan, SHARMA_FAMILY, 'hi');

    expect(response.source).toBe('fallback');
    expect(response.items).toHaveLength(plan.recommendations.length);
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

    expect(await good.ai.chat(input)).toEqual({
      answer: 'Keep Aarav indoors; the room is 201 µg/m³ without a purifier.',
      source: 'ai',
    });
    expect(await invented.ai.chat(input)).toMatchObject({ source: 'fallback' });
    expect((await invented.ai.chat(input)).answer).toContain('Use an air purifier');
    expect(logged()).toContainEqual(expect.objectContaining({ kind: 'chat', rejected: 1 }));
  });

  it('writes community notices, falling back to a standard one', async () => {
    const good = service({ notice: `Air quality index ${plan.index.value} today. Stay indoors.` });
    const down = service(null);

    const fallback = await down.ai.communityNotice(plan, 'school', 'en');

    expect(await good.ai.communityNotice(plan, 'school', 'en')).toMatchObject({ source: 'ai' });
    expect(fallback.source).toBe('fallback');
    expect(fallback.notice).toContain('Dear parents and staff');
  });
});
