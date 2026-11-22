import { useEffect, useRef } from 'react';
import { UI_LANGUAGE_NAMES } from '../shared/languages.js';
import { SelectField } from './components/common/fields.js';
import { Dashboard } from './components/dashboard/dashboard.js';
import { SetupForm } from './components/setup/setup-form.js';
import { AppProvider, useAppDispatch, useAppState, useMessages } from './state/app-context.js';
import { activeSetup } from './state/app-state.js';
import type { KeyValueStore } from './state/storage.js';

/** The app's name and tagline beside its mark (a decorative wind icon). */
function Brand() {
  const t = useMessages().app;
  return (
    <div className="flex items-center gap-3">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor">
          <path
            d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <div>
        <p className="text-lg leading-tight font-bold">{t.name}</p>
        <p className="muted text-sm leading-tight">{t.tagline}</p>
      </div>
    </div>
  );
}

function Header() {
  const t = useMessages();
  const state = useAppState();
  const dispatch = useAppDispatch();
  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Brand />
        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            label={t.app.language}
            hideLabel
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
      </div>
    </header>
  );
}

function Footer() {
  const t = useMessages().app;
  const { saved } = useAppState();
  return (
    <footer className="muted mx-auto max-w-7xl px-4 py-8 text-sm">
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
      <p role="status" className="mt-1 font-semibold">
        {saved ? '' : t.notSaved}
      </p>
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

interface AppProps {
  readonly store: KeyValueStore | null;
}

/** The SmogSense app: skip link, header, the setup or plan screen, and footer. */
export function App({ store }: AppProps) {
  return (
    <AppProvider store={store}>
      <SkipLink />
      <Header />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
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
