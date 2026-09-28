// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://ndzekic.dev',
  output: 'static',
  integrations: [react(), mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React lives in its own chunk so the tour's lazy boundary works:
            // otherwise rollup hoists it into three-vendor and every page that
            // touches React drags 1.4 MB of three.js along with it.
            // Vite's dynamic-import preload helper must not live in
            // three-vendor either — importing it would pull the whole chunk.
            if (id.includes('vite/preload-helper')) {
              return 'react-vendor';
            }
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
              return 'react-vendor';
            }
            if (
              id.includes('node_modules/three') ||
              id.includes('node_modules/@react-three') ||
              id.includes('node_modules/postprocessing')
            ) {
              return 'three-vendor';
            }
          },
        },
      },
    },
  },
});
