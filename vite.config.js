import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'Marginloom', short_name: 'Marginloom',
      description: 'An offline notebook for questions, practice, and source material.',
      theme_color: '#194d3d', background_color: '#f7f8f3', display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm,mjs,bin}'],
      maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
      navigateFallback: 'index.html',
    },
  })],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
});
