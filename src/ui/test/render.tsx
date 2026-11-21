import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AppProvider } from '../state/app-context.js';
import type { UiLanguage } from '../state/app-state.js';
import { saveState } from '../state/storage.js';
import { memoryStore } from './fake-api.js';

/** Render a component inside the app's state provider, with the interface in `lang`. */
export function renderInApp(ui: ReactElement, lang: UiLanguage = 'en') {
  const store = memoryStore();
  saveState(store, { lang, household: null, location: null });
  return render(<AppProvider store={store}>{ui}</AppProvider>);
}
