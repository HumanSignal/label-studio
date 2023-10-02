import React from 'react';
import { Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EnterOutlined } from '@ant-design/icons';
import styles from './HtxTextBox.module.scss';
import throttle from 'lodash.throttle';
import { FF_DEV_1566, isFF } from '../../utils/feature-flags';

const { Paragraph } = Typography;

export class HtxTextBox extends React.Component {
  state = {
    editing: false,
    height: 0,
    value: this.props.text,
  };

  textRef = React.createRef();
  inputRef = React.createRef();

  static getDerivedStateFromProps(props, state) {
    if (isFF(FF_DEV_1566) && props.text !== state.prevPropsText) {
      return {
        value: props.text,
        prevPropsText: props.text,
      };
    }
    return null;
  }

  componentDidMount() {
    if (isFF(FF_DEV_1566)) {
      window.addEventListener('click', this.handleGlobalClick, { capture: true });
    }
  }

  componentWillUnmount() {
    if (isFF(FF_DEV_1566)) {
      window.removeEventListener('click', this.handleGlobalClick, { capture: true });
    }
  }

  handleGlobalClick = (e) => {
    const el = e?.target;
    const isShortcut = el?.dataset?.shortcut;
    const shouldSkip = !this.state.editing || this.props.ignoreShortcuts && isShortcut || el === this.inputRef.current;

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

  setEditing = editing => {
    this.setState({ editing });
  };

  setValue = value => {
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
    const height = this.inputRef.current?.scrollHeight || 0;

    if (height && height !== this.state.height) {
      this.setState({ height });
    }
  }, 100);

  renderEdit() {
    const { className = '', rows = 1, onlyEdit, name, onFocus, onChange, ...props } = this.props;
    const { height, value } = this.state;

    const inputProps = {
      name,
      className: 'ant-input ' + styles.input,
      style: height ? { height } : null,
      autoFocus: true,
      ref: this.inputRef,
      value,
      onBlur: isFF(FF_DEV_1566) ? ()=>{
        onChange(this.state.value);
      } : this.save,
      onFocus,
      onChange: e => {
        this.setValue(e.target.value);
        this.updateHeight();
      },
      onKeyDown: e => {
        const { key, shiftKey } = e;

        if (key === 'Enter') {
          // for multiline textarea save only by shift+enter
          if (+rows === 1 || shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            this.save();
          }
        } else if (key === 'Escape') {
          this.cancel();
        } else if (isFF(FF_DEV_1566) && key === 'Tab') {
          this.setEditing(false);
        }
      },
    };

    this.updateHeight();

    return (
      <Paragraph {...props} className={className + ' ant-typography-edit-content ' + styles.editing}>
        {rows > 1 ? <textarea {...inputProps} /> : <input {...inputProps} />}
        {!onlyEdit && (
          <Tooltip title="Save: [shift+enter]">
            <EnterOutlined className={'ant-typography-edit-content-confirm ' + styles.enter} onClick={this.save} />
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
      ignoreShortcuts: _,
      onlyEdit: __,
      ...props
    } = this.props;

    return (
      <>
        <Paragraph {...props}>
          <span ref={this.textRef}>{text}</span>
          {isEditable && onChange && <EditOutlined onClick={this.startEditing} aria-label="Edit Region" className="ant-typography-edit" />}
        </Paragraph>
        {isDeleteable && onDelete && <DeleteOutlined className={styles.delete} aria-label="Delete Region" onClick={onDelete} />}
      </>
    );
  }

  render() {
    return (this.state.editing || this.props.onlyEdit) && this.props.isEditable ? this.renderEdit() : this.renderView();
  }
}
