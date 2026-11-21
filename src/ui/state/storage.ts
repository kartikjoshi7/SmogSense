import { z } from 'zod';
import { uiLanguageSchema } from '../../shared/languages.js';
import { coordinatesSchema } from '../../shared/primitives.js';
import { profileSchema } from '../../shared/profile.js';

const STORAGE_KEY = 'smogsense:v1';

/** Longest display name a member can be given (names stay on this device). */
export const MEMBER_NAME_CHARS = 40;

const savedLocationSchema = coordinatesSchema.extend({
  label: z.string().min(1).max(120),
});
export type SavedLocation = z.infer<typeof savedLocationSchema>;

const householdSchema = z.object({
  profile: profileSchema,
  /** Display names by member id. They never leave this device. */
  names: z.record(z.string(), z.string().max(MEMBER_NAME_CHARS)),
});
export type Household = z.infer<typeof householdSchema>;

const persistedSchema = z.object({
  lang: uiLanguageSchema,
  household: householdSchema.nullable(),
  location: savedLocationSchema.nullable(),
});
export type Persisted = z.infer<typeof persistedSchema>;

/** The parts of browser storage this module uses (injectable for tests). */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

/** The browser's localStorage, or null where it is blocked (some private modes). */
export function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved state, or null when nothing valid is stored (missing, corrupt or outdated data). */
export function loadState(store: KeyValueStore | null): Persisted | null {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return null;
    }
    const parsed = persistedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Save the state; returns false when storage is unavailable or full (the app keeps working). */
export function saveState(store: KeyValueStore | null, state: Persisted): boolean {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(state));
    return store !== null;
  } catch {
    return false;
  }
}
