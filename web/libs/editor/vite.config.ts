/// <reference types='vitest' />
import { mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import libConfig from '../../vite.lib.config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const MODE = process.env.MODE ?? 'bluild';

export default mergeConfig(libConfig, {
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/editor',

  optimizeDeps: {
    exclude: [
      "@martel/audio-file-decoder"
    ]
  },

  css: {
    preprocessorOptions: {
      styl: {
        additionalData: (function () {
          const colorsPath = path.join(__dirname, 'src/themes/default/colors.styl');
          const scrollbarPath = path.join(__dirname, 'src/themes/default/scrollbar.styl');

          return `
            @import "${colorsPath}";
            @import "${scrollbarPath}";
          `;
        })()
      }
    }
  },

  plugins: [
    wasm(),
    topLevelAwait(),
    dts({
      entryRoot: 'src',
      tsConfigFilePath: path.join(__dirname, 'tsconfig.lib.json'),
      skipDiagnostics: true
    }),
  ],

  build: {
    outDir: '../../dist/libs/editor',
    lib: {
      name: 'editor',
    },
  },
});

