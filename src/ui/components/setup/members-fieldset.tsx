import { useId } from 'react';
import type { Member } from '../../../shared/profile.js';
import { useMessages } from '../../state/app-context.js';
import { CheckboxGroup, SelectField } from '../common/fields.js';

const MAX_MEMBERS = 8;
const MAX_NAME_LENGTH = 40;

interface MemberRowProps {
  readonly member: Member;
  readonly name: string;
  readonly position: number;
  readonly canRemove: boolean;
  readonly onChange: (member: Member, name: string) => void;
  readonly onRemove: () => void;
}

function MemberRow({ member, name, position, canRemove, onChange, onRemove }: MemberRowProps) {
  const t = useMessages();
  const nameId = useId();
  const shownName = name === '' ? t.setup.household.member(position) : name;
  return (
    <li className="grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-2">
      <div className="field">
        <label htmlFor={nameId}>{t.setup.household.name}</label>
        <input
          id={nameId}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          onChange={(e) => {
            onChange(member, e.target.value);
          }}
        />
      </div>
      <SelectField
        label={t.setup.household.ageGroup}
        value={member.ageGroup}
        options={t.options.ageGroup}
        onChange={(ageGroup) => {
          onChange({ ...member, ageGroup }, name);
        }}
      />
      <CheckboxGroup
        legend={t.setup.household.conditions}
        options={t.options.condition}
        values={member.conditions}
        onChange={(conditions) => {
          onChange({ ...member, conditions }, name);
        }}
      />
      {canRemove ? (
        <button type="button" className="btn-secondary self-end" onClick={onRemove}>
          {t.setup.household.remove(shownName)}
        </button>
      ) : null}
    </li>
  );
}

/** Household members: age group and health conditions, with names kept on the device. */
export function MembersFieldset({
  members,
  names,
  onChange,
  onAdd,
  onRemove,
}: {
  readonly members: readonly Member[];
  readonly names: Readonly<Record<string, string>>;
  readonly onChange: (member: Member, name: string) => void;
  readonly onAdd: () => void;
  readonly onRemove: (id: string) => void;
}) {
  const t = useMessages().setup.household;
  return (
    <fieldset className="card grid gap-3">
      <legend className="text-lg font-semibold">{t.legend}</legend>
      <ul className="grid gap-3">
        {members.map((member, index) => (
          <MemberRow
            key={member.id}
            member={member}
            name={names[member.id] ?? ''}
            position={index + 1}
            canRemove={members.length > 1}
            onChange={onChange}
            onRemove={() => {
              onRemove(member.id);
            }}
          />
        ))}
      </ul>
      <button
        type="button"
        className="btn-secondary justify-self-start"
        disabled={members.length >= MAX_MEMBERS}
        onClick={onAdd}
      >
        {t.add}
      </button>
    </fieldset>
  );
}
