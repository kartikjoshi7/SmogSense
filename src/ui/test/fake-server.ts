import {
  explainRecommendation,
  fallbackChatAnswer,
  fallbackCommunityNotice,
  planHeadline,
  planSummary,
} from '../../core/explain/index.js';
import { makeAir } from '../../core/fixtures/air.js';
import { buildPlan } from '../../core/plan.js';
import {
  chatRequestSchema,
  communityRequestSchema,
  explainRequestSchema,
  planRequestSchema,
} from '../../shared/api.js';
import type { Plan } from '../../shared/plan.js';

/**
 * A fake SmogSense API shared by the Vitest UI tests and the Playwright end-to-end tests.
 * Plans come from the real engine applied to the profile the UI sends, on a Severe day in
 * Delhi; AI routes return fixed, labelled answers, or standard guidance when the AI is off.
 */

/** A Severe day in Delhi, so the plan has protection, community and emergency content. */
const SEVERE_AIR = makeAir({ scale: 2.4 });

const GURUGRAM = { name: 'Gurugram', region: 'Haryana', country: 'India', lat: 28.46, lon: 77.03 };

/** The AI wording the fake returns, so tests can tell it apart from standard guidance. */
export const FAKE_AI = {
  headline: 'AI headline: stay in today',
  answer: 'Keep the children indoors today.',
  notice: 'Dear residents, please stay indoors.',
} as const;

type Route = 'geocode' | 'plan' | 'explain' | 'chat' | 'community';

export interface FakeApiOptions {
  /** Make these routes fail with this status and safe message. */
  readonly failures?: Partial<Record<Route, { readonly status: number; readonly error: string }>>;
  /** False when the AI is unavailable: every AI route answers with standard guidance. */
  readonly ai?: boolean;
}

/** A status and JSON body, ready to wrap in a `Response` or a Playwright `route.fulfill`. */
export interface FakeReply {
  readonly status: number;
  readonly body: unknown;
}

function planFor(body: unknown): Plan {
  const { profile } = planRequestSchema.parse(body);
  const plan = buildPlan(profile, SEVERE_AIR);
  if (!plan.ok) {
    throw new Error(plan.error);
  }
  return plan.value;
}

function aiExplanation(plan: Plan) {
  const first = plan.recommendations[0];
  const items =
    first === undefined
      ? []
      : [
          {
            id: first.id,
            title: explainRecommendation(first, 'en').title,
            why: 'AI reason.',
            steps: ['AI step.'],
            source: 'ai',
          },
        ];
  return {
    headline: FAKE_AI.headline,
    summary: 'AI summary of the day.',
    introSource: 'ai',
    items,
    source: 'mixed',
  };
}

/** What the server sends when the model is unavailable: standard guidance for everything. */
function standardExplanation(plan: Plan, body: unknown) {
  const { lang } = explainRequestSchema.parse(body);
  const items = plan.recommendations.map((rec) => ({
    id: rec.id,
    ...explainRecommendation(rec, lang),
    source: 'fallback',
  }));
  return {
    headline: planHeadline(plan, lang),
    summary: planSummary(plan, lang),
    introSource: 'fallback',
    items,
    source: 'fallback',
  };
}

function answers(ai: boolean): Record<Route, (body: unknown) => unknown> {
  return {
    geocode: () => ({ places: [GURUGRAM] }),
    plan: (body) => ({ plan: planFor(body) }),
    explain: (body) =>
      ai ? aiExplanation(planFor(body)) : standardExplanation(planFor(body), body),
    chat: (body) => {
      const { lang } = chatRequestSchema.parse(body);
      return ai
        ? { answer: FAKE_AI.answer, source: 'ai' }
        : { answer: fallbackChatAnswer(planFor(body), lang), source: 'fallback' };
    },
    community: (body) => {
      const { audience, lang } = communityRequestSchema.parse(body);
      return ai
        ? { notice: FAKE_AI.notice, source: 'ai' }
        : { notice: fallbackCommunityNotice(planFor(body), audience, lang), source: 'fallback' };
    },
  };
}

function routeOf(path: string): Route | null {
  const name = path.replace(/^\/api\//, '');
  const routes: readonly Route[] = ['geocode', 'plan', 'explain', 'chat', 'community'];
  return routes.find((route) => route === name) ?? null;
}

/** The fake API's reply to a request for `path` (e.g. "/api/plan") with a parsed JSON body. */
export function fakeReply(path: string, body: unknown, options: FakeApiOptions = {}): FakeReply {
  const route = routeOf(path);
  if (route === null) {
    return { status: 404, body: { error: 'Not found' } };
  }
  const failure = options.failures?.[route];
  if (failure !== undefined) {
    return { status: failure.status, body: { error: failure.error } };
  }
  return { status: 200, body: answers(options.ai ?? true)[route](body) };
}
