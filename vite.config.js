import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/test/',
  plugins: [react()],
  server: {
    proxy: {
      '/twitter-api': {
        target: 'https://api.twitterapi.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/twitter-api/, '')
      }
    }
  }
})
