import { createRef, useCallback } from "react";
import { Button, Typography } from "@humansignal/ui";
import { Form, Input } from "antd";
import { observer } from "mobx-react";
import { destroy, isAlive, types } from "mobx-state-tree";
import { IconPlus } from "@humansignal/icons";

import InfoModal from "../../../components/Infomodal/Infomodal";
import Registry from "../../../core/Registry";
import Tree from "../../../core/Tree";
import Types from "../../../core/Types";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import LeadTimeMixin from "../../../mixins/LeadTime";
import PerItemMixin from "../../../mixins/PerItem";
import PerRegionMixin, { PER_REGION_MODES } from "../../../mixins/PerRegion";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";
import { ReadOnlyControlMixin } from "../../../mixins/ReadOnlyMixin";
import RequiredMixin from "../../../mixins/Required";
import { HtxTextAreaRegion, TextAreaRegionModel } from "../../../regions/TextAreaRegion";
import { FF_LEAD_TIME, FF_LSDV_4583, isFF } from "../../../utils/feature-flags";
import ControlBase from "../Base";
import ClassificationBase from "../ClassificationBase";
import "./TextAreaRegionView";
import VisibilityMixin from "../../../mixins/Visibility";

import "./TextArea.scss";
import { cn } from "../../../utils/bem";

const { TextArea } = Input;

