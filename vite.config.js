import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-vendor';
          }

          if (id.includes('react-router-dom')) {
            return 'router';
          }

          if (id.includes('recharts')) {
            return 'charts';
          }

          if (id.includes('@react-pdf') || id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
            return 'pdf';
          }

          if (id.includes('socket.io-client') || id.includes('socket.io-parser')) {
            return 'socket';
          }

          return 'vendor';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // hmr: { clientPort: 443 } is often needed for ngrok so Vite knows to use 443 for HMR
    allowedHosts: true,
    // Disabling local HTTPS for now to make ngrok testing much easier.
    // ngrok provides its own HTTPS tunnel for the public link.
    https: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
})
