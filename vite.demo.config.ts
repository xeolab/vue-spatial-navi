import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Demo app; imports the library straight from src so edits hot-reload.
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [vue()],
  resolve: {
    alias: { '@xeolab/vue-spatial-navi': fileURLToPath(new URL('src/index.ts', import.meta.url)) },
  },
  build: { outDir: '../demo-dist', emptyOutDir: true },
});
