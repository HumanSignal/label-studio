import React from "react";
import { PropTypes } from "prop-types";

import { HtxTextNode } from "./Node";

/**
 * Node for Emoji
 * @param {*} props
 */
const EmojiNode = props => {
  return (
    <HtxTextNode
      id={props.id}
      highlightStyle={props.highlightStyle}
      charIndex={props.charIndex}
      range={props.range}
      overlap={props.overlap}
    >
      {`${props.text[props.charIndex]}${props.text[props.charIndex + 1]}`}
    </HtxTextNode>
  );
};

EmojiNode.propTypes = {
  id: PropTypes.string.isRequired,
  highlightStyle: PropTypes.object,
  charIndex: PropTypes.number.isRequired,
  range: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  overlap: PropTypes.array,
  text: PropTypes.string.isRequired,
};

export default EmojiNode;
