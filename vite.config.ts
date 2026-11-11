import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://total-beauty-black.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          }
        },
      },
    },
  },
});
