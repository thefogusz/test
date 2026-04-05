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
  stateStorageFile: path.join(os.tmpdir(), 'foro-article-api-test.json'),
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
