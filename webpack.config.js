const path = require('path');

module.exports = {
  entry: "./label_studio/static/js/modules/index.js",
  output: {
    path: path.resolve("./label_studio/static/js/build"),
    filename: "index.js"
  }
}
