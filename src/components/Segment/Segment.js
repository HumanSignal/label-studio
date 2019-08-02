import React from "react";
import { PropTypes } from "prop-types";

import styles from "./Segment.module.scss";

/**
 * Segment Component
 */
export default class Segment extends React.Component {
  render() {
    return <div className={styles.block}>{this.props.children}</div>;
  }
}

Segment.propTypes = {
  children: PropTypes.array.isRequired,
};
