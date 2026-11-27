const autoprefixer = require("autoprefixer");
const postcssImport = require("postcss-import");
const postcssNested = require("postcss-nested");
const tailwindcss = require("tailwindcss");
const { postcssPrefixLsfClasses } = require("./postcss-prefix-lsf.cjs");

module.exports = {
  plugins: [
    postcssImport(),
    postcssNested(),
    postcssPrefixLsfClasses(),
    tailwindcss({ config: `${__dirname}/tailwind.config.js` }),
    autoprefixer(),
  ],
};
