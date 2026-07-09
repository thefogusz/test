const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createServerApp } = require('../app.cjs');
const { createAppStateStore } = require('../lib/appStateStore.cjs');

const INTERNAL_TOKEN = 'test-internal-token';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PUBLIC_DNS_RESULT = [{ address: '93.184.216.34', family: 4 }];

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

const startTestServer = async (
  fetchImpl,
  { dnsLookupImpl = async () => PUBLIC_DNS_RESULT } = {},
) => {
  const { app } = createServerApp({
    rootDir: ROOT_DIR,
    config: createTestConfig(),
    stateStore: createAppStateStore({ mode: 'memory' }),
    fetchImpl,
    dnsLookupImpl,
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

test('RSS API rejects private and local feed URLs before fetching upstream', async (t) => {
  let fetchCalled = false;
  const { server, baseUrl } = await startTestServer(async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called for private feed URLs');
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  for (const feedUrl of [
    'http://localhost/feed.xml',
    'http://127.0.0.1/feed.xml',
    'http://10.0.0.2/feed.xml',
    'http://169.254.169.254/latest/meta-data',
  ]) {
    const response = await fetch(
      `${baseUrl}/api/rss?url=${encodeURIComponent(feedUrl)}`,
      {
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
        },
      },
    );

    assert.equal(response.status, 400, feedUrl);
    assert.deepEqual(await response.json(), { error: 'Invalid feed url' });
  }

  assert.equal(fetchCalled, false);
});

test('RSS API rejects IPv4-mapped IPv6 feed URLs before fetching upstream', async (t) => {
  let fetchCalled = false;
  const { server, baseUrl } = await startTestServer(async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called for IPv4-mapped private URLs');
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  for (const feedUrl of [
    'http://[::ffff:127.0.0.1]/feed.xml',
    'http://[::ffff:7f00:1]/feed.xml',
  ]) {
    const response = await fetch(
      `${baseUrl}/api/rss?url=${encodeURIComponent(feedUrl)}`,
      {
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
        },
      },
    );

    assert.equal(response.status, 400, feedUrl);
    assert.deepEqual(await response.json(), { error: 'Invalid feed url' });
  }

  assert.equal(fetchCalled, false);
});

test('RSS API rejects feed hostnames that resolve to private IPs', async (t) => {
  let fetchCalled = false;
  const { server, baseUrl } = await startTestServer(
    async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called for private DNS results');
    },
    {
      dnsLookupImpl: async () => [{ address: '127.0.0.1', family: 4 }],
    },
  );

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

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid feed url' });
  assert.equal(fetchCalled, false);
});

test('RSS API rejects private IPs returned during connection-time DNS lookup', async (t) => {
  let upstreamHit = false;
  const upstreamServer = http.createServer((req, res) => {
    upstreamHit = true;
    res.end('<rss><channel /></rss>');
  });

  await new Promise((resolve) => {
    upstreamServer.listen(0, '127.0.0.1', resolve);
  });

  const upstreamAddress = upstreamServer.address();
  assert.ok(upstreamAddress && typeof upstreamAddress === 'object');

  let lookupCount = 0;
  const { server, baseUrl } = await startTestServer(undefined, {
    dnsLookupImpl: async () => {
      lookupCount += 1;
      return lookupCount === 1
        ? [{ address: '93.184.216.34', family: 4 }]
        : [{ address: '127.0.0.1', family: 4 }];
    },
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => upstreamServer.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/rss?url=${encodeURIComponent(
      `http://rebind.test:${upstreamAddress.port}/feed.xml`,
    )}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid feed url' });
  assert.equal(upstreamHit, false);
  assert.ok(lookupCount >= 2);
});

test('RSS API rejects redirects to private feed URLs', async (t) => {
  const fetchedUrls = [];
  const { server, baseUrl } = await startTestServer(async (url) => {
    fetchedUrls.push(url);
    return new Response('', {
      status: 302,
      headers: {
        location: 'http://127.0.0.1/feed.xml',
      },
    });
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

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid feed url' });
  assert.deepEqual(fetchedUrls, ['https://example.com/feed.xml']);
});

test('RSS API stops reading oversized upstream response streams', async (t) => {
  let textCalled = false;
  const oversizedChunk = new Uint8Array(2 * 1024 * 1024 + 1);
  const { server, baseUrl } = await startTestServer(async () => ({
    status: 200,
    headers: new Headers(),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(oversizedChunk);
        controller.close();
      },
    }),
    text: async () => {
      textCalled = true;
      return '';
    },
  }));

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

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'Upstream response too large' });
  assert.equal(textCalled, false);
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
