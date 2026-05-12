const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createServerApp } = require('../app.cjs');
const { createAppStateStore } = require('../lib/appStateStore.cjs');

const INTERNAL_TOKEN = 'test-internal-token';
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const createTestConfig = () => ({
  rootDir: ROOT_DIR,
  port: 0,
  upstreamTimeoutMs: 1000,
  apiLogThresholdMs: 60_000,
  twitterApiKey: '',
  xaiApiKey: '',
  tavilyApiKey: '',
  internalApiSecret: INTERNAL_TOKEN,
  stripeSecretKey: '',
  stripePlusPriceId: 'price_test',
  stripeCheckoutBaseUrl: '',
  stateStorageMode: 'memory',
  stateStorageFile: path.join(os.tmpdir(), 'foro-rss-api-test.json'),
});

const startTestServer = async (fetchImpl) => {
  const { app } = createServerApp({
    rootDir: ROOT_DIR,
    config: createTestConfig(),
    stateStore: createAppStateStore({ mode: 'memory' }),
    fetchImpl,
  });
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
};

test('RSS API rejects unsupported feed URL protocols before fetching upstream', async (t) => {
  let fetchCalled = false;
  const { server, baseUrl } = await startTestServer(async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called for invalid feed URLs');
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/rss?url=${encodeURIComponent('file:///etc/passwd')}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid feed url' });
  assert.equal(fetchCalled, false);
});

test('RSS API fetches normalized http and https feed URLs', async (t) => {
  const fetchedUrls = [];
  const xml = '<rss><channel><item><title>ok</title></item></channel></rss>';
  const { server, baseUrl } = await startTestServer(async (url) => {
    fetchedUrls.push(url);
    return {
      status: 200,
      text: async () => xml,
    };
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/rss?url=${encodeURIComponent('https://example.com/feed.xml')}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), xml);
  assert.deepEqual(fetchedUrls, ['https://example.com/feed.xml']);
});
