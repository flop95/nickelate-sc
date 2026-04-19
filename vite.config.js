import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dev serves at root so URLs like localhost:5173/demo/ work directly.
// Production deploys under GitHub Pages /nickelate-sc/app/ per Option B.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/nickelate-sc/app/' : '/',
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html', 'demo/index.html'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo/index.html'),
      },
    },
  },
}));
