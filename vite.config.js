import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const buildTimestamp = Date.now();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({
            buildTime: buildTimestamp,
            version: '2.8.0',
            builtAt: new Date(buildTimestamp).toISOString()
          }, null, 2)
        });
      }
    }
  ],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTimestamp),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        mobile: resolve(rootDir, 'mobile.html'),
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api-mitra': {
        target: 'https://api-mitra.starliteindonesia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mitra/, ''),
      },
      '/api-portal-vm': {
        target: 'https://script.google.com',
        changeOrigin: true,
        followRedirects: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-portal-vm/, ''),
      },
    },
  },
});