/**
 * The `TextArea` tag is used to display a text area for user input. Use for transcription, paraphrasing, or captioning tasks.
 *
 * Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.
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
 *  You can keep submissions unique.
 * -->
 * <View>
 *   <Audio name="audio" value="$audio"/>
 *   <TextArea name="genre" toName="audio" skipDuplicates="true" />
 * </View>
 * @name TextArea
 * @meta_title Textarea Tag for Text areas
 * @meta_description Customize Label Studio with the TextArea tag to support audio transcription, image captioning, and OCR tasks for machine learning and data science projects
 * @param {string} name                    - Name to identify the TextArea
 * @param {string} toName                  - Name assigned to the object tag that the TextArea is labeling
 * @param {string} [value]                 - A pre-filled default value that appears within the rendered TextArea field and can be submitted
 * @param {string=} [placeholder]          - Placeholder text that appears inside the rendered TextArea field, but unlike `value` it cannot be submitted
 * @param {string=} [maxSubmissions]       - Maximum number of submissions
 * @param {boolean=} [editable=false]      - Whether to display an icon that allows the annotator to edit their text after adding it
 * @param {boolean=} [transcription=false] - When set to true and used with `editable="true"`, the TextArea UI will remain an editable field even after you add your text
 * @param {boolean} [skipDuplicates=false] - When set to true, a pop-up warning will appear and prevent duplicate values. See [the example below](#Example-Enforce-unique-values)
 * @param {tag|region-list} [displayMode=tag] - Display mode for the TextArea; when set to `region-list` there will be an input field for every region in the Regions panel. See [the example below](#Example-Region-list-TextArea-fields)
 * @param {number} [rows=1]                - Number of rows in the TextArea input field. If `1`, you can submit text by pressing Enter. If greater than `1`, you can submit text by clicking **Add** or pressing Shift + Enter
 * @param {boolean} [required=false]       - Determine whether content in TextArea is required
 * @param {string} [requiredMessage]       - Message to show if validation fails
 * @param {boolean=} [showSubmitButton]    - Determine whether to show or hide the **Add** button. By default it's hidden if `rows="1"`, and it's visible if there are more than 1 row
 * @param {boolean} [perRegion]            - Use this tag to label regions instead of whole objects
 * @param {boolean} [perItem]              - Use this tag to label items inside objects instead of whole objects
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),
  allowsubmit: types.optional(types.boolean, true),
  label: types.optional(types.string, ""),
  value: types.maybeNull(types.string),
  rows: types.optional(types.string, "1"),
  showsubmitbutton: types.maybeNull(types.boolean),
  placeholder: types.maybeNull(types.string),
  maxsubmissions: types.maybeNull(types.string),
  editable: types.optional(types.boolean, false),
  transcription: false,
  skipduplicates: types.optional(types.boolean, false),
});

const Model = types
  .model({
    type: "textarea",
    // @todo rename to textarearegions to avoid confusion, they are not real regions or results
    regions: types.array(TextAreaRegionModel),
    _value: types.optional(types.string, ""),
    children: Types.unionArray(["shortcut"]),
  })
  .volatile(() => {
    return {
      focusable: true,
      textareaRef: createRef(),
    };
  })
  .views((self) => ({
    get isEditable() {
      return self.editable && self.annotation.editable;
    },

    get isDeleteable() {
      return !self.isReadOnly();
    },

    get valueType() {
      return "text";
    },

    get holdsState() {
      return self.regions.length > 0;
    },

    get submissionsNum() {
      return self.regions.length;
    },

    get showSubmit() {
      if (self.maxsubmissions) {
        const num = Number.parseInt(self.maxsubmissions);

        return self.submissionsNum < num;
      }
      return true;
    },

    // @todo not used?
    get serializableValue() {
      if (!self.regions.length) return null;
      return { text: self.selectedValues() };
    },

    // Main and only method to update value in actual result produced by TextArea
    selectedValues() {
      return self.regions.map((r) => r._value);
    },

    hasResult(text) {
      if (!self.result) return false;
      let value = self.result.mainValue;
      const normalized = text.toLowerCase();

      if (!Array.isArray(value)) value = [value];
      return value.some((val) => val.toLowerCase() === normalized);
    },
  }))
  .actions(() => (isFF(FF_LEAD_TIME) ? {} : { countTime: () => {} }))
  .actions((self) => {
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
      // @todo not used?
      getSerializableValue() {
        const texts = self.regions.map((s) => s._value);

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
        InfoModal.warning("There is already an entry with that text. Please enter unique text.");
      },

      setResult(value) {
        const values = Array.isArray(value) ? value : [value];

        for (const v of values) self.createRegion(v);
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
        self.onChange(region);
      },

      createRegion(text, pid, leadTime) {
        const r = TextAreaRegionModel.create({ pid, leadTime, _value: text });

        self.regions.push(r);
        return r;
      },

      onChange(area) {
        self.updateResult();
        const currentArea = area ?? self.result?.area;

        currentArea?.notifyDrawingFinished();
      },

      validateText(text) {
        if (self.skipduplicates && self.hasResult(text)) {
          self.uniqueModal();
          return false;
        }
        return true;
      },

      addText(text, pid) {
        if (!self.validateText(text)) return;

        self.createRegion(text, pid, self.leadTime);
        // actually creates a new result
        self.onChange();

        // should go after `onChange` because it uses result and area
        self.updateLeadTime();
      },

      /**
       * `lead_time` should be stored inside connected results,
       *   we shouldn't store it in TextAreaRegions,
       *   because TextAreaRegions are not safe, they can be rewritten
       *   on undo/redo, on switching annotations, on switching regions...
       * After adding lead_time to the result, we should reset all lead_time numbers
       */
      updateLeadTime() {
        if (!isFF(FF_LEAD_TIME)) return;

        const result = self.result;

        if (!result) return;

        // add current stored leadTime to the main stored lead_time
        result.setMetaValue("lead_time", (result.meta?.lead_time ?? 0) + self.leadTime / 1000);

        self.leadTime = 0;
        self.resetLeadTimeCounters();
      },

      addTextToResult(text, result) {
        if (!self.validateText(text)) return;

        const newValue = result.mainValue.toJSON();

        newValue.push(text);
        result.setValue(newValue);
      },

      beforeSend() {
        if (self._value?.length && self.showSubmit) {
          self.addText(self._value);
          self._value = "";
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
        if (!isAvailableElement(lastActiveElement, lastActiveElementModel)) {
          // Try to use main textarea element
          const textareaElement =
            self.textareaRef.current?.input || self.textareaRef.current?.resizableTextArea?.textArea;

          if (isAvailableElement(textareaElement, self)) {
            lastActiveElement = textareaElement;
            lastActiveElementModel = self;
          } else {
            return;
          }
        }
        lastActiveElement.setRangeText(value, lastActiveElement.selectionStart, lastActiveElement.selectionEnd, "end");
        lastActiveElementModel.setValue(lastActiveElement.value);
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
  "TextAreaModel",
  ControlBase,
  ClassificationBase,
  TagAttrs,
  ...(isFF(FF_LEAD_TIME) ? [LeadTimeMixin] : []),
  ProcessAttrsMixin,
  RequiredMixin,
  PerRegionMixin,
  ...(isFF(FF_LSDV_4583) ? [PerItemMixin] : []),
  AnnotationMixin,
  ReadOnlyControlMixin,
  Model,
  VisibilityMixin,
);

const HtxTextArea = observer(({ item }) => {
  const rows = Number.parseInt(item.rows);
  const onFocus = useCallback(
    (ev, model) => {
      item.setLastFocusedElement(ev.target, model);
    },
    [item],
  );

  // Helper function for pluralization
  const pluralize = (count, singular, plural) => (count === 1 ? singular : plural);

  const props = {
    name: item.name,
    value: item._value,
    rows: item.rows,
    className: "is-search",
    label: item.label,
    placeholder: item.placeholder,
    disabled: item.isReadOnly(),
    readOnly: item.isReadOnly(),
    onChange: (ev) => {
      if (item.annotation.isReadOnly()) return;
      const { value } = ev.target;

      item.setValue(value);
    },
    onFocus,
    ref: item.textareaRef,
    onKeyPress: item.countTime,
    onKeyDown: item.countTime,
    onKeyUp: item.countTime,
    onMouseDown: item.countTime,
    onMouseUp: item.countTime,
    onMouseMove: (ev) => (ev.button || ev.buttons) && item.countTime(),
  };

  if (rows > 1) {
    // allow to add multiline text with shift+enter
    props.onKeyDown = (e) => {
      if (e.key === "Enter" && e.shiftKey && item.allowsubmit && item._value && !item.annotation.isReadOnly()) {
        e.preventDefault();
        e.stopPropagation();
        item.addText(item._value);
        item.setValue("");
      } else {
        item.countTime();
      }
    };
  }

  const visibleStyle = item.perRegionVisible() ? {} : { display: "none" };

  const showAddButton = !item.isReadOnly() && (item.showsubmitbutton ?? rows !== 1);
  const itemStyle = {};
  const textareaClassName = cn("text-area").toClassName();

  if (showAddButton) itemStyle.marginBottom = 0;

  visibleStyle.marginTop = "4px";

  return item.displaymode === PER_REGION_MODES.TAG ? (
    <div className={textareaClassName} style={visibleStyle} ref={item.elementRef} data-testid="textarea-control">
      {Tree.renderChildren(item, item.annotation)}

      {item.showSubmit && (
        <Form
          onFinish={() => {
            if (item.allowsubmit && item._value && !item.annotation.isReadOnly()) {
              item.addText(item._value);
              item.setValue("");
            }

            return false;
          }}
          data-testid="textarea-form"
        >
          <Form.Item style={itemStyle}>
            {rows === 1 ? (
              <Input {...props} aria-label="TextArea Input" data-testid="textarea-input" />
            ) : (
              <TextArea {...props} aria-label="TextArea Input" data-testid="textarea-input" />
            )}
            {showAddButton && (
              <div
                className="flex items-center justify-between gap-tight w-full mb-tighter"
                data-testid="textarea-submit-section"
              >
                {/* Counts on the left */}
                <div
                  className="flex items-center gap-base"
                  aria-live="polite"
                  aria-atomic="true"
                  data-testid="textarea-counts"
                >
                  {/* Character count */}
                  <Typography
                    size="small"
                    className="text-neutral-content-subtler"
                    data-testid="textarea-character-count"
                  >
                    {item._value?.length ?? 0} {pluralize(item._value?.length ?? 0, "character", "characters")}
                  </Typography>

                  {/* Region count - use submissionsNum computed view */}
                  {(item.submissionsNum > 0 || item.maxsubmissions) && (
                    <>
                      <Typography size="small" className="text-neutral-content-subtler" aria-hidden="true">
                        •
                      </Typography>
                      <Typography
                        size="small"
                        className="text-neutral-content-subtler"
                        data-testid="textarea-submission-count"
                      >
                        {item.submissionsNum}
                        {item.maxsubmissions && ` / ${item.maxsubmissions}`}{" "}
                        {pluralize(item.submissionsNum, "submission", "submissions")}
                      </Typography>
                    </>
                  )}
                </div>

                {/* Instruction text and Add button on the right */}
                <div className="flex items-center gap-base">
                  {/* Show instruction for multiline textarea */}
                  {rows > 1 && (
                    <Typography
                      size="small"
                      className="text-neutral-content-subtler italic"
                      data-testid="textarea-instruction"
                    >
                      Press Shift + Enter to Add
                    </Typography>
                  )}

                  {/* Add button */}
                  <Form.Item>
                    <Button
                      size="small"
                      variant="primary"
                      look="outlined"
                      leading={<IconPlus />}
                      className="w-20 px-tight"
                      htmlType="submit"
                      data-testid="textarea-add-button"
                    >
                      Add
                    </Button>
                  </Form.Item>
                </div>
              </div>
            )}
          </Form.Item>
        </Form>
      )}

      {item.regions.length > 0 && (
        <div style={{ marginBottom: "1em" }} data-testid="textarea-regions">
          {item.regions.map((t) => (
            <HtxTextAreaRegion key={t.id} item={t} onFocus={onFocus} />
          ))}
        </div>
      )}
    </div>
  ) : null;
});

Registry.addTag("textarea", TextAreaModel, HtxTextArea);

export { TextAreaModel, HtxTextArea };
