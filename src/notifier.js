/**
 * Sends change notifications. Console output always happens; a webhook POST
 * is sent additionally if the watcher config specifies one — this covers
 * both "just watch the terminal" and "notify Slack/Discord/a custom endpoint"
 * use cases without forcing either.
 */

/**
 * @param {{ name: string, url: string }} watcher
 * @param {{ hasChanges: boolean, summary: string, added: number, removed: number }} diff
 */
export function notifyConsole(watcher, diff) {
  const timestamp = new Date().toISOString();
  console.log('');
  console.log(`[${timestamp}] CHANGE DETECTED: ${watcher.name}`);
  console.log(`  URL: ${watcher.url}`);
  console.log(`  +${diff.added} / -${diff.removed} lines`);
  console.log('  ---');
  for (const line of diff.summary.split('\n')) {
    console.log(`  ${line}`);
  }
  console.log('');
}

/**
 * @param {string} webhookUrl
 * @param {{ name: string, url: string }} watcher
 * @param {{ hasChanges: boolean, summary: string, added: number, removed: number }} diff
 */
export async function notifyWebhook(webhookUrl, watcher, diff) {
  const payload = {
    watcher: watcher.name,
    url: watcher.url,
    timestamp: new Date().toISOString(),
    added: diff.added,
    removed: diff.removed,
    summary: diff.summary,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Don't throw — a failed notification shouldn't crash the whole monitor
    // run, since other watchers may still need to be checked. Just warn.
    console.warn(
      `Warning: webhook notification for "${watcher.name}" failed with status ${response.status}`,
    );
  }
}
