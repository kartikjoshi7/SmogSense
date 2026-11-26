/** The one way the server fingerprints data: a SHA-256 of its JSON, for cache keys and plan keys. */
import { createHash } from 'node:crypto';

/** A hex SHA-256 of the parts' JSON; the same parts always give the same digest. */
export function digestOf(...parts: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
