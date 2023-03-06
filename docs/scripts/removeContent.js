var HTMLParser = require('node-html-parser');

hexo.extend.filter.register('after_render:html', function(data) {

  const { config } = this;

  /* If you’re on the OSS site, remove every `.enterprise-only` element. Opposite for the ENT site */
  const classToRemove = config.theme_config.tier === "opensource" ? ".enterprise-only" : ".opensource-only";

  const template = HTMLParser.parse(data);

  template.querySelectorAll(classToRemove).forEach(x=> x.remove()); 

  data = template.toString();

  return data;
})