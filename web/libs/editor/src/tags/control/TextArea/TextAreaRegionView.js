import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { isAlive } from 'mobx-state-tree';

import Button from 'antd/lib/button/index';
import Form from 'antd/lib/form/index';
import Input from 'antd/lib/input/index';

import { IconTrash } from '../../../assets/icons';
import styles from '../../../components/HtxTextBox/HtxTextBox.module.scss';
import Registry from '../../../core/Registry';
import { PER_REGION_MODES } from '../../../mixins/PerRegion';
import { Block, Elem } from '../../../utils/bem';
import { FF_LSDV_4712, isFF } from '../../../utils/feature-flags';

import './TextArea.styl';

const { TextArea } = Input;

const HtxTextAreaResultLine = forwardRef(({
  idx,
  value,
  readOnly,
  onChange,
  onDelete,
  onFocus,
  validate,
  control,
  collapsed,
}, ref) => {
  const rows = parseInt(control.rows);
  const isTextarea = rows > 1;
  const [stateValue, setStateValue] = useState(value ?? '');

  if (isFF(FF_LSDV_4712)) {
    useEffect(() => {
      if (value !== stateValue) {
        setStateValue(value);
      }
    }, [value]);
  }

  const displayValue = useMemo(() => {
    if (collapsed) {
      return (value ?? '').split(/\n/)[0] ?? '';
    }

    return isFF(FF_LSDV_4712) ? stateValue : value;
  }, [value, collapsed, ...(isFF(FF_LSDV_4712) ? [stateValue] : [])]);

  const changeHandler = isFF(FF_LSDV_4712)
    ? useCallback(e => {
      setStateValue(e.target.value);
    }, [])
    : e => {
      if (!collapsed) onChange(idx, e.target.value);
    };

  const blurHandler = useCallback((e) => {
    if (value === e.target.value || collapsed) return;

    if (validate && !validate(e.target.value)) {
      setStateValue(value);
    } else {
      onChange?.(idx, e.target.value);
    }
  },[idx, value, onChange, validate, collapsed]);

  const inputProps = {
    className: 'ant-input ' + styles.input,
    value: displayValue,
    autoSize: isTextarea ? { minRows: 1 } : null,
    onChange: changeHandler,
    readOnly: readOnly || collapsed,
    onFocus,
  };

  if (isFF(FF_LSDV_4712)) {
    inputProps.onBlur = blurHandler;
  }

  if (isFF(FF_LSDV_4712) || isTextarea) {
    inputProps.onKeyDown = e => {
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.target?.blur?.();
      }
    };
  }

  return (
    <Elem name="item">
      <Elem name="input" tag={isTextarea ? TextArea : Input} {...inputProps} ref={ref}/>
      { (!collapsed && !readOnly) && (
        <Elem
          name="action"
          aria-label="Delete Region"
          tag={Button}
          icon={<IconTrash />}
          size="small"
          type="text"
          onClick={() => { onDelete(idx); }}
        />
      ) }
    </Elem>
  );
});

const HtxTextAreaResult = observer(({
  item,
  control,
  firstResultInputRef,
  onFocus,
  collapsed,
}) => {
  const value = item.mainValue;
  const editable = !item.isReadOnly() && item.from_name.editable && !item.area.isReadOnly();

  const changeHandler = useCallback((idx, val) => {
    if (item.from_name.isReadOnly()) return;
    const newValue = value.toJSON();

    newValue.splice(idx, 1, val);
    item.setValue(newValue);
  }, [value]);

  const deleteHandler = useCallback((idx) => {
    if (!item.from_name.isDeleteable) return;
    const newValue = value.toJSON();

    newValue.splice(idx, 1);
    item.setValue(newValue);
  }, [value]);

  return value.map((line, idx) => {
    return (
      <HtxTextAreaResultLine
        key={idx}
        idx={idx}
        value={line}
        readOnly={!editable}
        onChange={changeHandler}
        onDelete={deleteHandler}
        control={control}
        ref={idx === 0 ? firstResultInputRef : null}
        onFocus={onFocus}
        collapsed={collapsed}
        validate={isFF(FF_LSDV_4712) ? item.from_name.validateValue : null}
      />
    );
  });
});

