/** Display text for each key of a union, in the order the options are shown. */
export type Labels<K extends string> = Readonly<Record<K, string>>;

/** Each option's key and text, in the order the table lists them. */
export function entries<K extends string>(labels: Labels<K>): [K, string][] {
  const pairs: [K, string][] = [];
  // Over a generic record, `for...in` types each key as K; message objects are plain literals.
  for (const key in labels) {
    pairs.push([key, labels[key]]);
  }
  return pairs;
}
