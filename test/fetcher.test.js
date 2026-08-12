import { createServer } from 'node:http';
import { fetchHtml, FetchError } from '../src/fetcher.js';

describe('fetchHtml', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/ok') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Hello</h1></body></html>');
      } else if (req.url === '/not-found') {
        res.writeHead(404);
        res.end('Not found');
      } else if (req.url === '/slow') {
        setTimeout(() => {
          res.writeHead(200);
          res.end('<html></html>');
        }, 500);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('fetches HTML content successfully', async () => {
    const html = await fetchHtml(`${baseUrl}/ok`);
    expect(html).toContain('<h1>Hello</h1>');
  });

  test('throws FetchError with status code on HTTP error responses', async () => {
    await expect(fetchHtml(`${baseUrl}/not-found`)).rejects.toThrow(FetchError);
    await expect(fetchHtml(`${baseUrl}/not-found`)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws FetchError on timeout', async () => {
    await expect(fetchHtml(`${baseUrl}/slow`, { timeoutMs: 50 })).rejects.toThrow(/timed out/);
  });

  test('throws FetchError for unreachable hosts', async () => {
    await expect(fetchHtml('http://localhost:1')).rejects.toThrow(FetchError);
  });
});
