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
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 120000);
const API_LOG_THRESHOLD_MS = Number(process.env.API_LOG_THRESHOLD_MS || 250);
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.json({ limit: '5mb' }));

// Internal auth guard — blocks unauthorized access to all /api/* routes
app.use('/api', (req, res, next) => {
  if (INTERNAL_API_SECRET && req.headers['x-internal-token'] !== INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.use('/api', (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    if (durationMs >= API_LOG_THRESHOLD_MS || res.statusCode >= 400) {
      console.log(`[server] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`);
    }
  });

  next();
});

app.use('/api/twitter', async (req, res) => {
  const upstreamUrl = `https://api.twitterapi.io/twitter${req.originalUrl.replace(/^\/api\/twitter/, '')}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        ...(TWITTER_API_KEY ? { 'X-API-Key': TWITTER_API_KEY } : {}),
        ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {}),
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      body: req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : JSON.stringify(req.body ?? {}),
    });

    const responseText = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    res.type(upstreamResponse.headers.get('content-type') || 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error('[server] Twitter proxy error:', error);
    res.status(502).json({ error: 'Twitter proxy timeout or connection lost' });
  }
});

app.use('/api/xai', createProxyMiddleware({
  target: 'https://api.x.ai',
  changeOrigin: true,
  proxyTimeout: UPSTREAM_TIMEOUT_MS,
  timeout: UPSTREAM_TIMEOUT_MS,
  pathRewrite: {
    '^/api/xai': '',
  },
  on: {
    proxyReq: (proxyReq, req) => {
      if (XAI_API_KEY) {
        proxyReq.setHeader('Authorization', `Bearer ${XAI_API_KEY}`);
      }
      if (req.body) {
        fixRequestBody(proxyReq, req);
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
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
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

// ── YouTube: Video details (stats + snippet) — 1 quota unit per call ──
app.get('/api/youtube/videos', async (req, res) => {
  if (!YOUTUBE_API_KEY) return res.status(501).json({ error: 'YouTube API not configured', items: [] });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id param', items: [] });
  try {
    const params = new URLSearchParams({ part: 'snippet,statistics,contentDetails', id, key: YOUTUBE_API_KEY });
    const upstream = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    console.error('[server] YouTube videos error:', err.message);
    res.status(502).json({ error: 'YouTube videos request failed', items: [] });
  }
});

// ── YouTube: Transcript via web scraping — zero API quota ──
app.get('/api/youtube/transcript/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!pageRes.ok) return res.json({ transcript: null, error: 'Could not fetch video page' });

    const html = await pageRes.text();

    // Extract video title
    const titleMatch = html.match(/<title>(.+?) - YouTube<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    // Locate captionTracks array inside embedded JSON
    const captionStart = html.indexOf('"captionTracks":');
    if (captionStart === -1) return res.json({ transcript: null, title, error: 'No captions available' });

    const arrStart = html.indexOf('[', captionStart);
    if (arrStart === -1) return res.json({ transcript: null, title, error: 'Invalid caption format' });

    let depth = 0, arrEnd = -1;
    for (let i = arrStart; i < Math.min(arrStart + 80000, html.length); i++) {
      if (html[i] === '[') depth++;
      else if (html[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
    }
    if (arrEnd === -1) return res.json({ transcript: null, title, error: 'Could not parse captions' });

    let captionTracks;
    try { captionTracks = JSON.parse(html.substring(arrStart, arrEnd + 1)); } catch {
      return res.json({ transcript: null, title, error: 'Failed to parse caption JSON' });
    }

    if (!Array.isArray(captionTracks) || !captionTracks.length) {
      return res.json({ transcript: null, title, error: 'No caption tracks found' });
    }

    // Prefer English auto-generated, then English manual, then first available
    const track = captionTracks.find(t => t.languageCode === 'en' && t.kind === 'asr')
      || captionTracks.find(t => t.languageCode === 'en')
      || captionTracks[0];

    if (!track?.baseUrl) return res.json({ transcript: null, title, error: 'No valid caption URL' });

    const transcriptRes = await fetch(`${track.baseUrl}&fmt=json3`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!transcriptRes.ok) return res.json({ transcript: null, title, error: 'Failed to fetch transcript content' });

    const data = await transcriptRes.json();
    const text = (data.events || [])
      .filter(e => e.segs)
      .map(e => e.segs.map(s => s.utf8 || '').join(''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    res.json({ transcript: text || null, title, lang: track.languageCode });
  } catch (err) {
    console.error('[server] YouTube transcript error:', err.message);
    res.status(502).json({ transcript: null, error: 'Failed to fetch transcript' });
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
