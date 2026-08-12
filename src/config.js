/**
 * Loads and validates the watchers config file.
 */
import { readFile } from 'node:fs/promises';

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

const REQUIRED_FIELDS = ['name', 'url', 'selector'];

/**
 * @param {object} watcher
 * @param {number} index
 */
function validateWatcher(watcher, index) {
  for (const field of REQUIRED_FIELDS) {
    if (!watcher[field]) {
      throw new ConfigError(`Watcher at index ${index} is missing required field "${field}"`);
    }
  }
  try {
    // eslint-disable-next-line no-new
    new URL(watcher.url);
  } catch {
    throw new ConfigError(`Watcher "${watcher.name}" has an invalid URL: "${watcher.url}"`);
  }
}

/**
 * @param {string} configPath
 * @returns {Promise<{ watchers: object[], stateDir: string }>}
 */
export async function loadConfig(configPath) {
  let raw;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ConfigError(
        `Config file not found: ${configPath}. See config/watchers.example.json for the expected format.`,
      );
    }
    throw new ConfigError(`Failed to read config file ${configPath}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(`Config file ${configPath} is not valid JSON: ${err.message}`);
  }

  if (!Array.isArray(parsed.watchers) || parsed.watchers.length === 0) {
    throw new ConfigError(`Config file ${configPath} must have a non-empty "watchers" array`);
  }

  parsed.watchers.forEach(validateWatcher);

  const names = parsed.watchers.map((w) => w.name);
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicates.length > 0) {
    throw new ConfigError(`Duplicate watcher name(s): ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    watchers: parsed.watchers,
    stateDir: parsed.stateDir ?? 'state',
  };
}
