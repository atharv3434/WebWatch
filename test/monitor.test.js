import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkWatcher, checkAllWatchers } from '../src/monitor.js';

describe('checkWatcher (integration, real local server)', () => {
  let server;
  let baseUrl;
  let currentBody;
  let tempDir;

  beforeAll(async () => {
    server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(currentBody);
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'site-monitor-monitor-test-'));
    currentBody = '<html><body><h1>Original Title</h1></body></html>';
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const watcher = { name: 'test-watcher', get url() { return baseUrl; }, selector: 'h1' };

  test('first check returns status "first_check" and saves a baseline', async () => {
    const result = await checkWatcher(watcher, tempDir);
    expect(result.status).toBe('first_check');
    expect(result.watcherName).toBe('test-watcher');
  });

  test('second check with unchanged content returns "unchanged"', async () => {
    await checkWatcher(watcher, tempDir);
    const result = await checkWatcher(watcher, tempDir);
    expect(result.status).toBe('unchanged');
  });

  test('detects a real content change between two checks', async () => {
    await checkWatcher(watcher, tempDir);

    currentBody = '<html><body><h1>Updated Title</h1></body></html>';
    const result = await checkWatcher(watcher, tempDir);

    expect(result.status).toBe('changed');
    expect(result.diff.hasChanges).toBe(true);
    expect(result.diff.summary).toContain('Updated Title');
  });

  test('captures fetch/extraction errors without throwing', async () => {
    const badWatcher = { name: 'bad-watcher', url: 'http://localhost:1', selector: 'h1' };
    const result = await checkWatcher(badWatcher, tempDir);
    expect(result.status).toBe('error');
    expect(result.error).toBeInstanceOf(Error);
  });

  test('captures a selector-not-found error without throwing', async () => {
    const badSelectorWatcher = { name: 'bad-selector', get url() { return baseUrl; }, selector: '.nope' };
    const result = await checkWatcher(badSelectorWatcher, tempDir);
    expect(result.status).toBe('error');
    expect(result.error.message).toMatch(/matched no elements/);
  });
});

describe('checkAllWatchers', () => {
  let server;
  let baseUrl;
  let tempDir;

  beforeAll(async () => {
    server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Content</h1></body></html>');
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'site-monitor-batch-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('checks multiple watchers and returns one result per watcher, in order', async () => {
    const watchers = [
      { name: 'watcher-a', url: baseUrl, selector: 'h1' },
      { name: 'watcher-b', url: baseUrl, selector: 'h1' },
      { name: 'watcher-c', url: baseUrl, selector: 'h1' },
    ];

    const results = await checkAllWatchers(watchers, tempDir);

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.watcherName)).toEqual(['watcher-a', 'watcher-b', 'watcher-c']);
    expect(results.every((r) => r.status === 'first_check')).toBe(true);
  });

  test('one failing watcher does not prevent others from succeeding', async () => {
    const watchers = [
      { name: 'good', url: baseUrl, selector: 'h1' },
      { name: 'bad', url: 'http://localhost:1', selector: 'h1' },
    ];

    const results = await checkAllWatchers(watchers, tempDir);
    const good = results.find((r) => r.watcherName === 'good');
    const bad = results.find((r) => r.watcherName === 'bad');

    expect(good.status).toBe('first_check');
    expect(bad.status).toBe('error');
  });
});
