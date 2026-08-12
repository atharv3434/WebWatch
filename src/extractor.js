/**
 * Extracts content from HTML using a CSS selector, via cheerio.
 */

import * as cheerio from 'cheerio';

export class ExtractionError extends Error {
  constructor(message, { selector, url } = {}) {
    super(message);
    this.name = 'ExtractionError';
    this.selector = selector;
    this.url = url;
  }
}

/**
 * Extract text content from every element matching `selector`, joined by
 * newlines. Each matched element's text is trimmed and collapsed to single
 * spaces internally, so incidental HTML whitespace/formatting changes don't
 * register as false-positive content changes.
 *
 * @param {string} html
 * @param {string} selector
 * @param {{ url?: string, attribute?: string }} [options] attribute: extract
 *   an attribute value (e.g. 'href', 'src') instead of text content.
 * @returns {string[]} one string per matched element
 */
export function extractContent(html, selector, options = {}) {
  const $ = cheerio.load(html);
  const matches = $(selector);

  if (matches.length === 0) {
    throw new ExtractionError(
      `Selector "${selector}" matched no elements${options.url ? ` on ${options.url}` : ''}. ` +
        `The page structure may have changed, or the selector may be wrong.`,
      { selector, url: options.url },
    );
  }

  const results = [];
  matches.each((_, el) => {
    const raw = options.attribute
      ? ($(el).attr(options.attribute) ?? '')
      : $(el).text();
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (cleaned) results.push(cleaned);
  });

  return results;
}
