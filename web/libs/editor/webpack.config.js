// const path = require('path');
const path = require('path');
const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { merge } = require('webpack-merge');

require('dotenv').config();

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { EnvironmentPlugin } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const RELEASE = require('../../release').getReleaseName();

const LOCAL_ENV = {
  NODE_ENV: 'development',
  CSS_PREFIX: 'lsf-',
  RELEASE_NAME: RELEASE,
};

const devtool =
  process.env.NODE_ENV === 'production'
    ? 'source-map'
    : 'cheap-module-source-map';

const DEFAULT_NODE_ENV = process.env.BUILD_MODULE ? "production" : process.env.NODE_ENV || "development";
const isDevelopment = DEFAULT_NODE_ENV !== "production";
const customDistDir = !!process.env.WORK_DIR;

const dirPrefix = {
  js: customDistDir ? "js/" : isDevelopment ? "" : "static/js/",
  css: customDistDir ? "css/" : isDevelopment ? "" : "static/css/",
};


const plugins = [new MiniCssExtractPlugin(), new EnvironmentPlugin(LOCAL_ENV)];

const optimizer = {};

if (process.env.NODE_ENV === 'production') {
  optimizer.minimize = true;
  optimizer.minimizer = [new TerserPlugin(), new CssMinimizerPlugin()];
  optimizer.runtimeChunk = false;
  optimizer.splitChunks = {
    cacheGroups: {
      default: false,
    },
  };
}

// Nx plugins for webpack.
module.exports = composePlugins(withNx({
  nx: {
    svgr: true,
  },
  skipTypeChecking: true,
}), withReact({ svgr: true }), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`

  config.output = {
    ...config.output,
    uniqueName: "labelstudio",
    publicPath: "auto",
    scriptType: 'text/javascript',
  };

  config.optimization = {
    splitChunks: false,
  };

  config.resolve.fallback = {
    fs: false,
    path: false,
    crypto: false,
    worker_threads: false,
  }

  config.experiments = {
    cacheUnaffected: true,
    syncWebAssembly: true,
    asyncWebAssembly: true,
  }

  config.module.rules.forEach((rule) => {
    if (rule.test.toString().includes('css')) {
      rule.oneOf.forEach(loader => {
        if (loader.use) {
          const cssLoader = loader.use.find(use => use.loader && use.loader.includes('css-loader'));

          if (cssLoader && cssLoader.options) {
            cssLoader.options.modules = {
              localIdentName: 'lsf-[local]', // Customize this format
            };
          }
        }
      });
    }

    if (rule.test.toString().includes('styl')) {
      const r = rule.oneOf.filter((r) => r.use && r.use.find((u) => u.loader && u.loader.includes('stylus-loader')));

      r.forEach(_r => {
        const l = _r.use.filter((u) => u.loader && u.loader.includes('stylus-loader'));

        l.forEach(_l => {
          _l.options = {
            ..._l.options,
            stylusOptions: {
              ..._l.options.stylusOptions,
              import: [path.resolve(__dirname, './src/themes/default/variables.styl')],
            },
          };
        });
      });
    }
  });

  config.module.rules.push({
      test: /\.svg$/,
      exclude: /node_modules/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            ref: true,
          },
        },
        "url-loader"
      ],
    },
    {
      test: /\.xml$/,
      exclude: /node_modules/,
      loader: "url-loader",
    },
    {
      test: /\.wasm$/,
      type: "javascript/auto",
      loader: "file-loader",
      options: {
        name: "[name].[ext]",
        outputPath: dirPrefix.js, // colocate wasm with js
      }
    });

  // update the stylus loader to include an import of a global file
  return merge(config, {
    devtool,
    mode: process.env.NODE_ENV || 'development',
    plugins,
    optimization: optimizer,
  });
});
