import React from "react";
import { PropTypes } from "prop-types";

import styles from "./Segment.module.scss";

/**
 * Segment Component
 */
export default class Segment extends React.Component {
  componentDidMount() {
    const { annotation } = this.props;

    if (annotation) annotation.updateObjects();
  }

  render() {
    let cn = styles.block;

    if (this.props.className) cn = cn + " " + this.props.className;

    return <div className={cn}>{this.props.children}</div>;
  }
}

Segment.propTypes = {
  children: PropTypes.array.isRequired,
};
