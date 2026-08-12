import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadState, saveState } from '../src/store.js';

describe('state store', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'site-monitor-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('returns null for a watcher with no saved state', async () => {
    const state = await loadState(tempDir, 'never-checked');
    expect(state).toBeNull();
  });

  test('saves and loads state correctly', async () => {
    await saveState(tempDir, 'my-watcher', { hash: 'abc123', content: ['line one', 'line two'] });
    const state = await loadState(tempDir, 'my-watcher');

    expect(state.hash).toBe('abc123');
    expect(state.content).toEqual(['line one', 'line two']);
    expect(state.lastChecked).toBeDefined();
  });

  test('sanitizes watcher names with unsafe characters into a valid filename', async () => {
    await saveState(tempDir, 'my watcher / with slashes!', { hash: 'x', content: [] });
    const state = await loadState(tempDir, 'my watcher / with slashes!');
    expect(state.hash).toBe('x');
  });

  test('creates the state directory if it does not exist', async () => {
    const nestedDir = path.join(tempDir, 'nested', 'state');
    await saveState(nestedDir, 'watcher', { hash: 'x', content: [] });
    const state = await loadState(nestedDir, 'watcher');
    expect(state.hash).toBe('x');
  });

  test('overwriting state updates lastChecked', async () => {
    await saveState(tempDir, 'watcher', { hash: 'first', content: [] });
    const first = await loadState(tempDir, 'watcher');

    await new Promise((resolve) => setTimeout(resolve, 10));
    await saveState(tempDir, 'watcher', { hash: 'second', content: [] });
    const second = await loadState(tempDir, 'watcher');

    expect(second.hash).toBe('second');
    expect(new Date(second.lastChecked).getTime()).toBeGreaterThanOrEqual(
      new Date(first.lastChecked).getTime(),
    );
  });
});
