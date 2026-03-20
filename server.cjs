const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8000;

// 1. Proxy Middleware for Twitter API
// This replicates the Vite dev proxy in production
app.use('/twitter-api', createProxyMiddleware({
  target: 'https://api.twitterapi.io',
  changeOrigin: true,
  pathRewrite: {
    '^/twitter-api': '', // remove /twitter-api from the request path
  },
  onProxyReq: (proxyReq, req, res) => {
    // Optional: Log proxy requests if needed for debugging
    // console.log('Proxying:', req.method, req.url);
  }
}));

// 2. Serve Static Files from /test
// We use '/test' as the mount point to match the user's requirement
app.use('/test', express.static(path.join(__dirname, 'dist')));

// 3. SPA Routing
// Redirect all requests under /test that don't match a file to index.html
app.get('/test/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 4. Redirect root to /test (Optional but helpful)
app.get('/', (req, res) => {
  res.redirect('/test');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving app at http://localhost:${PORT}/test`);
  console.log(`Proxying /twitter-api to https://api.twitterapi.io`);
});
