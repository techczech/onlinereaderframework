import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { demoEmbedAssets } from './scripts/demo-embed-assets';

export default defineConfig({
  plugins: [react(), demoEmbedAssets(__dirname)],
  resolve: {
    alias: {
      'reader-core': path.resolve(__dirname, '../../packages/reader-core/src/index.ts')
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
