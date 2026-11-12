import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: { __VERSAO__: JSON.stringify(process.env.npm_package_version ?? 'dev') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Finanças',
        short_name: 'Finanças',
        description: 'Gastos e investimentos da casa',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f2f5f3',
        theme_color: '#0e5c45',
        icons: [
          { src: 'icons/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icone-mascara-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
