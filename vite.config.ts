import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // React rarely changes, so keeping it in its own file means returning
        // visitors only re-download the (much smaller) app code after a release.
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
  },
});
