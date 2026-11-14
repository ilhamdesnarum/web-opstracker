import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mobile: resolve(__dirname, 'mobile.html'),
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

