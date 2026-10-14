import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Relative assets work both at / and /<repository>/ on GitHub Pages.
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['mediabunny'],
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
      proxy: { '/api/url': {
        target: 'http://127.0.0.1:8787',
        configure(proxy) {
          proxy.on('proxyReq', (request, incoming) => {
            // Normalize only our own dev origin; keep rejecting foreign origins.
            if (incoming.headers.origin === 'http://127.0.0.1:3000') {
              request.setHeader('Origin', 'http://127.0.0.1:8787');
            }
          });
        },
      } },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
