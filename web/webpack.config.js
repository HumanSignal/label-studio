// const path = require('path');
const path = require("path");
const { composePlugins, withNx } = require("@nx/webpack");
const { withReact } = require("@nx/react");
const { merge } = require("webpack-merge");

require("dotenv").config({
  // resolve the .env file in the root of the project ../
  path: path.resolve(__dirname, "../.env"),
});

// Use the project's webpack so resolution works (e.g. when @nx/webpack does not bundle webpack under node_modules).
const webpack = require("webpack");
const { EnvironmentPlugin, DefinePlugin } = webpack;
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const RELEASE = require("./release").getReleaseName();

const css_prefix = "lsf-";
const mode = process.env.BUILD_MODULE ? "production" : process.env.NODE_ENV || "development";
const isDevelopment = mode !== "production";
const devtool = process.env.NODE_ENV === "production" ? "source-map" : "cheap-module-source-map";
const FRONTEND_HMR = process.env.FRONTEND_HMR === "true";
const FRONTEND_HOSTNAME = FRONTEND_HMR ? process.env.FRONTEND_HOSTNAME || "http://localhost:8010" : "";
const DJANGO_HOSTNAME = process.env.DJANGO_HOSTNAME || "http://localhost:8080";
const HMR_PORT = FRONTEND_HMR ? +new URL(FRONTEND_HOSTNAME).port : 8010;

const LOCAL_ENV = {
  NODE_ENV: mode,
  CSS_PREFIX: css_prefix,
  RELEASE_NAME: RELEASE,
};

const BUILD = {
  NO_MINIMIZE: isDevelopment || !!process.env.BUILD_NO_MINIMIZATION,
};

const plugins = [
  new DefinePlugin({
    "process.env.CSS_PREFIX": JSON.stringify(css_prefix),
  }),
  new EnvironmentPlugin(LOCAL_ENV),
];

