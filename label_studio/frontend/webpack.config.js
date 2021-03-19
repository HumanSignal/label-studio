const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { EnvironmentPlugin } = require('webpack');

const LOCAL_ENV = {
  NODE_ENV: "development",
  CSS_PREFIX: "ls-",
};

module.exports = {
  mode: process.env.NODE_ENV || "development",
  devtool: "cheap-module-source-map",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist", "react-app"),
    filename: 'index.js',
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new EnvironmentPlugin(LOCAL_ENV),
  ],
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
          },
        }],
      },
    ],
  },
};
