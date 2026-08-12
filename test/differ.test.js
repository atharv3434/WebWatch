import { diffContent } from '../src/differ.js';

describe('diffContent', () => {
  test('reports no changes for identical content', () => {
    const result = diffContent(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(result.hasChanges).toBe(false);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
  });

  test('detects added lines', () => {
    const result = diffContent(['a', 'b'], ['a', 'b', 'c']);
    expect(result.hasChanges).toBe(true);
    expect(result.added).toBeGreaterThan(0);
  });

  test('detects removed lines', () => {
    const result = diffContent(['a', 'b', 'c'], ['a', 'b']);
    expect(result.hasChanges).toBe(true);
    expect(result.removed).toBeGreaterThan(0);
  });

  test('detects a changed line as a removal + addition', () => {
    const result = diffContent(['price: $10'], ['price: $15']);
    expect(result.hasChanges).toBe(true);
    expect(result.added).toBeGreaterThan(0);
    expect(result.removed).toBeGreaterThan(0);
  });

  test('summary includes +/- markers for changed lines', () => {
    const result = diffContent(['old line'], ['new line']);
    expect(result.summary).toContain('-');
    expect(result.summary).toContain('+');
  });

  test('handles empty old content (first real diff after baseline)', () => {
    const result = diffContent([], ['new content']);
    expect(result.hasChanges).toBe(true);
    expect(result.added).toBeGreaterThan(0);
  });
});
