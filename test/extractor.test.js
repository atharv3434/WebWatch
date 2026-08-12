import { extractContent, ExtractionError } from '../src/extractor.js';

describe('extractContent', () => {
  const html = `
    <html>
      <body>
        <h1 class="title">  Product   Name  </h1>
        <span class="price">$19.99</span>
        <span class="price">$29.99</span>
        <a href="/page1">Link One</a>
        <a href="/page2">Link Two</a>
      </body>
    </html>
  `;

  test('extracts text from a single matching element', () => {
    const result = extractContent(html, '.title');
    expect(result).toEqual(['Product Name']);
  });

  test('collapses internal whitespace', () => {
    const result = extractContent(html, '.title');
    expect(result[0]).not.toMatch(/\s{2,}/);
  });

  test('extracts text from multiple matching elements', () => {
    const result = extractContent(html, '.price');
    expect(result).toEqual(['$19.99', '$29.99']);
  });

  test('extracts an attribute instead of text when specified', () => {
    const result = extractContent(html, 'a', { attribute: 'href' });
    expect(result).toEqual(['/page1', '/page2']);
  });

  test('throws ExtractionError when selector matches nothing', () => {
    expect(() => extractContent(html, '.does-not-exist')).toThrow(ExtractionError);
  });

  test('ExtractionError includes the selector and url for debugging', () => {
    try {
      extractContent(html, '.missing', { url: 'https://example.com' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError);
      expect(err.selector).toBe('.missing');
      expect(err.url).toBe('https://example.com');
    }
  });

  test('skips elements that are empty after trimming', () => {
    const sparseHtml = '<div><p>Real content</p><p>   </p></div>';
    const result = extractContent(sparseHtml, 'p');
    expect(result).toEqual(['Real content']);
  });
});
