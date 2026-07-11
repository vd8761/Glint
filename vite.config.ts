import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const buildEnv = loadEnv(mode, process.cwd(), '');
  const appUrl = /^https?:\/\//i.test(buildEnv.APP_URL ?? '')
    ? buildEnv.APP_URL.replace(/\/+$/, '')
    : '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'glint-absolute-social-image',
        transformIndexHtml(html: string) {
          return appUrl ? html.replaceAll('content="/og.png"', `content="${appUrl}/og.png"`) : html;
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.ts']
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
