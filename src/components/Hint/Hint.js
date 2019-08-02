import React, { Component } from "react";
import { PropTypes } from "prop-types";

import styles from "./Hint.module.scss";

/**
 * Hint Component
 * @param {object} style
 * @param {ant} children
 */
export default class Hint extends Component {
  render() {
    let style;
    let localClass = `${styles.main}`;

    if (this.props.style) style = this.props.style;

    if (this.props.className) {
      localClass = `${styles.main} ${this.props.className}`;
    }

    return (
      <sup data-copy={this.props.copy} className={localClass} style={style}>
        {this.props.children}
      </sup>
    );
  }
}

Hint.propTypes = {
  style: PropTypes.object,
  className: PropTypes.string,
  copy: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.string, PropTypes.object]),
};
