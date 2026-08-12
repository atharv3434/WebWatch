/**
 * Cheap change detection via content hashing — comparing hashes is much
 * faster than diffing on every check, so we only run the (more expensive,
 * more useful) text diff when the hash actually indicates a change.
 */

import { createHash } from 'node:crypto';

/**
 * @param {string[]} contentLines
 * @returns {string} a stable SHA-256 hex digest of the joined content
 */
export function hashContent(contentLines) {
  const joined = contentLines.join('\n');
  return createHash('sha256').update(joined, 'utf8').digest('hex');
}
