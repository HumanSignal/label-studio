var HTMLParser = require('node-html-parser');

hexo.extend.filter.register('marked:renderer', function(renderer) {
  const { config } = this;

  if(config.theme_config.tier === "opensource") {
    renderer.html = function(props) {
      const template = HTMLParser.parse(props);
      template.querySelectorAll(".enterprise-only").forEach(x=> x.remove());

      return template.toString();
    }
  }
})