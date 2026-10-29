import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({ base: './', server:{fs:{allow:[path.resolve(__dirname,'../..')]}}, plugins: [react()], resolve: {alias: {'reader-core':path.resolve(__dirname,'../../packages/reader-core/src/index.ts')},dedupe:['react','react-dom']} });
