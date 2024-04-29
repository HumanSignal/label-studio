// const path = require('path');
const path = require("path");
const { composePlugins, withNx } = require("@nx/webpack");
const { withReact } = require("@nx/react");
const { merge } = require("webpack-merge");

require("dotenv").config();

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { EnvironmentPlugin, DefinePlugin, ProgressPlugin, optimize } = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const RELEASE = require("./release").getReleaseName();

let css_prefix;

switch (process.env.LERNA_PACKAGE_NAME) {
  case "labelstudio":
    css_prefix = "ls-";
    break;
  case "datamanager":
    css_prefix = "dm-";
    break;
  case "editor":
    css_prefix = "lsf-";
}

const LOCAL_ENV = {
  NODE_ENV: "development",
  CSS_PREFIX: css_prefix,
  RELEASE_NAME: RELEASE,
};

const devtool = process.env.NODE_ENV === "production" ? "source-map" : "cheap-module-source-map";

const DEFAULT_NODE_ENV = process.env.BUILD_MODULE ? "production" : process.env.NODE_ENV || "development";
const isDevelopment = DEFAULT_NODE_ENV !== "production";
const customDistDir = !!process.env.WORK_DIR;

const BUILD = {
  NO_MINIMIZE: isDevelopment || !!process.env.BUILD_NO_MINIMIZATION,
};

const dirPrefix = {
  js: customDistDir ? "js/" : isDevelopment ? "" : "static/js/",
  css: customDistDir ? "css/" : isDevelopment ? "" : "static/css/",
};

const plugins = [
  new MiniCssExtractPlugin(),
  new DefinePlugin({
    "process.env.CSS_PREFIX": JSON.stringify(css_prefix),
  }),
  new EnvironmentPlugin(LOCAL_ENV),
];

if (process.env.MODE !== "standalone") {
  plugins.push(
    new optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  );
}

const optimizer = () => {
  const result = {
    minimize: true,
    minimizer: [],
    runtimeChunk: true,
  };

  if (DEFAULT_NODE_ENV === "production") {
    result.minimizer.push(
      new TerserPlugin({
        parallel: true,
      }),
      new CssMinimizerPlugin({
        parallel: true,
      }),
    );
  }

  if (BUILD.NO_MINIMIZE) {
    result.minimize = false;
    result.minimizer = undefined;
  }

  result.runtimeChunk = false;
  result.splitChunks = { cacheGroups: { default: false } };

  return result;
};

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx({
    nx: {
      svgr: true,
    },
    skipTypeChecking: true,
  }),
  withReact({ svgr: true }),
  (config) => {
    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`

    config.output = {
      ...config.output,
      uniqueName: "labelstudio",
      publicPath: "auto",
      scriptType: "text/javascript",
    };

    config.optimization = {
      splitChunks: false,
    };

    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
      worker_threads: false,
    };

    config.experiments = {
      cacheUnaffected: true,
      syncWebAssembly: true,
      asyncWebAssembly: true,
    };

    config.module.rules.forEach((rule) => {
      const testString = rule.test.toString();
      const isScss = testString.includes("scss");
      const isCssModule = testString.includes(".module");

      if (isScss) {
        rule.oneOf.forEach((loader) => {
          if (loader.use) {
            const cssLoader = loader.use.find((use) => use.loader && use.loader.includes("css-loader"));

            if (cssLoader && cssLoader.options) {
              cssLoader.options.modules = {
                mode: "local",
                auto: true,
                namedExport: false,
                localIdentName: "[local]--[hash:base64:5]",
              };
            }
          }
        });
      }

      if (rule.test.toString().match(/scss|sass|styl/) && !isCssModule) {
        const r = rule.oneOf.filter((r) => {
          // we don't need rules that don't have loaders
          if (!r.use) return false;

          const testString = r.test.toString();

          // we also don't need css modules as these are used directly
          // in the code and don't need prefixing
          if (testString.match(/module/)) return false;

          // we only target pre-processors that has 'css-loader included'
          return testString.match(/scss|sass|styl/) && r.use.some((u) => u.loader && u.loader.includes("css-loader"));
        });

        r.forEach((_r) => {
          const cssLoader = _r.use.find((use) => use.loader && use.loader.includes("css-loader"));

          if (!cssLoader) return;

          const isSASS = _r.use.some((use) => use.loader && use.loader.match(/sass|scss/));

          if (isSASS) _r.exclude = /node_modules/;

          if (cssLoader.options) {
            cssLoader.options.modules = {
              localIdentName: `${css_prefix}[local]`, // Customize this format
              getLocalIdent(_ctx, _ident, className) {
                if (className.includes("ant")) return className;
              },
            };
          }
        });
      }

      if (rule.test.toString().includes("styl")) {
        const r = rule.oneOf.filter((r) => r.use && r.use.find((u) => u.loader && u.loader.includes("stylus-loader")));

        r.forEach((_r) => {
          const l = _r.use.filter((u) => u.loader && u.loader.includes("stylus-loader"));

          l.forEach((_l) => {
            _l.options = {
              ..._l.options,
              stylusOptions: {
                ..._l.options.stylusOptions,
                import: [path.resolve(__dirname, "apps/labelstudio/src/themes/default/variables.styl")],
              },
            };
          });
        });
      }
    });

    config.module.rules.push(
      {
        test: /\.svg$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              ref: true,
            },
          },
          "url-loader",
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
        },
      },
    );

    // update the stylus loader to include an import of a global file
    return merge(config, {
      devtool,
      mode: process.env.NODE_ENV || "development",
      plugins,
      optimization: optimizer(),
    });
  },
);
