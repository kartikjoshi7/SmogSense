/** Member helpers: display names and the next free member id. */
import type { Member } from '../shared/profile.js';

/**
 * A member's display name: the name typed on this device, or "Member N" by their position.
 * Names never leave the device; the API only sees member ids.
 */
export function memberName(
  members: readonly Member[],
  names: Readonly<Record<string, string>>,
  id: string,
  numbered: (position: number) => string,
): string {
  const name = names[id] ?? '';
  return name === '' ? numbered(members.findIndex((m) => m.id === id) + 1) : name;
}

/** The next free member id (`m1`, `m2`, …), never reusing one that is still in use. */
export function nextMemberId(members: readonly Member[]): string {
  const used = members.map((m) => Number(m.id.slice(1))).filter(Number.isFinite);
  return `m${Math.max(0, ...used) + 1}`;
}
