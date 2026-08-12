/**
 * Fetches HTML for a URL with a timeout and clear error messages.
 * Uses Node's built-in global fetch (available natively since Node 18+),
 * so no HTTP client dependency is needed just for this.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_USER_AGENT = 'site-monitor/1.0 (+https://github.com/example/site-monitor)';

export class FetchError extends Error {
  constructor(message, { url, cause, statusCode } = {}) {
    super(message);
    this.name = 'FetchError';
    this.url = url;
    this.statusCode = statusCode;
    if (cause) this.cause = cause;
  }
}

/**
 * Fetch a URL and return the response body as text.
 * @param {string} url
 * @param {{ timeoutMs?: number, userAgent?: string }} [options]
 * @returns {Promise<string>}
 */
export async function fetchHtml(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new FetchError(
        `Request to ${url} failed with status ${response.status} ${response.statusText}`,
        { url, statusCode: response.status },
      );
    }

    return await response.text();
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err.name === 'AbortError') {
      throw new FetchError(`Request to ${url} timed out after ${timeoutMs}ms`, { url, cause: err });
    }
    throw new FetchError(`Failed to fetch ${url}: ${err.message}`, { url, cause: err });
  } finally {
    clearTimeout(timeoutId);
  }
}
