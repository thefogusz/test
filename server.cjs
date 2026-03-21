const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const loadEnvFile = () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 8000;
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.VITE_TWITTER_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY;

app.use(express.json({ limit: '1mb' }));

app.use('/api/twitter', createProxyMiddleware({
  target: 'https://api.twitterapi.io',
  changeOrigin: true,
  pathRewrite: {
    '^/api/twitter': '',
  },
  on: {
    proxyReq: (proxyReq) => {
      if (TWITTER_API_KEY) {
        proxyReq.setHeader('X-API-Key', TWITTER_API_KEY);
      }
    },
  },
}));

app.use('/api/xai', createProxyMiddleware({
  target: 'https://api.x.ai',
  changeOrigin: true,
  pathRewrite: {
    '^/api/xai': '',
  },
  on: {
    proxyReq: (proxyReq, req) => {
      // Set headers first!
      if (XAI_API_KEY) {
        proxyReq.setHeader('Authorization', `Bearer ${XAI_API_KEY}`);
      }

      // Re-stream the body if it was parsed by express.json()
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, req, res) => {
      console.error('[server] xAI proxy error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy timeout or connection lost' });
      }
    }
  },
}));

app.post('/api/tavily/search', async (req, res) => {
  if (!TAVILY_API_KEY) {
    res.status(500).json({ error: 'Missing Tavily API key' });
    return;
  }

  try {
    const upstreamResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...req.body,
        api_key: TAVILY_API_KEY,
      }),
    });

    const responseText = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    res.type(upstreamResponse.headers.get('content-type') || 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error('[server] Tavily proxy error:', error);
    res.status(502).json({ error: 'Failed to reach Tavily' });
  }
});

app.use('/test', express.static(path.join(__dirname, 'dist')));

app.get('/test/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/test');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving app at http://localhost:${PORT}/test`);
  console.log(`Proxying /api/twitter to https://api.twitterapi.io`);
  console.log(`Proxying /api/xai to https://api.x.ai`);
});
