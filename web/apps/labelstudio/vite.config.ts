import path from 'path';
import { mergeConfig } from 'vite';
import baseConfig from '../../vite.lib.config';
import { prefixCSSClasses } from '../../tools/postcss-prefix';
import { importStyles } from '../../tools/styl-imports';

export default mergeConfig(baseConfig, {
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/labelstudio',

  css: {
    preprocessorOptions: {
      styl: {
        additionalData: importStyles([
          path.join(__dirname, 'src/themes/default/variables.styl'),
        ]),
      },
    },
    postcss: {
      plugins: [
        prefixCSSClasses({
          prefix: "ls-",
          ignore: [/^.antd?-/, /^.anticon/],
          ignorePaths: [/node_modules/, /.module/],
        }),
      ],
    },
  },
  build: {
    outDir: '../../dist/apps/labelstudio',
    lib: {
      entry: "src/main.ts",
    },
  },
});

