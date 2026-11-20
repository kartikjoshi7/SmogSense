import { describe, it, expect } from 'vitest';
import { aqiCategorySchema, type AqiCategory } from './schemas.js';

describe('aqiCategorySchema', () => {
  it('accepts valid AQI categories', () => {
    const valid: AqiCategory = 'good';
    expect(aqiCategorySchema.parse(valid)).toBe('good');
    expect(aqiCategorySchema.parse('hazardous')).toBe('hazardous');
  });

  it('rejects invalid values', () => {
    expect(() => aqiCategorySchema.parse('extreme')).toThrow();
    expect(() => aqiCategorySchema.parse('')).toThrow();
    expect(() => aqiCategorySchema.parse(42)).toThrow();
  });
});
