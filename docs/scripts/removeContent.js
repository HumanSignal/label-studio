var HTMLParser = require('node-html-parser');

hexo.extend.filter.register('marked:renderer', function(renderer) {
  const { config } = this;

  /* If you’re on the OSS site, remove every `.enterprise-only` element. Opposite for the ENT site */
  const classToRemove = config.theme_config.tier === "opensource" ? ".enterprise-only" : ".opensource-only";

  if(config.theme_config.tier === "opensource") {
    renderer.html = function(props) {
      const template = HTMLParser.parse(props);
      template.querySelectorAll(classToRemove).forEach(x=> x.remove());

      return template.toString();
    }
  }
})