import { useEffect, useRef } from 'react';
import { UI_LANGUAGE_NAMES } from '../shared/languages.js';
import { Dashboard } from './components/dashboard/dashboard.js';
import { SelectField } from './components/common/fields.js';
import { SetupForm } from './components/setup/setup-form.js';
import { activeSetup } from './state/app-state.js';
import { AppProvider, useAppDispatch, useAppState, useMessages } from './state/app-context.js';
import type { KeyValueStore } from './state/storage.js';

function Header() {
  const t = useMessages();
  const state = useAppState();
  const dispatch = useAppDispatch();
  return (
    <header className="mx-auto flex max-w-3xl flex-wrap items-end justify-between gap-3 p-4">
      <div>
        <p className="text-xl font-bold">{t.app.name}</p>
        <p className="muted text-sm">{t.app.tagline}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label={t.app.language}
          value={state.lang}
          options={UI_LANGUAGE_NAMES}
          keysAreLanguages
          onChange={(lang) => {
            dispatch({ type: 'set_language', lang });
          }}
        />
        {activeSetup(state) === null ? null : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              dispatch({ type: 'edit_setup' });
            }}
          >
            {t.app.editHousehold}
          </button>
        )}
      </div>
    </header>
  );
}

function Footer() {
  const t = useMessages().app;
  return (
    <footer className="muted mx-auto max-w-3xl p-4 text-sm">
      <p>
        {t.dataCredit}{' '}
        <a
          className="underline"
          href="https://open-meteo.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open-Meteo.com
        </a>{' '}
        (CC BY 4.0)
      </p>
      <p className="mt-1">{t.disclaimer}</p>
    </footer>
  );
}

/**
 * The setup form or the plan. When one replaces the other, focus moves to the new screen's
 * `h1`; on first load focus stays at the top, so Tab reaches the skip link first.
 */
function Screen() {
  const setup = activeSetup(useAppState());
  const screen = setup === null ? 'setup' : 'plan';
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (shown.current !== null && shown.current !== screen) {
      heading.current?.focus();
    }
    shown.current = screen;
  }, [screen]);

  return setup === null ? (
    <SetupForm headingRef={heading} />
  ) : (
    <Dashboard {...setup} headingRef={heading} />
  );
}

/** The SmogSense app: skip link, header, the setup or plan screen, and footer. */
export function App({ store }: { readonly store: KeyValueStore | null }) {
  return (
    <AppProvider store={store}>
      <SkipLink />
      <Header />
      <main id="main" className="mx-auto max-w-3xl p-4">
        <Screen />
      </main>
      <Footer />
    </AppProvider>
  );
}

function SkipLink() {
  const t = useMessages().app;
  return (
    <a href="#main" className="skip-link">
      {t.skip}
    </a>
  );
}
