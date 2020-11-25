const path = require('path');

module.exports = {
  entry: "./label_studio/static/js/modules/index.js",
  output: {
    path: path.resolve("./label_studio/static/js/build"),
    filename: "index.js"
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
}
