/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  define: {
    "process.env": process.env,
  },

  assetsInclude: ['**/*.svg', '**/*.xml'],

  optimizeDeps: {
    exclude: [
      "@syntect/wasm"
    ]
  },

  build: {
    rollupOptions: {
      external: ["@martel/audio-file-decoder/decode-audio.wasm"],
    }
  },

  plugins: [
    wasm(),
    topLevelAwait(),
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
