/**
 * Persists each watcher's last-known content + hash to a JSON file, so
 * change detection works across separate CLI invocations (not just within
 * one long-running `watch` process).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} stateDir
 * @param {string} watcherName
 * @returns {string}
 */
function stateFilePath(stateDir, watcherName) {
  // Sanitize the name into a safe filename — watcher names come from user
  // config, so don't trust them to already be filesystem-safe.
  const safeName = watcherName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(stateDir, `${safeName}.json`);
}

/**
 * @param {string} stateDir
 * @param {string} watcherName
 * @returns {Promise<{ hash: string, content: string[], lastChecked: string } | null>}
 */
export async function loadState(stateDir, watcherName) {
  const filePath = stateFilePath(stateDir, watcherName);
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`Failed to read state file ${filePath}: ${err.message}`);
  }
}

/**
 * @param {string} stateDir
 * @param {string} watcherName
 * @param {{ hash: string, content: string[] }} state
 */
export async function saveState(stateDir, watcherName, state) {
  await mkdir(stateDir, { recursive: true });
  const filePath = stateFilePath(stateDir, watcherName);
  const payload = {
    ...state,
    lastChecked: new Date().toISOString(),
  };
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}
