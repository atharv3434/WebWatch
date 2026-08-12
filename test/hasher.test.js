import { hashContent } from '../src/hasher.js';

describe('hashContent', () => {
  test('same content produces the same hash', () => {
    const a = hashContent(['line one', 'line two']);
    const b = hashContent(['line one', 'line two']);
    expect(a).toBe(b);
  });

  test('different content produces different hashes', () => {
    const a = hashContent(['line one']);
    const b = hashContent(['line two']);
    expect(a).not.toBe(b);
  });

  test('order of lines matters', () => {
    const a = hashContent(['first', 'second']);
    const b = hashContent(['second', 'first']);
    expect(a).not.toBe(b);
  });

  test('produces a hex string', () => {
    const hash = hashContent(['content']);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test('handles empty content array', () => {
    expect(() => hashContent([])).not.toThrow();
  });
});