const HtxTextAreaRegionView = observer(({ item, area, collapsed, setCollapsed, outliner, color }) => {
  const rows = parseInt(item.rows);
  const isTextArea = rows > 1;
  const isActive = item.perRegionArea === area;
  const shouldFocus = area.isCompleted && area.perRegionFocusTarget === item && area.perRegionFocusRequest;
  const value = isActive ? item._value : '';
  const result = area.results.find(r => r.from_name === item);

  const expand = useCallback(() => {
    if (collapsed) {
      setCollapsed(false);

      if (!area.isSelected) {
        area.annotation.selectArea(area);
      }
    }
  }, [collapsed]);

  const submitValue = useCallback(() => {
    if (result) {

      item.addTextToResult(item._value, result);
      item.setValue('');
    } else {
      item.addText(item._value);
      item.setValue('');
    }
  }, [item, result]);

  const mainInputRef = useRef();
  const firstResultInputRef = useRef();
  const lastFocusRequest = useRef(0);
  const styles = useMemo(() => {
    return color ? {
      '--border-color': color,
    } : {};
  }, [color]);

  useEffect(() => {
    if (isActive && shouldFocus && lastFocusRequest.current < area.perRegionFocusRequest) {
      (mainInputRef.current || firstResultInputRef.current)?.focus({ cursor: 'end' });
      lastFocusRequest.current = area.perRegionFocusRequest;
    }
  }, [isActive, shouldFocus]);

  useEffect(() => {
    if (collapsed && item._value) {
      submitValue();
    }
  }, [collapsed]);

  const props = {
    ref: mainInputRef,
    value,
    rows: item.rows,
    className: 'is-search',
    label: item.label,
    placeholder: item.placeholder,
    autoSize: isTextArea ? { minRows: 1 } : null,
    onChange: ev => {
      if (collapsed) return;

      const { value } = ev.target;

      item.setValue(value);
    },
    onFocus: (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      if (!area.isSelected) {
        area.annotation.selectArea(area);
      }
    },
  };

  if (isTextArea) {
    // allow to add multiline text with shift+enter
    props.onKeyDown = e => {
      if (((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') && !item.annotation.isReadOnly()) {
        e.preventDefault();
        e.stopPropagation();
        if (item.allowsubmit && item._value) {
          submitValue();
        } else {
          e.target?.blur?.();
        }
      }
    };
  }

  if (item.annotation.isReadOnly()) props['disabled'] = true;

  const showAddButton = !item.annotation.isReadOnly() && (item.showsubmitbutton ?? rows !== 1);
  const itemStyle = {};

  if (showAddButton) itemStyle['marginBottom'] = 0;

  const showSubmit = (!result || !result?.mainValue?.length || (item.maxsubmissions && result.mainValue.length < parseInt(item.maxsubmissions)))
  && !area.isReadOnly();

  if (!isAlive(item) || !isAlive(area)) return null;

  return (result || showSubmit) && (
    <Block name="textarea-tag" mod={{ mode: item.mode, outliner }} style={styles}>
      {result ? (
        <HtxTextAreaResult
          control={item}
          item={result}
          collapsed={collapsed}
          firstResultInputRef={firstResultInputRef}
          onFocus={expand}
        />
      ) : null}

      {showSubmit && (
        <Elem name="form"
          tag={Form}
          onFinish={() => {
            if (item.allowsubmit && item._value && !item.annotation.isReadOnly()) {
              submitValue();
            }
            return false;
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Elem name="input" tag={isTextArea ? TextArea : Input} {...props} onClick={(e) => {
            e.stopPropagation();
          }} />
        </Elem>
      )}
    </Block>
  );
});

Registry.addPerRegionView('textarea', PER_REGION_MODES.REGION_LIST, HtxTextAreaRegionView);
