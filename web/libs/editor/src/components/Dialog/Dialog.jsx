import React from "react";
import { PropTypes } from "prop-types";
import { Tag } from "antd";

import styles from "./Dialog.module.scss";

export default class DialogView extends React.Component {
  render() {
    let selectedStyle = `${styles.block}`;
    let hint;
    let bgColor;
    let date;

    if (this.props.hint) {
      hint = <Tag color="blue">{this.props.hint}</Tag>;
    }

    if (this.props.bg) {
      bgColor = this.props.bg;
    }

    if (this.props.selected) {
      selectedStyle = `${selectedStyle} ${styles.block_selected}`;
      hint = (
        <div>
          <Tag color="magenta">Selected Message</Tag>
        </div>
      );

      if (this.props.hint) {
        hint = (
          <div className={styles.tag}>
            <Tag color="magenta">{this.props.hint}</Tag>
          </div>
        );
      }
    }

    if (this.props.date) {
      date = <span className={styles.date}>{this.props.date}</span>;
    }

    return (
      <div className={selectedStyle} style={{ background: bgColor, width: "max-content", maxWidth: "100%" }}>
        <span className={styles.name}>{this.props.name}:&nbsp;</span>
        <p className={styles.text}>{this.props.text}</p>
        {date}
        {hint}
      </div>
    );
  }
}

DialogView.propTypes = {
  name: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  date: PropTypes.string,
  hint: PropTypes.string,
};