const optimizer = () => {
  const result = {
    minimize: true,
    minimizer: [],
  };

  if (mode === "production") {
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

  if (process.env.MODE?.startsWith("standalone")) {
    result.runtimeChunk = false;
    result.splitChunks = { cacheGroups: { default: false } };
  }

  return result;
};

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx({
    nx: {
      svgr: false,
    },
    skipTypeChecking: true,
  }),
  withReact({ svgr: false }),
  (config) => {
    // Remove the extension alias as this conflicts with the nx/webpack v21 changes
    delete config.resolve.extensionAlias;

    // LS entrypoint
    if (!process.env.MODE?.startsWith("standalone")) {
      config.entry = {
        main: {
          import: path.resolve(__dirname, "apps/labelstudio/src/main.tsx"),
        },
      };

      config.output = {
        ...config.output,
        uniqueName: "labelstudio",
        publicPath:
          isDevelopment && FRONTEND_HOSTNAME
            ? `${FRONTEND_HOSTNAME}/react-app/`
            : process.env.MODE === "standalone-playground"
              ? "/playground-assets/"
              : "auto",
        scriptType: "text/javascript",
      };

      config.optimization = {
        runtimeChunk: "single",
        sideEffects: true,
        splitChunks: {
          cacheGroups: {
            commonVendor: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|mobx|mobx-react|mobx-react-lite|mobx-state-tree)[\\/]/,
              name: "vendor",
              chunks: "all",
            },
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              chunks: "async",
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
              chunks: "async",
            },
          },
        },
      };
    }

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
      if (!rule.oneOf || !rule.test?.toString().includes("css")) return;

      rule.oneOf.forEach((oneOfRule) => {
        if (!oneOfRule.use) return;

        oneOfRule.use = oneOfRule.use.filter(
          (use) => !(use.loader && /sass-loader|stylus-loader|less-loader/.test(use.loader)),
        );

        const innerTest = oneOfRule.test?.toString() ?? "";
        const cssLoader = oneOfRule.use.find((use) => use.loader?.includes("/css-loader/"));

        if (innerTest.includes("module") && cssLoader?.options) {
          cssLoader.options.modules = {
            mode: "local",
            auto: true,
            namedExport: false,
            localIdentName: "[local]--[hash:base64:5]",
          };
        }
      });

      const insertions = [];
      rule.oneOf.forEach((oneOfRule, idx) => {
        if (!oneOfRule.test || !oneOfRule.use) return;
        const t = oneOfRule.test.toString();
        if (/^\/\\\.css\$\/$/.test(t) && oneOfRule.use.some((u) => u.loader?.includes("/css-loader/"))) {
          insertions.push(idx);
        }
      });

      for (let i = insertions.length - 1; i >= 0; i--) {
        const idx = insertions[i];
        const template = rule.oneOf[idx];
        const prefixUse = template.use.map((u) => {
          if (typeof u === "string") return u;
          if (u.loader?.includes("/css-loader/")) {
            return {
              ...u,
              options: {
                ...(u.options ?? {}),
                modules: {
                  localIdentName: `${css_prefix}[local]`,
                  getLocalIdent(_ctx, _ident, className) {
                    if (className.includes("ant")) return className;
                  },
                },
              },
            };
          }
          return u;
        });

        rule.oneOf.splice(idx, 0, {
          test: /\.prefix\.css$/,
          include: template.include,
          exclude: /node_modules/,
          use: prefixUse,
        });
      }

      rule.exclude = /tailwind\.css/;
    });

    // Force local @humansignal icon SVGs through svgr regardless of issuer.
    const humansignalIconsSvgRule = {
      test: /libs[\\/]ui[\\/]src[\\/]assets[\\/]icons[\\/].*\.svg(\?.*)?$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            ref: true,
            exportType: "named",
            namedExport: "ReactComponent",
            svgo: false,
          },
        },
        path.resolve(__dirname, "tools/loaders/svg-source-loader.cjs"),
      ],
    };
    config.module.rules.unshift(humansignalIconsSvgRule);

    const svgRule = {
      test: /\.svg(\?.*)?$/,
      exclude: /node_modules/,
      oneOf: [
        {
          issuer: /\.[jt]sx?$/,
          use: [
            {
              loader: "@svgr/webpack",
              options: {
                ref: true,
                exportType: "named",
                namedExport: "ReactComponent",
                svgo: false, // avoid parse errors with resolved svgo >=3.3.3
              },
            },
            path.resolve(__dirname, "tools/loaders/svg-source-loader.cjs"),
          ],
        },
        {
          type: "asset/resource",
        },
      ],
    };
    config.module.rules.unshift(svgRule);

    // Ensure no other webpack rules process .svg and override svgr output
    const isOurSvgRule = (rule) => rule === svgRule || rule === humansignalIconsSvgRule;
    const addSvgExclude = (rule) => {
      if (!rule || isOurSvgRule(rule)) return;
      const testString = rule.test?.toString?.() ?? "";
      if (!testString.includes("svg")) return;
      const svgExclude = /\.svg(\?.*)?$/;
      if (!rule.exclude) {
        rule.exclude = svgExclude;
      } else if (Array.isArray(rule.exclude)) {
        rule.exclude = [...rule.exclude, svgExclude];
      } else {
        rule.exclude = [rule.exclude, svgExclude];
      }
    };
    config.module.rules.forEach((rule) => {
      addSvgExclude(rule);
      if (Array.isArray(rule.oneOf)) {
        rule.oneOf.forEach(addSvgExclude);
      }
    });

    config.module.rules.push(
      {
        test: /\.xml$/,
        exclude: /node_modules/,
        type: "asset/resource",
      },
      {
        test: /\.wasm$/,
        type: "asset/resource",
        generator: {
          filename: "[name][ext]",
        },
      },
      {
        test: /\.(gif|png|jpe?g|webp)(\?.*)?$/,
        type: "asset/resource",
        generator: {
          filename: "assets/[name]-[hash][ext]",
        },
      },
      // tailwindcss
      {
        test: /tailwind\.css/,
        exclude: /node_modules/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          "postcss-loader",
        ],
      },
    );

    if (isDevelopment) {
      config.optimization = {
        ...config.optimization,
        moduleIds: "named",
      };
    }

    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // Common dependencies across at least two sub-packages
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-joyride": path.resolve(__dirname, "node_modules/react-joyride"),
      "@humansignal/ui": path.resolve(__dirname, "libs/ui"),
      "@humansignal/core": path.resolve(__dirname, "libs/core"),
      "@humansignal/icons$": path.resolve(__dirname, "libs/ui/src/assets/icons/index.ts"),
      "@humansignal/shad": path.resolve(__dirname, "libs/ui/src/shad"),
      "@humansignal/ui/lib": path.resolve(__dirname, "libs/ui/src/lib"),
    };

    return merge(config, {
      devtool,
      mode,
      plugins,
      optimization: optimizer(),
      devServer: process.env.MODE?.startsWith("standalone")
        ? {}
        : {
            // Port for the Webpack dev server
            port: HMR_PORT,
            // Enable HMR
            hot: true,
            // Allow cross-origin requests from Django
            headers: { "Access-Control-Allow-Origin": "*" },
            static: {
              directory: path.resolve(__dirname, "../label_studio/core/static/"),
              publicPath: "/static/",
            },
            devMiddleware: {
              publicPath: `${FRONTEND_HOSTNAME}/react-app/`,
            },
            allowedHosts: "all", // Allow access from Django's server
            proxy: [
              {
                context: ["/api"],
                target: `${DJANGO_HOSTNAME}/api`,
                changeOrigin: true,
                pathRewrite: { "^/api": "" },
                secure: false,
              },
              {
                context: ["/"],
                target: `${DJANGO_HOSTNAME}`,
                changeOrigin: true,
                secure: false,
              },
            ],
          },
    });
  },
);
