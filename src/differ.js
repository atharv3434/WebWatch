/**
 * Produces a human-readable diff between two versions of extracted content,
 * using the well-established `diff` package rather than hand-rolling diff
 * logic — line-level diffing has enough edge cases (empty inputs, trailing
 * newlines, etc.) that it's not worth reimplementing.
 */
import { diffLines } from 'diff';

/**
 * @param {string[]} oldLines
 * @param {string[]} newLines
 * @returns {{ hasChanges: boolean, summary: string, added: number, removed: number }}
 */
export function diffContent(oldLines, newLines) {
  const oldText = oldLines.join('\n');
  const newText = newLines.join('\n');

  const changes = diffLines(oldText, newText);
  let added = 0;
  let removed = 0;
  const summaryParts = [];

  for (const part of changes) {
    const lineCount = part.value.split('\n').filter((l) => l.length > 0).length;
    if (part.added) {
      added += lineCount;
      summaryParts.push(`+ ${part.value.trim()}`);
    } else if (part.removed) {
      removed += lineCount;
      summaryParts.push(`- ${part.value.trim()}`);
    }
  }

  return {
    hasChanges: added > 0 || removed > 0,
    summary: summaryParts.join('\n'),
    added,
    removed,
  };
}
