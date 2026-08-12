# site-monitor

A Node.js tool that watches web pages for content changes: fetch a page,
extract content via a CSS selector, and get notified — in the console and
optionally via webhook — when it changes. Run it once, or on a schedule.

## Features

- **CSS selector-based extraction** via cheerio — watch a price, a heading, a
  list of links, an attribute value, anything you can target with a selector
- **Real change detection**, not just "did the page load" — content is
  hashed and compared to the last known state, with a proper line-level diff
  (via the `diff` package) shown when something actually changes
- **Whitespace-insensitive**: incidental HTML formatting changes (extra
  spaces, line breaks) don't trigger false positives — content is normalized
  before hashing
- **Persistent state** across runs — a JSON file per watcher tracks the last
  known content, so `run` works correctly whether it's invoked once from cron
  or a hundred times from a long-running `watch` process
- **Concurrent checking** — multiple watchers are checked in parallel (capped
  concurrency), since network I/O dominates runtime
- **One bad watcher doesn't break the rest** — fetch errors, timeouts, and
  "selector matched nothing" are all captured per-watcher and reported, not thrown
- **Optional webhook notifications** alongside console output, per-watcher
- **43 tests**, almost all genuine integration tests against a real local
  HTTP server (not mocked fetch) — including one that mutates server content
  mid-test and verifies the diff output is actually correct

## Install

```bash
npm install
```

## Quick Start

```bash
# 1. Copy the example config and edit it with real URLs/selectors
cp config/watchers.example.json config/watchers.json

# 2. Run a check once
node src/cli.js run

# 3. Or run on a schedule (default: every 15 minutes)
node src/cli.js watch

# 4. See what's configured and when each watcher last ran
node src/cli.js list
```

## Configuring Watchers

`config/watchers.json`:

```json
{
  "stateDir": "state",
  "watchers": [
    {
      "name": "product-price",
      "url": "https://example.com/product/123",
      "selector": ".price",
      "timeoutMs": 15000,
      "webhookUrl": "https://your-webhook-endpoint.example.com/notify"
    },
    {
      "name": "latest-blog-post-links",
      "url": "https://example.com/blog",
      "selector": "article a.post-title",
      "attribute": "href"
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `name` | yes | Unique identifier — used for state file naming and log output |
| `url` | yes | Page to fetch |
| `selector` | yes | CSS selector for the content to watch |
| `attribute` | no | Extract this attribute's value instead of text content (e.g. `href`) |
| `timeoutMs` | no | Request timeout (default 15000) |
| `webhookUrl` | no | POSTed a JSON payload when a change is detected |

If a selector matches multiple elements, all of them are extracted and
compared as a group — useful for watching a list (e.g. "did any headline on
the homepage change").

## Webhook Payload

```json
{
  "watcher": "product-price",
  "url": "https://example.com/product/123",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "added": 1,
  "removed": 1,
  "summary": "- $19.99\n+ $24.99"
}
```

## Scheduling with `watch`

```bash
node src/cli.js watch --schedule "*/5 * * * *"    # every 5 minutes
node src/cli.js watch --schedule "0 9 * * *"       # once a day at 9am
```

Uses standard cron syntax via `node-cron`. For production use, consider
running `run` from an actual system cron job or CI schedule instead of
`watch` in a long-lived process — simpler to monitor and restart.

## Using It as a Library

Every piece is independently importable, not just wired into the CLI:

```js
import { fetchHtml, extractContent, hashContent, diffContent } from 'site-monitor';

const html = await fetchHtml('https://example.com');
const content = extractContent(html, '.price');
```

## Testing

```bash
npm test
```

43 tests across 7 suites. Most spin up a real local HTTP server (via Node's
built-in `http` module) rather than mocking `fetch` — including a test that
starts a server serving one version of a page, runs a check to establish a
baseline, mutates the server's response, runs a second check, and asserts the
diff correctly shows the old and new content. This exercises the real
fetch → extract → hash → compare → diff pipeline, not a mocked approximation
of it.

## A Note on Selector Stability

CSS-selector-based scraping is inherently fragile — if a site redesigns its
markup, your selector may stop matching (you'll get a clear error, not silent
wrong data) or start matching something different (harder to detect
automatically). Prefer stable-looking selectors (semantic classes, `id`
attributes, `data-*` attributes) over deeply nested structural selectors
(`div > div:nth-child(3) > span`) where possible, since the latter breaks on
almost any layout change.

## Extending

- **Email notifications**: add a `notifyEmail()` function alongside
  `notifyConsole`/`notifyWebhook` in `notifier.js` (e.g. via `nodemailer`)
- **Screenshot diffing**: for visual changes CSS selectors can't capture, pair
  this with a headless-browser screenshot tool and diff images instead of text
- **Multiple selectors per watcher**: extend the config schema to accept an
  array of `{ selector, label }` pairs per watcher, watching several pieces
  of one page independently
- **Rate limiting / politeness**: add a per-domain delay if watching many
  pages on the same site, to avoid hammering it with concurrent requests
