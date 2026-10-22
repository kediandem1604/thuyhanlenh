import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const API = process.env.API_URL ?? 'http://localhost:8787'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true,
    // dev: web và API chung một origin → cookie phiên hoạt động như production
    proxy: {
      '/api': { target: API, ws: true },
      '/auth': { target: API },
    },
    // không theo dõi code server / dữ liệu PGlite (tránh reload thừa)
    watch: { ignored: ['**/server/**'] },
  },
  // tải đầu ~200 KB gzip (React, router, motion). Biểu đồ recharts (~100 KB gzip) và mọi trang con tách lazy;
  // bản build được nén sẵn brotli/gzip (scripts/precompress.mjs). Cảnh báo nếu gói nào vượt 550 KB chưa nén.
  build: { chunkSizeWarningLimit: 550 },
})
