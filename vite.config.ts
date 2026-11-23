import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dir = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        overlay: resolve(dir, 'src/overlay/overlay.html'),
        popup: resolve(dir, 'src/popup/popup.html'),
        studio: resolve(dir, 'src/studio/studio.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
