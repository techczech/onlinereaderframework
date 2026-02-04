import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'reader-core': path.resolve(__dirname, '../../packages/reader-core/src/index.ts')
    }
  }
});
