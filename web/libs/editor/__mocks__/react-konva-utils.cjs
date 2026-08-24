/**
 * Stub for react-konva-utils in tests. Portal is used to render React children into a Konva layer.
 */
const React = require("react");

function Portal(props) {
  return React.createElement(React.Fragment, null, props.children);
}

module.exports = { Portal };
module.exports.default = { Portal };
