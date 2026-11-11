/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages では BASE_PATH=/リポジトリ名/ を指定してビルドする
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  // 5173 は別プロジェクト（Laravel）で使われていることがあるので固定で 5180 にする
  server: { port: 5180, strictPort: true, host: true },
  preview: { port: 4180, host: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'うごログ - 運動と股関節の痛み記録',
        short_name: 'うごログ',
        description: '運動と股関節の痛みを記録して、カレンダーとグラフで傾向を見るアプリ',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#eef1f4',
        theme_color: '#3448c5',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
