import path from 'path';
import { mergeConfig } from 'vite';
import libConfig from '../../vite.lib.config';
import { prefixCSSClasses } from '../../tools/postcss-prefix';
import { importStyles } from '../../tools/styl-imports';

export default mergeConfig(libConfig, {
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/datamanager',

  css: {
    preprocessorOptions: {
      styl: {
        additionalData: importStyles([
          path.join(__dirname, 'src/themes/default/colors.styl'),
        ]),
      },
    },
    postcss: {
      plugins: [
        prefixCSSClasses({
          prefix: "dm-",
          ignore: [/^.antd?-/, /^.anticon/],
          ignorePaths: [/node_modules/, /.module/],
        }),
      ],
    },
  },
  build: {
    outDir: '../../dist/libs/datamanager',
    lib: {
      name: 'datamanager',
    },
  },
});

