var HTMLParser = require("node-html-parser");

module.exports = function (ctx) {
  return function includeTag(content) {
    const { config } = ctx;

    /* If you’re on the OSS site, remove every `.enterprise-only` element. Opposite for the ENT site */
    const classToRemove =
      config.theme_config.tier === "opensource"
        ? ".enterprise-only"
        : ".opensource-only";

    const template = HTMLParser.parse(content);

    template.querySelectorAll(classToRemove).forEach((x) => x.remove());

    content = template.toString();

    return content;
  };
};
