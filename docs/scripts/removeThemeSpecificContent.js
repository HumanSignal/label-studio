var HTMLParser = require("node-html-parser");

hexo.extend.filter.register("after_render:html", function (str, data) {
  /* If you’re on the OSS site, remove every `.enterprise-only` element. Opposite for the ENT site */
  const classToRemove =
    hexo.config.theme_config.tier === "opensource"
      ? ".enterprise-only"
      : ".opensource-only";

  const template = HTMLParser.parse(str);

  template.querySelectorAll(classToRemove).forEach((x) => x.remove());

  str = template.toString();

  return str;
});
