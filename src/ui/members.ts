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
