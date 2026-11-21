import { describe, expect, it } from 'vitest';
import { en } from './en.js';
import { hi } from './hi.js';

interface Leaf {
  readonly path: string;
  readonly value: unknown;
}

/** Every message in a catalogue with its dotted path; arrays count as one message. */
function leaves(node: unknown, path = ''): Leaf[] {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    return [{ path, value: node }];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    leaves(value, path === '' ? key : `${path}.${key}`),
  );
}

function kind(value: unknown): string {
  return Array.isArray(value) ? `array of ${value.length}` : typeof value;
}

/** Text that stays the same in Hindi: product names, abbreviations and units. */
const SAME_IN_HINDI = [
  'app.name',
  'options.condition.copd',
  'options.cookingFuel.lpg',
  'options.mask.n95',
  'forecast.pm25',
  'chat.assistant',
];

describe('interface text', () => {
  it('has every English message in Hindi, of the same kind', () => {
    const english = leaves(en).map(({ path, value }) => [path, kind(value)]);
    const hindi = leaves(hi).map(({ path, value }) => [path, kind(value)]);

    expect(hindi).toEqual(english);
  });

  it('translates every plain message except product names, abbreviations and units', () => {
    const english = new Map(leaves(en).map(({ path, value }) => [path, value]));
    const untranslated = leaves(hi)
      .filter(({ path, value }) => typeof value === 'string' && value === english.get(path))
      .map(({ path }) => path);

    expect(untranslated).toEqual(SAME_IN_HINDI);
  });

  it.each([
    ['English', en],
    ['Hindi', hi],
  ])('puts every argument into the %s text', (_language, messages) => {
    const templates = leaves(messages).filter(({ value }) => typeof value === 'function');

    expect(templates.length).toBeGreaterThan(10);
    for (const { path, value } of templates) {
      if (typeof value !== 'function') {
        continue;
      }
      const args = [11, 22, 33, 44].slice(0, value.length);
      const text: unknown = Reflect.apply(value, undefined, args);
      expect(typeof text, path).toBe('string');
      for (const arg of args) {
        expect(String(text), path).toContain(String(arg));
      }
    }
  });
});
