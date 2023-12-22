import React from 'react';
import PropTypes from 'prop-types';

import { HtxTextNode } from './Node';

/**
 * Node for URL
 * @param {*} props
 */
const UrlNode = props => {
  const style = { wordWrap: 'break-word' };

  return (
    <HtxTextNode
      id={props.id}
      highlightStyle={Object.assign({}, style, props.highlightStyle)}
      charIndex={props.charIndex}
      range={props.range}
      overlap={props.overlap}
      style={style}
    >
      <a data-position={props.charIndex + props.url.length} href={props.url} target="blank">
        {props.url}
      </a>
    </HtxTextNode>
  );
};

UrlNode.propTypes = {
  highlightStyle: PropTypes.object,
  id: PropTypes.string,
  charIndex: PropTypes.number,
  range: PropTypes.object,
  url: PropTypes.string,
};

export default UrlNode;
