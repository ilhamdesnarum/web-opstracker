import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      stream: resolve(__dirname, 'src/shims/stream.js'),
      fs: resolve(__dirname, 'src/shims/fs.js')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mobile: resolve(__dirname, 'mobile.html')
      }
    }
  },
  server: {
    port: 5175,
    host: true,
    proxy: {
      '/api-mitra': {
        target: 'https://api-mitra.starliteindonesia.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-mitra/, '')
      }
    }
  },
  preview: {
    port: 5175,
    host: true,
    proxy: {
      '/api-mitra': {
        target: 'https://api-mitra.starliteindonesia.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-mitra/, '')
      }
    }
  }
})
