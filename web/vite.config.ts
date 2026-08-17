import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind 0.0.0.0, not just localhost — Codespaces forwards over IPv4 and
    // cannot reach a server listening only on ::1.
    host: true,
    // Vite rejects requests whose Host header it does not recognise. The
    // forwarded port arrives as <codespace>-5173.app.github.dev, which it
    // would otherwise answer with 403 Blocked request.
    allowedHosts: ['.app.github.dev'],
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
