"use strict";

const React = require("react");

/** Named export used by SVGR (`export { ReactComponent as IconFoo } from "./x.svg"`). */
function SvgMock(props) {
  return React.createElement("svg", { ...props });
}

module.exports = { ReactComponent: SvgMock };
