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
  stateStorageFile: path.join(os.tmpdir(), 'foro-state-api-test.json'),
});

const startTestServer = async () => {
  const { app } = createServerApp({
    rootDir: ROOT_DIR,
    config: createTestConfig(),
    stateStore: createAppStateStore({ mode: 'memory' }),
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

test('state API rejects requests without the internal token', async (t) => {
  const { server, baseUrl } = await startTestServer();

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(`${baseUrl}/api/state/demo/key`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('state API supports create, read, validation, and delete flows', async (t) => {
  const { server, baseUrl } = await startTestServer();

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const authedHeaders = {
    'x-internal-token': INTERNAL_TOKEN,
  };

  let response = await fetch(`${baseUrl}/api/state/demo/feed`, {
    method: 'PUT',
    headers: {
      ...authedHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Missing "value" in request body',
  });

  response = await fetch(`${baseUrl}/api/state/demo/feed`, {
    method: 'PUT',
    headers: {
      ...authedHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: {
        posts: ['a', 'b'],
        count: 2,
      },
    }),
  });
  assert.equal(response.status, 204);

  response = await fetch(`${baseUrl}/api/state/demo/feed`, {
    headers: authedHeaders,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    namespace: 'demo',
    key: 'feed',
    exists: true,
    value: {
      posts: ['a', 'b'],
      count: 2,
    },
  });

  response = await fetch(`${baseUrl}/api/state/demo/feed`, {
    method: 'DELETE',
    headers: authedHeaders,
  });
  assert.equal(response.status, 204);

  response = await fetch(`${baseUrl}/api/state/demo/feed`, {
    headers: authedHeaders,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    namespace: 'demo',
    key: 'feed',
    exists: false,
    value: null,
  });
});
