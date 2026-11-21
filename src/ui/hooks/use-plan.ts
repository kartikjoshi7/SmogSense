import { useEffect, useState } from 'react';
import type { ExplainResponse } from '../../shared/api.js';
import type { Plan } from '../../shared/plan.js';
import type { Profile } from '../../shared/profile.js';
import { api } from '../api/client.js';
import type { UiLanguage } from '../state/app-state.js';
import type { SavedLocation } from '../state/storage.js';

export type PlanState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string | null }
  | {
      readonly status: 'ready';
      readonly plan: Plan;
      /** AI wording, once it arrives; standard guidance is shown until then. */
      readonly explanation: ExplainResponse | null;
      readonly explaining: boolean;
    };

const LOADING: PlanState = { status: 'loading' };

/**
 * Load the household's plan, then its AI explanation. The plan renders as soon as it arrives;
 * changing the household, place or language cancels requests that are still running. Each
 * result is tagged with the request it answers, so stale results are never shown.
 */
export function usePlan(profile: Profile, location: SavedLocation, lang: UiLanguage) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ readonly key: string; readonly state: PlanState }>({
    key: '',
    state: LOADING,
  });
  const key = JSON.stringify([profile, location.lat, location.lon, lang, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    const cancelled = () => controller.signal.aborted;
    const publish = (state: PlanState) => {
      if (!cancelled()) {
        setResult({ key, state });
      }
    };
    const body = { profile, location: { lat: location.lat, lon: location.lon } };

    void (async () => {
      const planned = await api.plan(body, controller.signal);
      if (!planned.ok) {
        publish({ status: 'error', message: planned.message });
        return;
      }
      const { plan } = planned.data;
      publish({ status: 'ready', plan, explanation: null, explaining: true });
      const explained = await api.explain({ ...body, lang }, controller.signal);
      publish({
        status: 'ready',
        plan,
        explanation: explained.ok ? explained.data : null,
        explaining: false,
      });
    })();

    return () => {
      controller.abort();
    };
  }, [key, profile, location.lat, location.lon, lang]);

  return {
    state: result.key === key ? result.state : LOADING,
    retry: () => {
      setAttempt((n) => n + 1);
    },
  };
}
