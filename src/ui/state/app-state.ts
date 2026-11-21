import type { UiLanguage } from '../../shared/languages.js';
import type { Household, Persisted, SavedLocation } from './storage.js';

export interface AppState extends Persisted {
  /** True while the household form is open over an existing setup. */
  readonly editing: boolean;
}

export type AppAction =
  | { readonly type: 'set_language'; readonly lang: UiLanguage }
  | { readonly type: 'save_setup'; readonly household: Household; readonly location: SavedLocation }
  | { readonly type: 'edit_setup' }
  | { readonly type: 'cancel_edit' };

/** Start from saved state when there is any, otherwise from an empty English setup. */
export function initialState(saved: Persisted | null): AppState {
  return { ...(saved ?? { lang: 'en', household: null, location: null }), editing: false };
}

/** The one place app state changes. */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'set_language':
      return { ...state, lang: action.lang };
    case 'save_setup':
      return { ...state, household: action.household, location: action.location, editing: false };
    case 'edit_setup':
      return { ...state, editing: true };
    case 'cancel_edit':
      return { ...state, editing: false };
  }
}

/** The household and location to plan for, or null while setup is needed. */
export function activeSetup(
  state: AppState,
): { readonly household: Household; readonly location: SavedLocation } | null {
  const { household, location, editing } = state;
  return household === null || location === null || editing ? null : { household, location };
}

/** What gets saved: everything except transient UI flags. */
export function toPersisted(state: AppState): Persisted {
  return { lang: state.lang, household: state.household, location: state.location };
}
