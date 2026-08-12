/**
 * Core orchestration: fetch a watcher's page, extract content, compare
 * against the last-known state, and report whether (and how) it changed.
 */
import { fetchHtml } from './fetcher.js';
import { extractContent } from './extractor.js';
import { hashContent } from './hasher.js';
import { diffContent } from './differ.js';
import { loadState, saveState } from './store.js';

/**
 * @typedef {object} CheckResult
 * @property {string} watcherName
 * @property {'changed'|'unchanged'|'first_check'|'error'} status
 * @property {{ hasChanges: boolean, summary: string, added: number, removed: number }} [diff]
 * @property {Error} [error]
 */

/**
 * Check a single watcher: fetch, extract, compare to stored state, persist
 * the new state. Never throws — errors are captured in the returned result
 * so a single bad watcher doesn't stop the rest of a batch run.
 *
 * @param {object} watcher
 * @param {string} stateDir
 * @returns {Promise<CheckResult>}
 */
export async function checkWatcher(watcher, stateDir) {
  try {
    const html = await fetchHtml(watcher.url, { timeoutMs: watcher.timeoutMs });
    const content = extractContent(html, watcher.selector, {
      url: watcher.url,
      attribute: watcher.attribute,
    });
    const hash = hashContent(content);

    const previousState = await loadState(stateDir, watcher.name);

    if (previousState === null) {
      await saveState(stateDir, watcher.name, { hash, content });
      return { watcherName: watcher.name, status: 'first_check' };
    }

    if (previousState.hash === hash) {
      await saveState(stateDir, watcher.name, { hash, content });
      return { watcherName: watcher.name, status: 'unchanged' };
    }

    const diff = diffContent(previousState.content, content);
    await saveState(stateDir, watcher.name, { hash, content });
    return { watcherName: watcher.name, status: 'changed', diff };
  } catch (error) {
    return { watcherName: watcher.name, status: 'error', error };
  }
}

/**
 * Check every watcher in the list. Watchers are checked concurrently (with a
 * cap) since network I/O dominates runtime and there's no reason to check
 * them one at a time.
 *
 * @param {object[]} watchers
 * @param {string} stateDir
 * @param {{ concurrency?: number }} [options]
 * @returns {Promise<CheckResult[]>}
 */
export async function checkAllWatchers(watchers, stateDir, options = {}) {
  const concurrency = options.concurrency ?? 5;
  const results = new Array(watchers.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < watchers.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await checkWatcher(watchers[currentIndex], stateDir);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, watchers.length) }, worker);
  await Promise.all(workers);

  return results;
}
