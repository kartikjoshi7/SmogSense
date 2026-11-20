import { describe, it, expect } from 'vitest';
import { GET, POST, OPTIONS, runtime } from './index.ts';

describe('Vercel API entry', () => {
  it('exports nodejs runtime', () => {
    expect(runtime).toBe('nodejs');
  });

  it('exports HTTP method handlers', () => {
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
    expect(OPTIONS).toBeDefined();
  });
});
