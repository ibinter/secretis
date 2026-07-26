import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':           resolve(__dirname, 'resources/js'),
      '@components': resolve(__dirname, 'resources/js/Components'),
      '@pages':      resolve(__dirname, 'resources/js/Pages'),
      '@hooks':      resolve(__dirname, 'resources/js/hooks'),
      '@utils':      resolve(__dirname, 'resources/js/utils'),
    },
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
  },
  esbuild: {
    loader: 'jsx',
    include: /resources\/js\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  build: {
    outDir:    resolve(__dirname, '../backend/public/build'),
    emptyOutDir: true,
    manifest:  'manifest.json',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: resolve(__dirname, 'resources/js/app.jsx'),
      output: {
        // manualChunks retiré : provoquait un crash TDZ (dépendances circulaires entre chunks)

      },
    },
  },
});
