const path = require('path');

module.exports = {
  devtool: "cheap-module-source-map",
  entry: "./label_studio/static/js/modules/index.js",
  output: {
    path: path.resolve("./label_studio/static/js/build"),
    filename: "index.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/i,
        enforce: "pre",
        use: ['source-map-loader'],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
}
