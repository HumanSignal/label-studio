/**
 * Parses a string of inline styles into a JavaScript object with casing for React
 *
 * TODO this is broken for such case: styleToProp('background-image: url(\'https://example.com/image.png\')')
 *
 * @see TemplateEngine via MIT Licensed https://github.com/NervJS/taro/blob/master/packages/taro-components-rn/src/utils/index.ts
 *
 * @param {string} styles
 * @returns {Object}
 */
export function styleToProp(styles) {
  if (!styles) return null;
  return styles
    .split(";")
    .filter(style => style.split(":")[0] && style.split(":")[1])
    .map(style => [
      style
        .split(":")[0]
        .trim()
        .replace(/-./g, c => c.substr(1).toUpperCase()),
      style.split(":")[1].trim(),
    ])
    .reduce(
      (styleObj, style) => ({
        ...styleObj,
        [style[0]]: style[1],
      }),
      {},
    );
}
