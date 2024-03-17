import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';
import topLevelAwait from 'vite-plugin-top-level-await';
import {jsxInJs} from './tools/jsx-in-js';

export default defineConfig({
  define: {
    "process.env": process.env,
  },

  assetsInclude: ['**/*.svg', '**/*.xml'],

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
    exclude: [
      "@syntect/wasm"
    ]
  },

  plugins: [
    wasm(),
    tsconfigPaths(),
    topLevelAwait(),
    jsxInJs(),
    react(),
    svgr({
      svgrOptions: {
        plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
      },
      include: "**/*.svg"
    }),
    nxViteTsPaths(),
  ],
});
