const rewire = require("rewire");
const defaults = rewire("react-scripts/scripts/build.js");
let config = defaults.__get__("config");

config.optimization.splitChunks = {
  cacheGroups: {
    default: false,
  },
};

/**
 * Disable hash generation in production build for JS
 */
config.output.filename = "static/js/[name].bundle.js";

/**
 * Disable hash generation in production build for CSS
 */
config.plugins[5].options.filename = "static/css/[name].bundle.css";

/**
 * Disable chunks in production build
 */
config.optimization.runtimeChunk = false;
