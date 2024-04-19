import wp from "@cypress/webpack-preprocessor";

const options = {
  webpackOptions: {
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
        data: `${process.cwd()}/data`,
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          options: { transpileOnly: true },
        },
      ],
    },
  },
};

/**
 * Allows importing typescript modules from `node_modules`
 * @param {Cypress.PluginEvents} on Event subscriber
 */
export const setupTypescript = (on) => {
  on("file:preprocessor", wp(options));
};
