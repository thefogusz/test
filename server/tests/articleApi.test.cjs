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
  stateStorageFile: path.join(os.tmpdir(), 'foro-article-api-test.json'),
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

test('article API rejects private and local article URLs before fetching upstream', async (t) => {
  let fetchCalled = false;
  const { server, baseUrl } = await startTestServer(async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called for private article URLs');
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  for (const articleUrl of [
    'http://localhost/story',
    'http://127.0.0.1/story',
    'http://172.16.0.5/story',
    'http://169.254.169.254/latest/meta-data',
  ]) {
    const response = await fetch(
      `${baseUrl}/api/article?url=${encodeURIComponent(articleUrl)}`,
      {
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
        },
      },
    );

    assert.equal(response.status, 400, articleUrl);
    assert.deepEqual(await response.json(), { error: 'Invalid article url' });
  }

  assert.equal(fetchCalled, false);
});

test('article API rejects article hostnames that resolve to private IPs', async (t) => {
  let fetchCalled = false;
  const { server, baseUrl } = await startTestServer(
    async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called for private DNS results');
    },
    {
      dnsLookupImpl: async () => [{ address: '10.0.0.4', family: 4 }],
    },
  );

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/article?url=${encodeURIComponent('https://example.com/story')}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid article url' });
  assert.equal(fetchCalled, false);
});

test('article API rejects redirects to private article URLs', async (t) => {
  const fetchedUrls = [];
  const { server, baseUrl } = await startTestServer(async (url) => {
    fetchedUrls.push(url);
    return new Response('', {
      status: 301,
      headers: {
        location: 'http://169.254.169.254/latest/meta-data',
      },
    });
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/article?url=${encodeURIComponent('https://example.com/story')}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid article url' });
  assert.deepEqual(fetchedUrls, ['https://example.com/story']);
});

test('article API extracts readable article content from HTML', async (t) => {
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Ignored document title</title>
        <meta property="og:site_name" content="Fortune" />
        <meta property="article:published_time" content="2026-04-05T23:11:00Z" />
      </head>
      <body>
        <article>
          <h1>Artemis II mission update</h1>
          <p class="byline">By Jane Doe</p>
          <p>NASA says the crew continued lunar fly-around preparations as engineers resolved a life-support issue.</p>
          <p>Officials said backup procedures worked as expected and the team is tracking additional checks.</p>
        </article>
      </body>
    </html>
  `;

  const { server, baseUrl } = await startTestServer(async (url) => {
    assert.equal(url, 'https://example.com/story');

    return {
      ok: true,
      status: 200,
      text: async () => html,
    };
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/article?url=${encodeURIComponent('https://example.com/story')}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.url, 'https://example.com/story');
  assert.equal(payload.title, 'Artemis II mission update');
  assert.equal(payload.siteName, 'Fortune');
  assert.equal(payload.publishedAt, '2026-04-05T23:11:00Z');
  assert.match(payload.contentHtml, /NASA says the crew continued lunar fly-around preparations/i);
  assert.match(payload.contentMarkdown, /Artemis II mission update/);
  assert.ok(payload.textContent.length > 80);
  assert.ok(payload.readingTimeMinutes >= 1);
});

test('article API removes trailing source boilerplate and CTA blocks', async (t) => {
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Boilerplate cleanup test</title>
      </head>
      <body>
        <article>
          <h1>Market update</h1>
          <p>Stocks moved higher after the latest inflation data came in below analyst expectations.</p>
          <p>Traders said risk appetite improved throughout the afternoon session.</p>
          <p>This story was originally featured on Fortune.com</p>
          <p><a href="/visit">Visit Website</a></p>
        </article>
      </body>
    </html>
  `;

  const { server, baseUrl } = await startTestServer(async () => ({
    ok: true,
    status: 200,
    text: async () => html,
  }));

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const response = await fetch(
    `${baseUrl}/api/article?url=${encodeURIComponent('https://example.com/market-update')}`,
    {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    },
  );

  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.doesNotMatch(payload.contentHtml, /This story was originally featured on Fortune\.com/i);
  assert.doesNotMatch(payload.contentHtml, /Visit Website/i);
  assert.doesNotMatch(payload.textContent, /This story was originally featured on Fortune\.com/i);
  assert.doesNotMatch(payload.textContent, /Visit Website/i);
});
