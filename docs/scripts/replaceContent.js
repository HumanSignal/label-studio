module.exports = function () {
  return function includeTag(content) {
    const replacedContent = content.replaceAll(
      "Label Studio Enterprise",
      "LSE"
    );

    return replacedContent;
  };
};
