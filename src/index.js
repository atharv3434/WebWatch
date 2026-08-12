/**
 * Library entry point — import these directly if you want to use
 * site-monitor's pieces programmatically instead of via the CLI.
 */

export { fetchHtml, FetchError } from './fetcher.js';
export { extractContent, ExtractionError } from './extractor.js';
export { hashContent } from './hasher.js';
export { diffContent } from './differ.js';
export { loadState, saveState } from './store.js';
export { loadConfig, ConfigError } from './config.js';
export { checkWatcher, checkAllWatchers } from './monitor.js';
export { notifyConsole, notifyWebhook } from './notifier.js';
