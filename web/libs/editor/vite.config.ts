/// <reference types='vitest' />
import { mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import libConfig from '../../vite.lib.config';

const MODE = process.env.MODE ?? 'bluild';

export default mergeConfig(libConfig, {
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/editor',

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
    dts({
      entryRoot: 'src',
      tsConfigFilePath: path.join(__dirname, 'tsconfig.lib.json'),
      skipDiagnostics: true
    }),
  ],

  build: {
    outDir: path.join(__dirname, MODE === 'standalone' ? './editor/public' : '../../dist/libs/editor'),
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: path.resolve(__dirname, 'src/index.js'),
    },
  },
});

