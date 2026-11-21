import { useEffect, useState } from 'react';
import type { ExplainResponse } from '../../shared/api.js';
import type { Plan } from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import { api, type ApiError } from '../api/client.js';
import type { UiLanguage } from '../../shared/languages.js';
import type { SavedLocation } from '../state/storage.js';

type Loaded =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: ApiError }
  | { readonly status: 'ready'; readonly plan: Plan };

/** A loaded plan also carries its AI wording, once it arrives; standard guidance shows until then. */
type PlanState =
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
function usePlanRequest(profile: Profile, location: SavedLocation, attempt: number) {
  const key = JSON.stringify([profile, location.lat, location.lon, attempt]);
  const [loaded, setLoaded] = useState<Tagged<Loaded>>({ key: '', value: LOADING });

  useEffect(() => {
    const controller = new AbortController();
    const body = { profile, location: { lat: location.lat, lon: location.lon } };
    void api.plan(body, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        const value: Loaded = result.ok
          ? { status: 'ready', plan: result.value.plan }
          : { status: 'error', error: result.error };
        setLoaded({ key, value });
      }
    });
    return () => {
      controller.abort();
    };
  }, [key, profile, location.lat, location.lon]);

  return loaded.key === key ? loaded.value : LOADING;
}

/** The AI explanation of a loaded plan in one language; a new language only asks for new text. */
function useExplanation(
  plan: Plan | null,
  profile: Profile,
  location: SavedLocation,
  lang: UiLanguage,
) {
  const [explained, setExplained] = useState<Tagged<ExplainResponse | null> | null>(null);
  const key = JSON.stringify([profile, location.lat, location.lon, lang]);

  useEffect(() => {
    if (plan === null) {
      return undefined;
    }
    const controller = new AbortController();
    const body = { profile, location: { lat: location.lat, lon: location.lon }, lang };
    void api.explain(body, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setExplained({ key, value: result.ok ? result.value : null });
      }
    });
    return () => {
      controller.abort();
    };
  }, [key, plan, profile, location.lat, location.lon, lang]);

  return explained?.key === key
    ? { done: true, value: explained.value }
    : { done: false, value: null };
}

/**
 * Load the household's plan, then its AI explanation. The plan renders as soon as it arrives.
 * Changing the household or place reloads both; changing the language keeps the plan and only
 * asks for an explanation in the new language.
 */
export function usePlan(profile: Profile, location: SavedLocation, lang: UiLanguage) {
  const [attempt, setAttempt] = useState(0);
  const loaded = usePlanRequest(profile, location, attempt);
  const explanation = useExplanation(
    loaded.status === 'ready' ? loaded.plan : null,
    profile,
    location,
    lang,
  );
  const state: PlanState =
    loaded.status === 'ready'
      ? { ...loaded, explanation: explanation.value, explaining: !explanation.done }
      : loaded;

  return {
    state,
    retry: () => {
      setAttempt((n) => n + 1);
    },
  };
}
