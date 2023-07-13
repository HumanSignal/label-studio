import React, { createRef, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from 'antd/lib/button/index';
import Form from 'antd/lib/form/index';
import Input from 'antd/lib/input/index';
import { observer } from 'mobx-react';
import { destroy, isAlive, types } from 'mobx-state-tree';

import ProcessAttrsMixin from '../../../mixins/ProcessAttrs';
import RequiredMixin from '../../../mixins/Required';
import PerRegionMixin, { PER_REGION_MODES } from '../../../mixins/PerRegion';
import InfoModal from '../../../components/Infomodal/Infomodal';
import Registry from '../../../core/Registry';
import Tree from '../../../core/Tree';
import Types from '../../../core/Types';
import { HtxTextAreaRegion, TextAreaRegionModel } from '../../../regions/TextAreaRegion';
import ControlBase from '../Base';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import styles from '../../../components/HtxTextBox/HtxTextBox.module.scss';
import { Block, Elem } from '../../../utils/bem';
import './TextArea.styl';
import { IconTrash } from '../../../assets/icons';
import {
  FF_DEV_1564_DEV_1565,
  FF_DEV_3730,
  FF_LSDV_4583,
  FF_LSDV_4659,
  FF_LSDV_4712,
  isFF
} from '../../../utils/feature-flags';
import { ReadOnlyControlMixin } from '../../../mixins/ReadOnlyMixin';
import ClassificationBase from '../ClassificationBase';
import PerItemMixin from '../../../mixins/PerItem';

const { TextArea } = Input;

/**
 * The `TextArea` tag is used to display a text area for user input. Use for transcription, paraphrasing, or captioning tasks.
 *
 * Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.
 *
 * [^FF_LSDV_4659]: `fflag_feat_front_lsdv_4659_skipduplicates_060323_short` should be enabled to use `skipDuplicates` attribute
 * [^FF_LSDV_4712]: `fflag_feat_front_lsdv_4712_skipduplicates_editing_110423_short` should be enabled to keep submissions unique during editing existed results
 * [^FF_LSDV_4583]: `fflag_feat_front_lsdv_4583_multi_image_segmentation_short` should be enabled for `perItem` functionality
 *
 * @example
 * <!--Basic labeling configuration to display only a text area -->
 * <View>
 *   <TextArea name="ta"></TextArea>
 * </View>
 * @example
 * <!--You can combine the `TextArea` tag with other tags for OCR or other transcription tasks-->
 * <View>
 *   <Image name="image" value="$ocr"/>
 *   <Labels name="label" toName="image">
 *     <Label value="Product" background="#166a45"/>
 *     <Label value="Price" background="#2a1fc7"/>
 *   </Labels>
 *   <Rectangle name="bbox" toName="image" strokeWidth="3"/>
 *   <TextArea name="transcription" toName="image" editable="true" perRegion="true" required="true" maxSubmissions="1" rows="5" placeholder="Recognized Text" displayMode="region-list"/>
 * </View>
 * @example
 * <!--
 *  You can keep submissions unique[^FF_LSDV_4659][^FF_LSDV_4712]
 * -->
 * <View>
 *   <Audio name="audio" value="$audio"/>
 *   <TextArea name="genre" toName="audio" skipDuplicates="true" />
 * </View>
 * @name TextArea
 * @meta_title Textarea Tag for Text areas
 * @meta_description Customize Label Studio with the TextArea tag to support audio transcription, image captioning, and OCR tasks for machine learning and data science projects.
 * @param {string} name                    - Name of the element
 * @param {string} toName                  - Name of the element that you want to label
 * @param {string} value                   - Pre-filled value
 * @param {string=} [label]                - Label text
 * @param {string=} [placeholder]          - Placeholder text
 * @param {string=} [maxSubmissions]       - Maximum number of submissions
 * @param {boolean=} [editable=false]      - Whether to display an editable textarea
 * @param {boolean} [skipDuplicates=false] - Prevent duplicates in textarea inputs[^FF_LSDV_4659][^FF_LSDV_4712] (see example below)
 * @param {boolean=} [transcription=false] - If false, always show editor
 * @param {number} [rows]                  - Number of rows in the textarea
 * @param {boolean} [required=false]       - Validate whether content in textarea is required
 * @param {string} [requiredMessage]       - Message to show if validation fails
 * @param {boolean=} [showSubmitButton]    - Whether to show or hide the submit button. By default it shows when there are more than one rows of text, such as in textarea mode.
 * @param {boolean} [perRegion]            - Use this tag to label regions instead of whole objects
 * @param {boolean} [perItem]              - Use this tag to label items inside objects instead of whole objects[^FF_LSDV_4583]
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),
  allowsubmit: types.optional(types.boolean, true),
  label: types.optional(types.string, ''),
  value: types.maybeNull(types.string),
  rows: types.optional(types.string, '1'),
  showsubmitbutton: types.maybeNull(types.boolean),
  placeholder: types.maybeNull(types.string),
  maxsubmissions: types.maybeNull(types.string),
  editable: types.optional(types.boolean, false),
  transcription: false,
  ...(isFF(FF_LSDV_4659) ? {
    skipduplicates: types.optional(types.boolean, false),
  } : {}),
});

const Model = types.model({
  type: 'textarea',
  regions: types.array(TextAreaRegionModel),

  _value: types.optional(types.string, ''),
  children: Types.unionArray(['shortcut']),

}).volatile(() => {
  return {
    focusable: true,
    textareaRef: createRef(),
  };
}).views(self => ({
  get isEditable() {
    return self.editable && self.annotation.editable;
  },

  get isDeleteable() {
    return !self.isReadOnly();
  },

  get valueType() {
    return 'text';
  },

  get holdsState() {
    return self.regions.length > 0;
  },

  get submissionsNum() {
    return self.regions.length;
  },

  get showSubmit() {
    if (self.maxsubmissions) {
      const num = parseInt(self.maxsubmissions);

      return self.submissionsNum < num;
    } else {
      return true;
    }
  },

  get serializableValue() {
    if (!self.regions.length) return null;
    return { text: self.selectedValues() };
  },

  selectedValues() {
    return self.regions.map(r => r._value);
  },

  hasResult(text) {
    if (!self.result) return false;
    let value = self.result.mainValue;

    if (!Array.isArray(value)) value = [value];
    text = text.toLowerCase();
    return value.some(val => val.toLowerCase() === text);
  },
})).actions(self => {
  let lastActiveElement = null;
  let lastActiveElementModel = null;

  const isAvailableElement = (element, elementModel) => {
    if (!element || !elementModel || !isAlive(elementModel)) return false;
    // Not available if active element is disappeared
    if (self === elementModel && !self.showSubmit) return false;
    if (!element.parentElement) return false;
    return true;
  };

  return {
    getSerializableValue() {
      const texts = self.regions.map(s => s._value);

      if (texts.length === 0) return;

      return { text: texts };
    },

    needsUpdate() {
      self.updateFromResult(self.result?.mainValue);
    },

    requiredModal() {
      InfoModal.warning(self.requiredmessage || `Input for the textarea "${self.name}" is required.`);
    },

    uniqueModal() {
      InfoModal.warning('There is already an entry with that text. Please enter unique text.');
    },

    setResult(value) {
      const values = Array.isArray(value) ? value : [value];

      values.forEach(v => self.createRegion(v));
    },

    updateFromResult(value) {
      self.regions = [];
      value && self.setResult(value);
    },

    setValue(value) {
      self._value = value;
    },

    remove(region) {
      const index = self.regions.indexOf(region);

      if (index < 0) return;
      self.regions.splice(index, 1);
      destroy(region);
      self.onChange();
    },

    perRegionCleanup() {
      self.regions = [];
    },

    createRegion(text, pid) {
      const r = TextAreaRegionModel.create({ pid, _value: text });

      self.regions.push(r);
      return r;
    },

    onChange() {
      self.updateResult();
    },

    validateValue(text) {
      if (isFF(FF_LSDV_4659) && self.skipduplicates && self.hasResult(text)) {
        self.uniqueModal();
        return false;
      }
      return true;
    },

    addText(text, pid) {
      if (!self.validateValue(text)) return;

      self.createRegion(text, pid);
      self.onChange();
    },

    addTextToResult(text, result) {
      if (!self.validateValue(text)) return;

      const newValue = result.mainValue.toJSON();

      newValue.push(text);
      result.setValue(newValue);
    },

    beforeSend() {
      if (self._value && self._value.length) {
        self.addText(self._value);
        self._value = '';
      }
    },

    // add unsubmitted text when user switches region
    submitChanges() {
      self.beforeSend();
    },

    deleteText(text) {
      destroy(text);
    },

    onShortcut(value) {
      if (isFF(FF_DEV_1564_DEV_1565)) {
        if (!isAvailableElement(lastActiveElement, lastActiveElementModel)) {
          if (isFF(FF_DEV_3730)) {
          // Try to use main textarea element
            const textareaElement = self.textareaRef.current?.input || self.textareaRef.current?.resizableTextArea?.textArea;

            if (isAvailableElement(textareaElement, self)) {
              lastActiveElement = textareaElement;
              lastActiveElementModel = self;
            } else {
              return;
            }
          } else {
            return;
          }
        }
        lastActiveElement.setRangeText(value, lastActiveElement.selectionStart, lastActiveElement.selectionEnd, 'end');
        lastActiveElementModel.setValue(lastActiveElement.value);
      } else {
        self.setValue(self._value + value);
      }
    },

    setLastFocusedElement(element, model = self) {
      lastActiveElement = element;
      lastActiveElementModel = model;
    },

    returnFocus() {
      lastActiveElement?.focus?.();
    },
  };
});

const TextAreaModel = types.compose(
  'TextAreaModel',
  ControlBase,
  ClassificationBase,
  TagAttrs,
  ProcessAttrsMixin,
  RequiredMixin,
  PerRegionMixin,
  ...(isFF(FF_LSDV_4583) ? [PerItemMixin]:[]),
  AnnotationMixin,
  ReadOnlyControlMixin,
  Model,
);

const HtxTextArea = observer(({ item }) => {
  const rows = parseInt(item.rows);
  const onFocus = useCallback((ev, model) => {
    if (isFF(FF_DEV_1564_DEV_1565)) {
      item.setLastFocusedElement(ev.target, model);
    }
  }, [item]);

  const props = {
    name: item.name,
    value: item._value,
    rows: item.rows,
    className: 'is-search',
    label: item.label,
    placeholder: item.placeholder,
    disabled: item.isReadOnly(),
    readOnly: item.isReadOnly(),
    onChange: ev => {
      if (item.annotation.isReadOnly()) return;
      const { value } = ev.target;

      item.setValue(value);
    },
    onFocus,
    ref: item.textareaRef,
  };

  if (rows > 1) {
    // allow to add multiline text with shift+enter
    props.onKeyDown = e => {
      if (
        e.key === 'Enter' &&
        e.shiftKey &&
        item.allowsubmit &&
        item._value &&
        !item.annotation.isReadOnly()
      ) {
        e.preventDefault();
        e.stopPropagation();
        item.addText(item._value);
        item.setValue('');
      }
    };
  }

  const visibleStyle = item.perRegionVisible() ? {} : { display: 'none' };

  const showAddButton = !item.isReadOnly() && (item.showsubmitbutton ?? rows !== 1);
  const itemStyle = {};

  if (showAddButton) itemStyle['marginBottom'] = 0;

  visibleStyle['marginTop'] = '4px';

  return (item.displaymode === PER_REGION_MODES.TAG ? (
    <div className='lsf-text-area' style={visibleStyle}>
      {Tree.renderChildren(item, item.annotation)}

      {item.showSubmit && (
        <Form
          onFinish={() => {
            if (item.allowsubmit && item._value && !item.annotation.isReadOnly()) {
              item.addText(item._value);
              item.setValue('');
            }

            return false;
          }}
        >
          <Form.Item style={itemStyle}>
            {rows === 1
              ? <Input {...props} aria-label="TextArea Input"/>
              : <TextArea {...props} aria-label="TextArea Input"/>}
            {showAddButton && (
              <Form.Item>
                <Button style={{ marginTop: '10px' }} type="primary" htmlType="submit">
                    Add
                </Button>
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      )}

      {item.regions.length > 0 && (
        <div style={{ marginBottom: '1em' }}>
          {item.regions.map(t => (
            <HtxTextAreaRegion key={t.id} item={t} onFocus={onFocus}/>
          ))}
        </div>
      )}
    </div>
  ) : null
  );
});

const HtxTextAreaResultLine = forwardRef(({ idx, value, readOnly, onChange, onDelete, onFocus, validate, control, collapsed }, ref) => {
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

Registry.addTag('textarea', TextAreaModel, HtxTextArea);
Registry.addPerRegionView('textarea', PER_REGION_MODES.REGION_LIST, HtxTextAreaRegionView);

export { TextAreaModel, HtxTextArea };
