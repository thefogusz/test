import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const twitterApiKey = env.TWITTER_API_KEY
  const xaiApiKey = env.XAI_API_KEY
  const tavilyApiKey = env.TAVILY_API_KEY
  const internalApiSecret = env.INTERNAL_API_SECRET

  return {
    base: '/test/',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('@ai-sdk') || id.includes('/ai/')) return 'ai-vendor'
            if (id.includes('marked') || id.includes('dompurify')) return 'markdown-vendor'
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'local-secret-api-middleware',
        configureServer(server) {
          // Internal auth guard for all /api/* in dev
          server.middlewares.use('/api', (req, res, next) => {
            if (internalApiSecret && req.headers['x-internal-token'] !== internalApiSecret) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }
            next()
          })

          // RSS proxy — fetch RSS feeds server-side to avoid CORS
          server.middlewares.use('/api/rss', async (req, res, next) => {
            if (req.method !== 'GET') { next(); return }

            try {
              const urlObj = new URL(req.url, 'http://localhost')
              const feedUrl = urlObj.searchParams.get('url')

              if (!feedUrl) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing url parameter' }))
                return
              }

              const upstreamResponse = await fetch(feedUrl, {
                headers: {
                  'User-Agent': 'FORO-NewsReader/1.0',
                  'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                },
                signal: AbortSignal.timeout(15000),
              })

              const responseText = await upstreamResponse.text()
              res.statusCode = upstreamResponse.status
              res.setHeader('Content-Type', 'text/xml; charset=utf-8')
              res.setHeader('Cache-Control', 'public, max-age=300')
              res.end(responseText)
            } catch {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Failed to fetch RSS feed' }))
            }
          })

          server.middlewares.use('/api/tavily/search', async (req, res, next) => {
            if (req.method !== 'POST') {
              next()
              return
            }

            if (!tavilyApiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing Tavily API key' }))
              return
            }

            try {
              const body = await new Promise((resolve, reject) => {
                let raw = ''
                req.on('data', (chunk) => {
                  raw += chunk
                })
                req.on('end', () => resolve(raw))
                req.on('error', reject)
              })

              const parsedBody = body ? JSON.parse(body) : {}
              const upstreamResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(60000),
                body: JSON.stringify({
                  ...parsedBody,
                  api_key: tavilyApiKey,
                }),
              })

              const responseText = await upstreamResponse.text()
              res.statusCode = upstreamResponse.status
              res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json')
              res.end(responseText)
            } catch {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Failed to reach Tavily' }))
            }
          })
        },
      },
    ],
    server: {
      proxy: {
        '/api/twitter': {
          target: 'https://api.twitterapi.io',
          changeOrigin: true,
          timeout: 120000,
          proxyTimeout: 120000,
          rewrite: (path) => path.replace(/^\/api\/twitter/, '/twitter'),
          configure: (proxyServer) => {
            proxyServer.on('proxyReq', (proxyReq) => {
              if (twitterApiKey) {
                proxyReq.setHeader('X-API-Key', twitterApiKey)
              }
            })
          },
        },
        '/api/xai': {
          target: 'https://api.x.ai',
          changeOrigin: true,
          timeout: 120000,
          proxyTimeout: 120000,
          rewrite: (path) => path.replace(/^\/api\/xai/, ''),
          configure: (proxyServer) => {
            proxyServer.on('proxyReq', (proxyReq) => {
              if (xaiApiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${xaiApiKey}`)
              }
            })
          },
        },
      },
    },
  }
})
