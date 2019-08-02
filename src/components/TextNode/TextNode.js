import React, { Component } from "react";
import { PropTypes } from "prop-types";

export default class TextNode extends Component {
  render() {
    return (
      <span
        data-position={this.props.position}
        overlap={this.props.overlap}
        key={this.props.keyNode ? this.props.keyNode : null}
        style={this.props.style}
      >
        {this.props.children}
      </span>
    );
  }
}

TextNode.propTypes = {
  position: PropTypes.number,
  overlap: PropTypes.string,
  key: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
};
