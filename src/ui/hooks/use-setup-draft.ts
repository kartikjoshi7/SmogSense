/** The setup form's draft household: its changes, its checks and saving it. */
import { useState, type SyntheticEvent } from 'react';
import { profileSchema, type Member, type Profile } from '../../shared/profile.js';
import { nextMemberId } from '../members.js';
import { useAppDispatch } from '../state/app-context.js';
import type { SavedLocation } from '../state/storage.js';

export interface Draft {
  readonly profile: Profile;
  readonly names: Readonly<Record<string, string>>;
  readonly location: SavedLocation | null;
}

export type ProfileUpdate = (change: (profile: Profile) => Profile) => void;

/** The paths of the fields that fail validation. */
export function invalidPaths(profile: Profile): Set<string> {
  const result = profileSchema.safeParse(profile);
  return new Set(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.')));
}

/** Trimmed names for current members only. */
function cleanNames(draft: Draft): Record<string, string> {
  return Object.fromEntries(
    draft.profile.members.map((m) => [m.id, (draft.names[m.id] ?? '').trim()]),
  );
}

/** The form's draft and every change it supports. */
export function useSetupDraft(initial: Draft) {
  const [draft, setDraft] = useState(initial);
  const update: ProfileUpdate = (change) => {
    setDraft((d) => ({ ...d, profile: change(d.profile) }));
  };
  const changeMember = (member: Member, name: string) => {
    setDraft((d) => ({
      ...d,
      names: { ...d.names, [member.id]: name },
      profile: {
        ...d.profile,
        members: d.profile.members.map((m) => (m.id === member.id ? member : m)),
      },
    }));
  };
  const addMember = () => {
    update((p) => ({
      ...p,
      members: [...p.members, { id: nextMemberId(p.members), ageGroup: 'adult', conditions: [] }],
    }));
  };
  const removeMember = (id: string) => {
    update((p) => ({
      ...p,
      members: p.members.filter((m) => m.id !== id),
      exercise: p.exercise.memberId === id ? { ...p.exercise, memberId: null } : p.exercise,
    }));
  };
  return { draft, setDraft, update, changeMember, addMember, removeMember };
}

/** Submitting the form: every field is checked, and a valid household with a place is saved. */
export function useSetupSubmit(draft: Draft) {
  const dispatch = useAppDispatch();
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const parsed = profileSchema.safeParse(draft.profile);
    if (parsed.success && draft.location !== null) {
      const household = { profile: parsed.data, names: cleanNames(draft) };
      dispatch({ type: 'save_setup', household, location: draft.location });
    }
  };
  return { submitted, submit };
}
