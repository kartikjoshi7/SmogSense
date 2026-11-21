/** Display text for each key of a union, in the order the options are shown. */
export type Labels<K extends string> = Readonly<Record<K, string>>;
