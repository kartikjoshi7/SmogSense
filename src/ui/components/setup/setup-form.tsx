import { useState, type RefObject, type SyntheticEvent } from 'react';
import { profileSchema, type Member, type Profile } from '../../../shared/profile.js';
import { memberName } from '../../members.js';
import { useAppDispatch, useAppState, useMessages } from '../../state/app-context.js';
import type { SavedLocation } from '../../state/storage.js';
import { DEMO_HOUSEHOLD, DEMO_LOCATION, EMPTY_PROFILE, nextMemberId } from './defaults.js';
import { CommuteFieldset, ExerciseFieldset } from './lifestyle-fieldsets.js';
import { HomeFieldset } from './home-fieldset.js';
import type { InvalidFields } from './field-section.js';
import { LocationPicker } from './location-picker.js';
import { MembersFieldset } from './members-fieldset.js';

interface Draft {
  readonly profile: Profile;
  readonly names: Readonly<Record<string, string>>;
  readonly location: SavedLocation | null;
}

type ProfileUpdate = (change: (profile: Profile) => Profile) => void;

function invalidPaths(profile: Profile): Set<string> {
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
function useSetupDraft(initial: Draft) {
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

function LifestyleSections({
  draft,
  invalid,
  update,
}: {
  readonly draft: Draft;
  readonly invalid: InvalidFields;
  readonly update: ProfileUpdate;
}) {
  const t = useMessages();
  const { members } = draft.profile;
  const memberOptions = {
    '': t.setup.exercise.everyone,
    ...Object.fromEntries(
      members.map((m) => [m.id, memberName(members, draft.names, m.id, t.setup.household.member)]),
    ),
  };
  return (
    <>
      <CommuteFieldset
        value={draft.profile.commute}
        invalid={invalid}
        onChange={(patch) => {
          update((p) => ({ ...p, commute: { ...p.commute, ...patch } }));
        }}
      />
      <ExerciseFieldset
        value={draft.profile.exercise}
        memberOptions={memberOptions}
        invalid={invalid}
        onChange={(patch) => {
          update((p) => ({ ...p, exercise: { ...p.exercise, ...patch } }));
        }}
      />
      <HomeFieldset
        value={draft.profile.home}
        mask={draft.profile.mask}
        invalid={invalid}
        onChange={(patch) => {
          update((p) => ({ ...p, home: { ...p.home, ...patch } }));
        }}
        onMaskChange={(mask) => {
          update((p) => ({ ...p, mask }));
        }}
      />
    </>
  );
}

function SetupActions({ showError }: { readonly showError: boolean }) {
  const t = useMessages().setup;
  const { editing } = useAppState();
  const dispatch = useAppDispatch();
  return (
    <div className="action-bar">
      {showError ? (
        <p role="alert" className="field-error">
          {t.errors}
        </p>
      ) : null}
      <div className="ms-auto flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">
          {t.save}
        </button>
        {editing ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              dispatch({ type: 'cancel_edit' });
            }}
          >
            {t.cancel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The top of the setup screen: what SmogSense does, and the one-click example family. */
function SetupHero({
  headingRef,
  onDemo,
}: {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onDemo: () => void;
}) {
  const t = useMessages().setup;
  return (
    <div className="hero grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
      <div className="grid gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold sm:text-4xl">
          {t.title}
        </h1>
        <p className="muted text-lg">{t.intro}</p>
      </div>
      <div className="grid gap-4">
        <ul className="flex flex-wrap gap-2">
          {t.features.map((feature) => (
            <li key={feature} className="feature">
              <span aria-hidden="true">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <button type="button" className="btn-primary justify-self-start" onClick={onDemo}>
          {t.demo}
        </button>
      </div>
    </div>
  );
}

/** The household form: location, members and lifestyle, validated before the plan is built. */
export function SetupForm({
  headingRef,
}: {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [submitted, setSubmitted] = useState(false);
  const form = useSetupDraft({
    profile: state.household?.profile ?? EMPTY_PROFILE,
    names: state.household?.names ?? {},
    location: state.location,
  });
  const { draft } = form;
  const invalid = submitted ? invalidPaths(draft.profile) : new Set<string>();

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const parsed = profileSchema.safeParse(draft.profile);
    if (parsed.success && draft.location !== null) {
      const household = { profile: parsed.data, names: cleanNames(draft) };
      dispatch({ type: 'save_setup', household, location: draft.location });
    }
  };

  return (
    <form className="grid gap-5" noValidate onSubmit={submit}>
      <SetupHero
        headingRef={headingRef}
        onDemo={() => {
          form.setDraft({ ...DEMO_HOUSEHOLD, location: DEMO_LOCATION });
        }}
      />
      <div className="setup-steps">
        <LocationPicker
          value={draft.location}
          invalid={submitted}
          onChange={(location) => {
            form.setDraft((d) => ({ ...d, location }));
          }}
        />
        <MembersFieldset
          members={draft.profile.members}
          names={draft.names}
          onChange={form.changeMember}
          onAdd={form.addMember}
          onRemove={form.removeMember}
        />
        <LifestyleSections draft={draft} invalid={invalid} update={form.update} />
      </div>
      <SetupActions showError={submitted && (invalid.size > 0 || draft.location === null)} />
    </form>
  );
}
