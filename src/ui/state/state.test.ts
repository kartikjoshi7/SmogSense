import { describe, expect, it } from 'vitest';
import { DEMO_HOUSEHOLD, DEMO_LOCATION } from '../components/setup/defaults.js';
import { memoryStore } from '../test/fake-api.js';
import { activeSetup, appReducer, initialState, toPersisted } from './app-state.js';
import { browserStorage, loadState, saveState } from './storage.js';

const saved = { lang: 'hi' as const, household: DEMO_HOUSEHOLD, location: DEMO_LOCATION };

describe('appReducer', () => {
  it('saves the setup, edits it and cancels editing', () => {
    let state = initialState(null);
    expect(activeSetup(state)).toBeNull();

    state = appReducer(state, {
      type: 'save_setup',
      household: DEMO_HOUSEHOLD,
      location: DEMO_LOCATION,
    });
    expect(activeSetup(state)).toEqual({ household: DEMO_HOUSEHOLD, location: DEMO_LOCATION });

    state = appReducer(state, { type: 'edit_setup' });
    expect(activeSetup(state)).toBeNull();
    state = appReducer(state, { type: 'cancel_edit' });
    expect(state.editing).toBe(false);
  });

  it('changes the language and never persists the editing flag', () => {
    const state = appReducer(
      { ...initialState(saved), editing: true },
      { type: 'set_language', lang: 'en' },
    );

    expect(toPersisted(state)).toEqual({ ...saved, lang: 'en' });
  });
});

describe('storage', () => {
  it('round-trips the saved state', () => {
    const store = memoryStore();

    expect(saveState(store, saved)).toBe(true);
    expect(loadState(store)).toEqual(saved);
  });

  it.each([
    ['nothing saved', {}],
    ['corrupt JSON', { 'smogsense:v1': '{oops' }],
    ['an outdated shape', { 'smogsense:v1': JSON.stringify({ lang: 'fr' }) }],
  ])('starts fresh with %s', (_label, initial) => {
    expect(loadState(memoryStore(initial))).toBeNull();
  });

  it('keeps working when storage is unavailable or full', () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };

    expect(saveState(full, saved)).toBe(false);
    expect(saveState(null, saved)).toBe(false);
    expect(loadState(null)).toBeNull();
  });

  it('uses the browser’s localStorage when it is available', () => {
    expect(browserStorage()).toBe(window.localStorage);
  });
});
