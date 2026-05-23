import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // ── Proxy: any /api/* call from the browser goes to the API server ──
    // This means Onboarding can call /api/verify/... and it lands on port 3001
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
        // Log proxy hits in terminal so you can see requests flowing
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Vite proxy error]', err.message,
              '— is the API server running? npm run server')
          })
          proxy.on('proxyReq', (_, req) => {
            console.log('[Vite proxy →]', req.method, req.url)
          })
        }
      }
    }
  }
})
