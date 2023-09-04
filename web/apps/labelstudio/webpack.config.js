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
  CSS_PREFIX: 'ls-',
  RELEASE_NAME: RELEASE,
};

const devtool =
  process.env.NODE_ENV === 'production'
    ? 'source-map'
    : 'cheap-module-source-map';


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

  config.module.rules.forEach((rule) => {
    if (rule.test.toString().includes('css')) {
      rule.oneOf.forEach(loader => {
        if (loader.use) {
          const cssLoader = loader.use.find(use => use.loader && use.loader.includes('css-loader'));

          if (cssLoader && cssLoader.options) {
            cssLoader.options.modules = {
              localIdentName: 'ls-[local]', // Customize this format
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
    use: [{
      loader: '@svgr/webpack',
      options: {
        ref: true,
        // svgo: false,
        svgoConfig: {
          plugins: [
            {
              name: "preset-default",
              params: {
                overrides: {
                  removeViewBox: false,
                  removeUnknownsAndDefaults: false,
                },
              },
            },
          ],
        },
      },
    }],
  });

  // update the stylus loader to include an import of a global file
  return merge(config, {
    devtool,
    mode: process.env.NODE_ENV || 'development',
    plugins,
    optimization: optimizer,
  });
});
