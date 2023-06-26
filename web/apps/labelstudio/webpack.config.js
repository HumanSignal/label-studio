// const path = require('path');
const path = require('path');
const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`

  // update the stylus loader to include an import of a global file
  config.module.rules.forEach((rule) => {
    if (rule.test.toString().includes('styl')) {
      const r = rule.oneOf.filter((r) => r.use && r.use.find((u) => u.loader && u.loader.includes('stylus-loader')))
      r.forEach(_r => {
        const l = _r.use.filter((u) => u.loader && u.loader.includes('stylus-loader'))
        l.forEach(_l => {
          _l.options = {
            ..._l.options,
            stylusOptions: {
              ..._l.options.stylusOptions,
              import: [path.resolve(__dirname, './src/themes/default/variables.styl')],
            },
          }
        })
      })
    }
  });

  return config;
});
