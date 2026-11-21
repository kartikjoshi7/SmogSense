import { describe, expect, it, vi } from 'vitest';
import { makeAir } from '../../core/fixtures/air.js';
import { SHARMA_FAMILY } from '../../core/fixtures/profiles.js';
import { buildPlan } from '../../core/plan.js';
import type { Plan } from '../../shared/plan.js';
import { fail, ok } from '../result.js';
import { composeExplanation, createAiService } from './ai-service.js';
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
      return Promise.resolve(parsed.success ? ok(parsed.data) : fail('invalid_output'));
    },
  };
  return { ai: createAiService({ client, now: () => 0 }), generate };
}

const plan = severePlan();
const [first, second] = plan.recommendations;

describe('composeExplanation', () => {
  it('uses grounded AI text item by item and standard guidance for the rest', () => {
    const response = composeExplanation(plan, 'en', {
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
  });

  it('keeps the standard headline when the AI one quotes an unsupported number', () => {
    const response = composeExplanation(plan, 'en', {
      headline: 'AQI 999!',
      summary: 'Bad.',
      items: [],
    });

    expect(response.headline).toBe(
      'Smog emergency: stay indoors and protect sensitive family members',
    );
    expect(response.source).toBe('fallback');
  });

  it('reports "ai" when every item is AI-written', () => {
    const items = plan.recommendations.map((rec) => ({
      id: rec.id,
      why: 'Do this today.',
      steps: [],
    }));

    expect(
      composeExplanation(plan, 'en', { headline: 'Today', summary: 'Stay in.', items }).source,
    ).toBe('ai');
  });
});

describe('createAiService', () => {
  it('explains a plan and caches AI answers', async () => {
    const { ai, generate } = service({ headline: 'Today', summary: 'Stay in.', items: [] });

    await ai.explain(plan, SHARMA_FAMILY, 'en');
    await ai.explain(plan, SHARMA_FAMILY, 'en');

    expect(generate).toHaveBeenCalledTimes(1);
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
