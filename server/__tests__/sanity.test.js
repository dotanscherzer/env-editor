import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('vitest runs CommonJS modules in env-editor', () => {
    expect(1 + 1).toBe(2);
  });

  it('NODE_ENV is set to test during runs', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
