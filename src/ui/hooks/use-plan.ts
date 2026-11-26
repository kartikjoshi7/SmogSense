/** Loads the household's plan, then its AI explanation, never showing a stale result. */
import { useEffect, useMemo, useState } from 'react';
import type { ExplainResponse, PlanRequest } from '../../shared/api.js';
import type { UiLanguage } from '../../shared/languages.js';
import type { Plan } from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import { api, type ApiError } from '../api/client.js';
import type { SavedLocation } from '../state/storage.js';

type Loaded =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: ApiError }
  | { readonly status: 'ready'; readonly plan: Plan; readonly planKey: string };

/**
 * A loaded plan also carries its AI wording, once it arrives and only if it was written for this
 * plan; standard guidance shows until then, and instead of wording written for another plan.
 */
export type PlanState =
  | Exclude<Loaded, { readonly status: 'ready' }>
  | (Extract<Loaded, { readonly status: 'ready' }> & {
      readonly explanation: ExplainResponse | null;
      readonly explaining: boolean;
    });

/** A result tagged with the request it answers, so a stale result is never shown. */
interface Tagged<T> {
  readonly key: string;
  readonly value: T;
}

const LOADING: Loaded = { status: 'loading' };

/** The plan for a household and place; changing either cancels the request still running. */
function usePlanRequest(request: PlanRequest, attempt: number) {
  const key = JSON.stringify([request, attempt]);
  const [loaded, setLoaded] = useState<Tagged<Loaded>>({ key: '', value: LOADING });

  useEffect(() => {
    const controller = new AbortController();
    void api.plan(request, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        const value: Loaded = result.ok
          ? { status: 'ready', ...result.value }
          : { status: 'error', error: result.error };
        setLoaded({ key, value });
      }
    });
    return () => {
      controller.abort();
    };
  }, [key, request]);

  return loaded.key === key ? loaded.value : LOADING;
}

/** The AI explanation of a loaded plan in one language; a new language only asks for new text. */
function useExplanation(planKey: string | null, request: PlanRequest, lang: UiLanguage) {
  const [explained, setExplained] = useState<Tagged<ExplainResponse | null> | null>(null);
  const key = JSON.stringify([request, lang]);

  useEffect(() => {
    if (planKey === null) {
      return undefined;
    }
    const controller = new AbortController();
    void api.explain({ ...request, lang }, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setExplained({ key, value: result.ok ? result.value : null });
      }
    });
    return () => {
      controller.abort();
    };
  }, [key, planKey, request, lang]);

  return explained?.key === key
    ? { done: true, value: explained.value }
    : { done: false, value: null };
}

/**
 * AI wording counts only for the plan it was written for: the air data can change between the
 * plan request and the explanation request, and wording for another plan is dropped.
 */
function forPlan(explanation: ExplainResponse | null, planKey: string): ExplainResponse | null {
  return explanation?.planKey === planKey ? explanation : null;
}

/**
 * Load the household's plan, then its AI explanation. The plan renders as soon as it arrives.
 * Changing the household or place reloads both; changing the language keeps the plan and only
 * asks for an explanation in the new language.
 */
export function usePlan(profile: Profile, location: SavedLocation, lang: UiLanguage) {
  const [attempt, setAttempt] = useState(0);
  const { lat, lon } = location;
  // The one request body for this household and place, shared by every call that needs it;
  // the place's name stays on the device.
  const request = useMemo(
    (): PlanRequest => ({ profile, location: { lat, lon } }),
    [profile, lat, lon],
  );
  const loaded = usePlanRequest(request, attempt);
  const explanation = useExplanation(
    loaded.status === 'ready' ? loaded.planKey : null,
    request,
    lang,
  );
  const state: PlanState =
    loaded.status === 'ready'
      ? {
          ...loaded,
          explanation: forPlan(explanation.value, loaded.planKey),
          explaining: !explanation.done,
        }
      : loaded;

  return {
    state,
    request,
    retry: () => {
      setAttempt((n) => n + 1);
    },
  };
}
