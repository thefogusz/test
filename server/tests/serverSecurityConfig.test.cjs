const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { createServerApp } = require('../app.cjs');
const packageJson = require('../../package.json');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const createBaseConfig = (overrides = {}) => ({
  rootDir: ROOT_DIR,
  port: 0,
  upstreamTimeoutMs: 1000,
  apiLogThresholdMs: 60_000,
  twitterApiKey: '',
  xaiApiKey: '',
  tavilyApiKey: '',
  internalApiSecret: 'test-internal-token',
  stripeSecretKey: '',
  stripePlusPriceId: 'price_test',
  stripeCheckoutBaseUrl: '',
  stateStorageMode: 'memory',
  stateStorageFile: '',
  nodeEnv: 'test',
  ...overrides,
});

test('production refuses API-key-backed routes without an internal API secret', () => {
  assert.throws(
    () =>
      createServerApp({
        rootDir: ROOT_DIR,
        config: createBaseConfig({
          nodeEnv: 'production',
          internalApiSecret: '',
          xaiApiKey: 'xai_test_key',
        }),
      }),
    /INTERNAL_API_SECRET/,
  );
});

test('production refuses backend persistence without an internal API secret', () => {
  assert.throws(
    () =>
      createServerApp({
        rootDir: ROOT_DIR,
        config: createBaseConfig({
          nodeEnv: 'production',
          internalApiSecret: '',
          stateStorageMode: 'file',
        }),
      }),
    /INTERNAL_API_SECRET/,
  );
});

test('production Stripe checkout requires an explicit checkout base URL', () => {
  assert.throws(
    () =>
      createServerApp({
        rootDir: ROOT_DIR,
        config: createBaseConfig({
          nodeEnv: 'production',
          stripeSecretKey: 'sk_test_123',
          stripeCheckoutBaseUrl: '',
        }),
      }),
    /STRIPE_CHECKOUT_BASE_URL/,
  );
});

test('npm start forces production config validation on hosted deployments', () => {
  assert.match(packageJson.scripts.start, /NODE_ENV='production'/);
  assert.match(packageJson.scripts.start, /server\.cjs/);
});
