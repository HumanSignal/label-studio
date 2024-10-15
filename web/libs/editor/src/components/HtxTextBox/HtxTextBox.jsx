import React from "react";
import { Typography } from "antd";
import { EnterOutlined } from "@ant-design/icons";
import { IconEdit, IconTrashAlt } from "../../assets/icons";
import { Button } from "../../common/Button/Button";
import { Tooltip } from "../../common/Tooltip/Tooltip";
import { Elem } from "../../utils/bem";
import styles from "./HtxTextBox.module.scss";
import throttle from "lodash.throttle";

const { Paragraph } = Typography;
// used for correct auto-height calculation
const BORDER_WIDTH = 1;

export class HtxTextBox extends React.Component {
  state = {
    editing: false,
    height: 0,
    value: this.props.text,
  };

  textRef = React.createRef();
  inputRef = React.createRef();

  static getDerivedStateFromProps(props, state) {
    if (props.text !== state.prevPropsText) {
      return {
        value: props.text,
        prevPropsText: props.text,
      };
    }
    return null;
  }

  componentDidMount() {
    window.addEventListener("click", this.handleGlobalClick, { capture: true });
  }

  componentWillUnmount() {
    window.removeEventListener("click", this.handleGlobalClick, { capture: true });
  }

  handleGlobalClick = (e) => {
    const el = e?.target;
    const isShortcut = el?.dataset?.shortcut;
    const shouldSkip =
      !this.state.editing || (this.props.ignoreShortcuts && isShortcut) || el === this.inputRef.current;

    if (!shouldSkip) {
      this.setEditing(false);
    }
  };

  startEditing = () => {
    const height = this.textRef.current?.parentNode.offsetHeight || 0;

    this.setState({ editing: true, height });

    // eslint-disable-next-line no-unused-expressions
    this.props.onStartEditing?.();

    setTimeout(this.focus);
  };

  focus = () => {
    const input = this.inputRef.current;

    if (input) input.selectionStart = this.state.value.length;
  };

  setEditing = (editing) => {
    this.setState({ editing });
  };

  setValue = (value) => {
    this.setState({ value });
  };

  cancel = () => {
    this.setValue(this.props.text);
    this.setEditing(false);
  };

  save = () => {
    this.props.onChange(this.state.value);
    this.setEditing(false);
  };

  updateHeight = throttle(() => {
    // very important to add borders to the height, otherwise input will be shrinking on every recalc
    const scrollHeight = this.inputRef.current?.scrollHeight ?? 0;
    const height = scrollHeight + BORDER_WIDTH * 2;

    // initially scrollHeight can be 0, so we won't change height
    if (scrollHeight && height !== this.state.height) {
      this.setState({ height });
    }
  }, 100);

  renderEdit() {
    const {
      className = "",
      rows = 1,
      onlyEdit,
      name,
      onFocus,
      onChange,

      // don't pass non-DOM props to Paragraph
      onDelete: _,
      isEditable: __,
      isDeleteable: ___,
      ignoreShortcuts: ____,

      ...props
    } = this.props;
    const { height, value } = this.state;

    const inputProps = {
      name,
      className: `ant-input ${styles.input}`,
      style: height ? { height, borderWidth: BORDER_WIDTH } : null,
      autoFocus: true,
      ref: this.inputRef,
      value,
      onBlur: () => {
        onChange(this.state.value);
      },
      onFocus,
      onChange: (e) => {
        this.setValue(e.target.value);
        this.updateHeight();
      },
      onKeyDown: (e) => {
        const { key, shiftKey } = e;

        if (key === "Enter") {
          // for multiline textarea save only by shift+enter
          if (+rows === 1 || shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            this.save();
          }
        } else if (key === "Escape") {
          this.cancel();
        } else if (key === "Tab") {
          this.setEditing(false);
        }
      },
    };

    this.updateHeight();

    return (
      <Paragraph {...props} className={`${className} ant-typography-edit-content ${styles.editing}`}>
        {rows > 1 ? <textarea {...inputProps} /> : <input {...inputProps} />}
        {!onlyEdit && (
          <Tooltip title="Save: [shift+enter]">
            <EnterOutlined className={`ant-typography-edit-content-confirm ${styles.enter}`} onClick={this.save} />
          </Tooltip>
        )}
      </Paragraph>
    );
  }

  renderView() {
    const {
      onChange,
      onDelete,
      isEditable,
      isDeleteable,
      text,

      // don't pass non-DOM props to Paragraph
      ignoreShortcuts: _,
      onlyEdit: __,

      ...props
    } = this.props;

    return (
      <>
        <Paragraph {...props}>
          <span ref={this.textRef}>{text}</span>
        </Paragraph>
        {isEditable && onChange && (
          <Button
            type="text"
            className={styles.button}
            tooltip="Edit"
            tooltipTheme="Dark"
            style={{ padding: 0 }}
            icon={<IconEdit />}
            aria-label="Edit Region"
            onClick={this.startEditing}
          />
        )}
        {isDeleteable && onDelete && (
          <Button
            type="text"
            look="danger"
            className={styles.button}
            tooltip="Delete"
            tooltipTheme="Dark"
            style={{ padding: 0 }}
            icon={<IconTrashAlt />}
            aria-label="Delete Region"
            onClick={onDelete}
          />
        )}
      </>
    );
  }

  render() {
    return (this.state.editing || this.props.onlyEdit) && this.props.isEditable ? this.renderEdit() : this.renderView();
  }
}
