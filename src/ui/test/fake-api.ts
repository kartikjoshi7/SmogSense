import { vi } from 'vitest';
import { makeAir } from '../../core/fixtures/air.js';
import { buildPlan } from '../../core/plan.js';
import { planRequestSchema } from '../../shared/api.js';

/** A Severe day in Delhi, so the plan has protection, community and emergency content. */
const SEVERE_AIR = makeAir({ scale: 2.4 });

const GURUGRAM = {
  name: 'Gurugram',
  region: 'Haryana',
  country: 'India',
  lat: 28.46,
  lon: 77.03,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function pathOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return new URL(input, 'http://localhost').pathname;
  }
  return input instanceof URL ? input.pathname : new URL(input.url).pathname;
}

function planFor(body: unknown) {
  const { profile } = planRequestSchema.parse(body);
  const plan = buildPlan(profile, SEVERE_AIR);
  if (!plan.ok) {
    throw new Error(plan.error);
  }
  return plan.value;
}

export interface FakeApiOptions {
  /** Make /api/plan fail with this status and message. */
  readonly planFailure?: { readonly status: number; readonly error: string };
}

/**
 * Stub `fetch` with a fake SmogSense API. Plans come from the real engine applied to the
 * profile the UI sends; AI routes return fixed, labelled answers.
 */
export function fakeApi(options: FakeApiOptions = {}) {
  const handlers: Record<string, (body: unknown) => Response> = {
    '/api/geocode': () => json({ places: [GURUGRAM] }),
    '/api/plan': (body) =>
      options.planFailure === undefined
        ? json({ plan: planFor(body) })
        : json({ error: options.planFailure.error }, options.planFailure.status),
    '/api/explain': (body) => {
      const plan = planFor(body);
      const first = plan.recommendations[0];
      return json({
        headline: 'AI headline: stay in today',
        summary: 'AI summary of the day.',
        items:
          first === undefined
            ? []
            : [
                {
                  id: first.id,
                  title: 'Run the purifier',
                  why: 'AI reason.',
                  steps: ['AI step.'],
                  source: 'ai',
                },
              ],
        source: 'mixed',
      });
    },
    '/api/chat': () => json({ answer: 'Keep the children indoors today.', source: 'ai' }),
    '/api/community': () =>
      json({ notice: 'Dear residents, please stay indoors.', source: 'fallback' }),
  };
  const fetchMock = vi.fn((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const handler = handlers[pathOf(input)];
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    return Promise.resolve(
      handler === undefined ? json({ error: 'Not found' }, 404) : handler(body),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** An in-memory stand-in for localStorage. */
export function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
}
