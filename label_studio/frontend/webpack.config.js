require('dotenv').config();

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { EnvironmentPlugin } = require('webpack');
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const RELEASE = require('./release').getReleaseName();

const LOCAL_ENV = {
  NODE_ENV: "development",
  CSS_PREFIX: "ls-",
  RELEASE_NAME: RELEASE,
};

const SENTRY = {
  AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  ORG: process.env.SENTRY_ORG,
  PROJECT: process.env.SENTRY_PROJECT,
  RELEASE,
}

const devtool = process.env.NODE_ENV === 'production' ? "source-map" : "cheap-module-source-map";

const output = {
  path: path.resolve(__dirname, "dist", "react-app"),
  filename: 'index.js',
  hashFunction: "sha256"
};

const plugins = [
  new MiniCssExtractPlugin(),
  new EnvironmentPlugin(LOCAL_ENV),
];

const optimizer = {};

if (process.env.NODE_ENV === 'production') {
  optimizer.minimize = true;
  optimizer.minimizer = [new TerserPlugin(), new CssMinimizerPlugin()];
  optimizer.runtimeChunk = false,
  optimizer.splitChunks = {
    cacheGroups: {
      default: false,
    },
  };
}

if (process.env.BUILD_SENTRY && SENTRY.AUTH_TOKEN && SENTRY.RELEASE) {
  plugins.push(new SentryWebpackPlugin({
    authToken: SENTRY.AUTH_TOKEN,
    org: SENTRY.ORG,
    project: SENTRY.PROJECT,
    release: SENTRY.RELEASE,
    include: "./dist",
    ignore: ["node_modules", "webpack.config.js"],
    deploy: {
      env: process.env.NODE_ENV,
    }
  }))
}

module.exports = {
  devtool: devtool,
  mode: process.env.NODE_ENV || "development",
  entry: "./src/index.js",
  output: output,
  plugins: plugins,
  optimization: optimizer,
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/i,
        enforce: "pre",
        exclude: /node_modules/,
        use: [
          'babel-loader',
          'source-map-loader',
        ],
      },
      {
        test: /\.tsx?$/i,
        enforce: "pre",
        exclude: /node_modules/,
        use: [
          'babel-loader',
          'source-map-loader',
        ],
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.styl$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              modules: {
                localIdentName: "ls-[local]",
              },
            },
          },
          {
            loader: "stylus-loader",
            options: {
              sourceMap: true,
              stylusOptions: {
                import: [
                  path.resolve(__dirname, './src/themes/default/colors.styl'),
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [{
          loader: '@svgr/webpack',
          options: {
            ref: true,
            svgoConfig: {
              plugins: {
                removeViewBox: false,
              },
            },
          },
        }],
      },
    ],
  },
};
