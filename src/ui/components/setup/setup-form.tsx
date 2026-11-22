import { type RefObject } from 'react';
import { memberName } from '../../members.js';
import { useAppDispatch, useAppState, useMessages } from '../../state/app-context.js';
import { DEMO_HOUSEHOLD, DEMO_LOCATION, EMPTY_PROFILE } from './defaults.js';
import { CommuteFieldset, ExerciseFieldset } from './lifestyle-fieldsets.js';
import { HomeFieldset } from './home-fieldset.js';
import type { InvalidFields } from './field-section.js';
import { LocationPicker } from './location-picker.js';
import { MembersFieldset } from './members-fieldset.js';
import { SetupHero } from './setup-hero.js';
import {
  invalidPaths,
  useSetupDraft,
  useSetupSubmit,
  type Draft,
  type ProfileUpdate,
} from './setup-draft.js';

interface LifestyleSectionsProps {
  readonly draft: Draft;
  readonly invalid: InvalidFields;
  readonly update: ProfileUpdate;
}

function LifestyleSections({ draft, invalid, update }: LifestyleSectionsProps) {
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

interface SetupFormProps {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}

/** The household form: location, members and lifestyle, validated before the plan is built. */
export function SetupForm({ headingRef }: SetupFormProps) {
  const state = useAppState();
  const form = useSetupDraft({
    profile: state.household?.profile ?? EMPTY_PROFILE,
    names: state.household?.names ?? {},
    location: state.location,
  });
  const { draft } = form;
  const { submitted, submit } = useSetupSubmit(draft);
  const invalid = submitted ? invalidPaths(draft.profile) : new Set<string>();

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
