import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Limitless Survivor',
        short_name: 'Limitless',
        description: 'Accessible Vampire-Survivors-like for web',
        theme_color: '#0f1220',
        background_color: '#0f1220',
        display: 'standalone',
        icons: [
          { src: 'vite.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Use relative fallback to work under GitHub Pages subpaths
        navigateFallback: 'index.html',
      },
    }),
  ],
})
