import { describe, expect, it } from 'vitest';
import { INDEX_BANDS, INDEX_VALUES } from '../shared/limits.js';
import * as C from './constants.js';

describe('index scales', () => {
  it.each(Object.entries(C.AQI_SCALES))(
    '%s has one band per position and ends at the top',
    (_, scale) => {
      expect(scale.bands).toHaveLength(INDEX_BANDS.max - INDEX_BANDS.min + 1);
      expect(scale.bands.at(-1)?.iHi).toBe(INDEX_VALUES.max);
    },
  );
});
