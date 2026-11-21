import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { en, type Messages } from '../i18n/en.js';
import { hi } from '../i18n/hi.js';
import {
  appReducer,
  initialState,
  toPersisted,
  type AppAction,
  type AppState,
} from './app-state.js';
import { loadState, saveState, type KeyValueStore } from './storage.js';

const MESSAGES: Readonly<Record<AppState['lang'], Messages>> = { en, hi };

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);

/** Holds app state, persists it (noting when it cannot), and keeps the page's `lang` in sync. */
export function AppProvider({
  store,
  children,
}: {
  readonly store: KeyValueStore | null;
  readonly children: ReactNode;
}) {
  const [state, dispatch] = useReducer(appReducer, store, (s) => initialState(loadState(s)));

  // Saved only when a saved field changes, not on every transient change such as `editing`.
  const { lang, household, location } = state;
  useEffect(() => {
    const saved = saveState(store, toPersisted({ lang, household, location }));
    dispatch({ type: 'save_result', saved });
  }, [store, lang, household, location]);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>{children}</DispatchContext>
    </StateContext>
  );
}

/** Current app state; must be used inside `AppProvider`. */
export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (state === null) {
    throw new Error('useAppState must be used inside AppProvider');
  }
  return state;
}

/** The state dispatcher; must be used inside `AppProvider`. */
export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(DispatchContext);
  if (dispatch === null) {
    throw new Error('useAppDispatch must be used inside AppProvider');
  }
  return dispatch;
}

/** Interface text in the current language. */
export function useMessages(): Messages {
  return MESSAGES[useAppState().lang];
}
