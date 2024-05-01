import React from "react";
import { PropTypes } from "prop-types";
import { Radio } from "antd";

import Hint from "../Hint/Hint";

/**
 * Choice Component
 */
export default class ChoiceComponent extends React.Component {
  render() {
    let hint;

    if (this.props.hint) {
      hint = <Hint>[{this.props.hint}]</Hint>;
    }

    return (
      <Radio
        value={this.props.value}
        onChange={this.props.onChange}
        checked={this.props.checked}
        defaultChecked={this.props.checked}
      >
        {this.props.children}
        {hint}
      </Radio>
    );
  }
}

ChoiceComponent.propTypes = {
  children: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
  value: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  defaultChecked: PropTypes.bool,
  hint: PropTypes.string,
  onChange: PropTypes.func,
};
