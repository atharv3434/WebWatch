import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig, ConfigError } from '../src/config.js';

describe('loadConfig', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'site-monitor-config-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function writeConfig(obj) {
    const configPath = path.join(tempDir, 'watchers.json');
    await writeFile(configPath, JSON.stringify(obj), 'utf8');
    return configPath;
  }

  test('loads a valid config', async () => {
    const configPath = await writeConfig({
      watchers: [{ name: 'test', url: 'https://example.com', selector: 'h1' }],
    });
    const { watchers, stateDir } = await loadConfig(configPath);
    expect(watchers).toHaveLength(1);
    expect(stateDir).toBe('state'); // default
  });

  test('respects a custom stateDir', async () => {
    const configPath = await writeConfig({
      stateDir: 'custom-state',
      watchers: [{ name: 'test', url: 'https://example.com', selector: 'h1' }],
    });
    const { stateDir } = await loadConfig(configPath);
    expect(stateDir).toBe('custom-state');
  });

  test('throws ConfigError for a missing file', async () => {
    await expect(loadConfig(path.join(tempDir, 'nope.json'))).rejects.toThrow(ConfigError);
  });

  test('throws ConfigError for invalid JSON', async () => {
    const configPath = path.join(tempDir, 'bad.json');
    await writeFile(configPath, '{ not valid json', 'utf8');
    await expect(loadConfig(configPath)).rejects.toThrow(ConfigError);
  });

  test('throws ConfigError when watchers array is missing', async () => {
    const configPath = await writeConfig({});
    await expect(loadConfig(configPath)).rejects.toThrow(/watchers/);
  });

  test('throws ConfigError when watchers array is empty', async () => {
    const configPath = await writeConfig({ watchers: [] });
    await expect(loadConfig(configPath)).rejects.toThrow(ConfigError);
  });

  test('throws ConfigError when a watcher is missing a required field', async () => {
    const configPath = await writeConfig({ watchers: [{ name: 'test', url: 'https://example.com' }] });
    await expect(loadConfig(configPath)).rejects.toThrow(/selector/);
  });

  test('throws ConfigError for an invalid URL', async () => {
    const configPath = await writeConfig({
      watchers: [{ name: 'test', url: 'not-a-url', selector: 'h1' }],
    });
    await expect(loadConfig(configPath)).rejects.toThrow(/invalid URL/);
  });

  test('throws ConfigError for duplicate watcher names', async () => {
    const configPath = await writeConfig({
      watchers: [
        { name: 'dup', url: 'https://example.com', selector: 'h1' },
        { name: 'dup', url: 'https://example.org', selector: 'p' },
      ],
    });
    await expect(loadConfig(configPath)).rejects.toThrow(/Duplicate/);
  });
});
