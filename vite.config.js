import { createRequire } from 'module'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const _require = createRequire(import.meta.url)

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
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 FORO/1.0',
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

          // Article extractor — uses real Readability in dev so translation can be tested
          server.middlewares.use('/api/article', async (req, res, next) => {
            if (req.method !== 'GET') { next(); return }

            try {
              const { extractArticleFromHtml } = _require('./server/lib/articleExtractor.cjs')
              const urlObj = new URL(req.url, 'http://localhost')
              const articleUrl = urlObj.searchParams.get('url')

              if (!articleUrl) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing url parameter' }))
                return
              }

              let html
              try {
                const upstream = await fetch(articleUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 FORO/1.0',
                    Accept: 'text/html,*/*',
                  },
                  signal: AbortSignal.timeout(8000),
                })
                html = upstream.ok ? await upstream.text() : null
              } catch {
                html = null
              }

              // Fall back to a mock article so translation can be tested in dev
              if (!html) {
                html = `<!doctype html><html lang="en"><head>
                  <title>${articleUrl}</title>
                  <meta property="og:site_name" content="Dev Mock" />
                  <meta property="article:published_time" content="${new Date().toISOString()}" />
                </head><body><article>
                  <h1>Content not available</h1>
                  <p>ไม่สามารถดึงเนื้อหาบทความต้นฉบับได้ในขณะนี้ (อาจเป็นเพราะข้อจำกัดทางเทคนิคหรือการเชื่อมต่อ)</p>
                  <p>โปรดเปิดอ่านจาก "แหล่งที่มาต้นฉบับ" เพื่อดูเนื้อหาเต็มครับ</p>
                  <p>---</p>
                </article></body></html>`
              }

              const article = extractArticleFromHtml({ html, url: articleUrl })
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Cache-Control', 'no-store')
              res.end(JSON.stringify({ ok: true, url: articleUrl, ...article }))
            } catch {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Article extraction failed' }))
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
