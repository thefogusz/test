import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const twitterApiKey = env.TWITTER_API_KEY || env.VITE_TWITTER_API_KEY
  const xaiApiKey = env.XAI_API_KEY || env.VITE_XAI_API_KEY
  const tavilyApiKey = env.TAVILY_API_KEY || env.VITE_TAVILY_API_KEY

  return {
    base: '/test/',
    plugins: [
      react(),
      {
        name: 'local-secret-api-middleware',
        configureServer(server) {
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
          rewrite: (path) => path.replace(/^\/api\/twitter/, ''),
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
