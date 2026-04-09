const express = require('express');
const path = require('path');
const Stripe = require('stripe');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { loadServerConfig } = require('./lib/config.cjs');
const { createAppStateStore } = require('./lib/appStateStore.cjs');
const { extractArticleFromHtml } = require('./lib/articleExtractor.cjs');

const createServerApp = ({
  rootDir = path.resolve(__dirname, '..'),
  config: configOverride,
  stateStore: stateStoreOverride,
  fetchImpl,
} = {}) => {
  const config = configOverride || loadServerConfig(rootDir);
  const app = express();
  const fetcher = fetchImpl || fetch;
  const stateStore =
    stateStoreOverride ||
    createAppStateStore({
      mode: config.stateStorageMode,
      filePath: config.stateStorageFile,
    });
  let stripeClient = null;

  const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

  const normalizeStateIdentifier = (value, label) => {
    const normalized = String(value || '').trim();
    if (!/^[a-zA-Z0-9:_-]{1,120}$/.test(normalized)) {
      const error = new Error(`Invalid ${label}`);
      error.statusCode = 400;
      throw error;
    }

    return normalized;
  };

  const sendUpstreamTextResponse = async (upstreamResponse, res) => {
    const responseText = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    res.type(upstreamResponse.headers.get('content-type') || 'application/json');
    res.send(responseText);
  };

  const getStripeClient = () => {
    if (!config.stripeSecretKey) {
      const error = new Error('Missing STRIPE_SECRET_KEY');
      error.statusCode = 500;
      throw error;
    }

    if (!stripeClient) {
      stripeClient = new Stripe(config.stripeSecretKey);
    }

    return stripeClient;
  };

  const normalizeStripeIdentifier = (value, label) => {
    const normalized = String(value || '').trim();
    if (!/^[a-zA-Z0-9_]{1,255}$/.test(normalized)) {
      const error = new Error(`Invalid ${label}`);
      error.statusCode = 400;
      throw error;
    }

    return normalized;
  };

  const normalizeExternalUrl = (value, label = 'url') => {
    const normalized = String(value || '').trim();

    try {
      const parsed = new URL(normalized);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported protocol');
      }

      return parsed.toString();
    } catch {
      const error = new Error(`Invalid ${label}`);
      error.statusCode = 400;
      throw error;
    }
  };

  const resolveAppBaseUrl = (req) => {
    if (config.stripeCheckoutBaseUrl) {
      return config.stripeCheckoutBaseUrl.replace(/\/+$/, '');
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol;
    const host = forwardedHost || req.get('host');

    return `${protocol}://${host}`;
  };

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));

  app.use('/api', (req, res, next) => {
    if (
      config.internalApiSecret &&
      req.headers['x-internal-token'] !== config.internalApiSecret
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  });

  app.use('/api', (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      if (durationMs >= config.apiLogThresholdMs || res.statusCode >= 400) {
        console.log(
          `[server] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`,
        );
      }
    });

    next();
  });

  app.get(
    '/api/state/:namespace/:key',
    asyncRoute(async (req, res) => {
      const namespace = normalizeStateIdentifier(req.params.namespace, 'state namespace');
      const key = normalizeStateIdentifier(req.params.key, 'state key');
      const value = await stateStore.get(namespace, key);

      if (value === undefined) {
        return res.json({
          namespace,
          key,
          exists: false,
          value: null,
        });
      }

      return res.json({
        namespace,
        key,
        exists: true,
        value,
      });
    }),
  );

  app.put(
    '/api/state/:namespace/:key',
    asyncRoute(async (req, res) => {
      const namespace = normalizeStateIdentifier(req.params.namespace, 'state namespace');
      const key = normalizeStateIdentifier(req.params.key, 'state key');

      if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, 'value')) {
        return res.status(400).json({ error: 'Missing "value" in request body' });
      }

      await stateStore.set(namespace, key, req.body.value);
      return res.status(204).end();
    }),
  );

  app.delete(
    '/api/state/:namespace/:key',
    asyncRoute(async (req, res) => {
      const namespace = normalizeStateIdentifier(req.params.namespace, 'state namespace');
      const key = normalizeStateIdentifier(req.params.key, 'state key');

      await stateStore.delete(namespace, key);
      return res.status(204).end();
    }),
  );

  app.get(
    '/api/rss',
    asyncRoute(async (req, res) => {
      const feedUrl = req.query.url;

      if (!feedUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      try {
        const upstreamResponse = await fetcher(feedUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: AbortSignal.timeout(15000),
        });

        const responseText = await upstreamResponse.text();
        res.status(upstreamResponse.status);
        res.type('text/xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300');
        res.send(responseText);
      } catch (error) {
        console.error('[server] RSS proxy error:', error);
        res.status(502).json({ error: 'Failed to fetch RSS feed' });
      }
    }),
  );

  app.use(
    '/api/twitter',
    asyncRoute(async (req, res) => {
      const upstreamUrl = `https://api.twitterapi.io/twitter${req.originalUrl.replace(
        /^\/api\/twitter/,
        '',
      )}`;

      try {
        const upstreamResponse = await fetcher(upstreamUrl, {
          method: req.method,
          headers: {
            ...(config.twitterApiKey ? { 'X-API-Key': config.twitterApiKey } : {}),
            ...(req.headers['content-type']
              ? { 'Content-Type': req.headers['content-type'] }
              : {}),
          },
          signal: AbortSignal.timeout(config.upstreamTimeoutMs),
          body:
            req.method === 'GET' || req.method === 'HEAD'
              ? undefined
              : JSON.stringify(req.body ?? {}),
        });

        await sendUpstreamTextResponse(upstreamResponse, res);
      } catch (error) {
        console.error('[server] Twitter proxy error:', error);
        res.status(502).json({ error: 'Twitter proxy timeout or connection lost' });
      }
    }),
  );

  app.use(
    '/api/xai',
    createProxyMiddleware({
      target: 'https://api.x.ai',
      changeOrigin: true,
      proxyTimeout: config.upstreamTimeoutMs,
      timeout: config.upstreamTimeoutMs,
      pathRewrite: {
        '^/api/xai': '',
      },
      on: {
        proxyReq: (proxyReq, req) => {
          if (config.xaiApiKey) {
            proxyReq.setHeader('Authorization', `Bearer ${config.xaiApiKey}`);
          }
          if (req.body) {
            fixRequestBody(proxyReq, req);
          }
        },
        error: (error, req, res) => {
          console.error('[server] xAI proxy error:', error);
          if (!res.headersSent) {
            res.status(502).json({ error: 'Proxy timeout or connection lost' });
          }
        },
      },
    }),
  );

  app.post(
    '/api/tavily/search',
    asyncRoute(async (req, res) => {
      if (!config.tavilyApiKey) {
        return res.status(500).json({ error: 'Missing Tavily API key' });
      }

      try {
        const upstreamResponse = await fetcher('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(config.upstreamTimeoutMs),
          body: JSON.stringify({
            ...req.body,
            api_key: config.tavilyApiKey,
          }),
        });

        await sendUpstreamTextResponse(upstreamResponse, res);
      } catch (error) {
        console.error('[server] Tavily proxy error:', error);
        res.status(502).json({ error: 'Failed to reach Tavily' });
      }
    }),
  );

  app.get(
    '/api/article',
    asyncRoute(async (req, res) => {
      const articleUrl = normalizeExternalUrl(req.query.url, 'article url');

      try {
        const upstreamResponse = await fetcher(articleUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 FORO/1.0',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(config.upstreamTimeoutMs),
        });

        if (!upstreamResponse.ok) {
          return res.status(upstreamResponse.status).json({
            error: `Failed to fetch article (${upstreamResponse.status})`,
          });
        }

        const html = await upstreamResponse.text();
        const article = extractArticleFromHtml({
          html,
          url: articleUrl,
        });

        res.set('Cache-Control', 'public, max-age=900');
        return res.json({
          ok: true,
          url: articleUrl,
          ...article,
        });
      } catch (error) {
        console.error('[server] Article extraction error:', error);
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 502;
        return res.status(statusCode).json({
          error:
            statusCode === 422
              ? 'Could not extract readable article content'
              : 'Failed to fetch article',
        });
      }
    }),
  );

  app.post(
    '/api/billing/checkout-session',
    asyncRoute(async (req, res) => {
      if (!config.stripePlusPriceId) {
        return res.status(500).json({ error: 'Missing STRIPE_PLUS_PRICE_ID' });
      }

      const stripe = getStripeClient();
      const baseUrl = resolveAppBaseUrl(req);
      const price = await stripe.prices.retrieve(config.stripePlusPriceId);
      const isRecurringPrice = Boolean(price.recurring);
      const paymentMethodTypes = isRecurringPrice
        ? undefined
        : ['card', 'promptpay'];
      const customerEmail =
        typeof req.body?.customerEmail === 'string' && req.body.customerEmail.trim()
          ? req.body.customerEmail.trim()
          : undefined;

      const session = await stripe.checkout.sessions.create({
        mode: isRecurringPrice ? 'subscription' : 'payment',
        ...(paymentMethodTypes ? { payment_method_types: paymentMethodTypes } : {}),
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        line_items: [
          {
            price: config.stripePlusPriceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/test?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/test?checkout=cancelled`,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
      });

      return res.json({
        sessionId: session.id,
        url: session.url || null,
        mode: session.mode,
      });
    }),
  );

  app.get(
    '/api/debug/env-check',
    asyncRoute(async (req, res) => {
      const maskValue = (value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return null;
        if (normalized.length <= 8) return `${normalized.slice(0, 2)}***`;
        return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
      };

      return res.json({
        ok: true,
        env: {
          hasInternalApiSecret: Boolean(config.internalApiSecret),
          hasStripeSecretKey: Boolean(config.stripeSecretKey),
          hasStripePlusPriceId: Boolean(config.stripePlusPriceId),
          hasStripeCheckoutBaseUrl: Boolean(config.stripeCheckoutBaseUrl),
          hasViteStripePublishableKey: Boolean(process.env.VITE_STRIPE_PUBLISHABLE_KEY),
        },
        redacted: {
          stripeSecretKey: maskValue(config.stripeSecretKey),
          stripePlusPriceId: maskValue(config.stripePlusPriceId),
          viteStripePublishableKey: maskValue(process.env.VITE_STRIPE_PUBLISHABLE_KEY),
        },
      });
    }),
  );

  app.get(
    '/api/billing/checkout-session-status',
    asyncRoute(async (req, res) => {
      const sessionId = normalizeStripeIdentifier(req.query.session_id, 'checkout session id');
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });

      const paymentStatus = session.payment_status || 'unpaid';
      const subscriptionStatus =
        session.subscription && typeof session.subscription === 'object'
          ? session.subscription.status
          : null;
      const isPlusActive =
        session.status === 'complete' &&
        (paymentStatus === 'paid' ||
          paymentStatus === 'no_payment_required' ||
          subscriptionStatus === 'active' ||
          subscriptionStatus === 'trialing');

      return res.json({
        sessionId: session.id,
        status: session.status,
        paymentStatus,
        subscriptionStatus,
        planId: isPlusActive ? 'plus' : 'free',
        customerEmail: session.customer_details?.email || session.customer_email || null,
      });
    }),
  );

  app.use(
    '/test/docs/__data',
    express.static(path.join(rootDir, 'docs', '.vitepress', 'data'), {
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
      },
    }),
  );

  app.use('/test/docs', express.static(path.join(rootDir, 'docs', '.vitepress', 'dist')));

  app.get('/test/docs/*', (req, res) => {
    res.sendFile(path.join(rootDir, 'docs', '.vitepress', 'dist', 'index.html'));
  });

  app.use('/test', express.static(path.join(rootDir, 'dist')));

  app.get('/test/*', (req, res) => {
    res.sendFile(path.join(rootDir, 'dist', 'index.html'));
  });

  app.get('/', (req, res) => {
    res.redirect('/test');
  });

  app.use((error, req, res, next) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('[server] Unhandled error:', error);

    if (res.headersSent) {
      return next(error);
    }

    const isBillingRoute = String(req?.originalUrl || '').startsWith('/api/billing');
    const billingMessage =
      error?.raw?.message ||
      error?.message ||
      error?.type ||
      'Billing request failed';

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? isBillingRoute
            ? billingMessage
            : 'Internal server error'
          : error.message,
    });
  });

  return {
    app,
    config,
    stateStore,
  };
};

const logServerStartup = (config) => {
  console.log(`Server is running on port ${config.port}`);
  console.log(`Serving app at http://localhost:${config.port}/test`);
  console.log('Proxying /api/twitter to https://api.twitterapi.io');
  console.log('Proxying /api/xai to https://api.x.ai');
  console.log(
    `App state storage: ${config.stateStorageMode}${config.stateStorageMode === 'file' ? ` (${config.stateStorageFile})` : ''
    }`,
  );
};

const startServer = (options = {}) => {
  const instance = createServerApp(options);
  const server = instance.app.listen(instance.config.port, () => {
    logServerStartup(instance.config);
  });

  return {
    ...instance,
    server,
  };
};

module.exports = {
  createServerApp,
  startServer,
};
