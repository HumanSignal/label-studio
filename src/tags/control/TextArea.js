import React from "react";
import { Form, Input, Button } from "antd";
import { observer } from "mobx-react";
import { types, destroy, getRoot } from "mobx-state-tree";

import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import Registry from "../../core/Registry";
import Tree from "../../core/Tree";
import Types from "../../core/Types";
import { HtxTextAreaRegion, TextAreaRegionModel } from "../../regions/TextAreaRegion";
import { ShortcutModel } from "./Shortcut";
import { guidGenerator } from "../../core/Helpers";

const { TextArea } = Input;

/**
 * TextArea tag shows the textarea for user input
 * @example
 * <View>
 *   <TextArea name="ta"></TextArea>
 * </View>
 * @name TextArea
 * @param {string} name name of the element
 * @param {string} toName name of the element that you want to label if any
 * @param {string} value
 * @param {string=} label label text
 * @param {string=} placeholder placeholder text
 * @param {string=} maxSubmissions maximum number of submissions
 */
const TagAttrs = types.model({
  allowSubmit: types.optional(types.boolean, true),
  label: types.optional(types.string, ""),
  name: types.maybeNull(types.string),
  toname: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  rows: types.optional(types.string, "1"),
  showsubmitbutton: types.optional(types.boolean, false),
  placeholder: types.maybeNull(types.string),
  maxsubmissions: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "textarea",
    regions: types.array(TextAreaRegionModel),

    _value: types.optional(types.string, ""),
    children: Types.unionArray(["shortcut"]),
  })
  .views(self => ({
    get submissionsNum() {
      return self.regions.length;
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    get showSubmit() {
      if (self.maxsubmissions) {
        const num = parseInt(self.maxsubmissions);
        return self.submissionsNum < num;
      } else {
        return true;
      }
    },
  }))
  .actions(self => ({
    setValue(value) {
      self._value = value;
    },

    addText(text, pid) {
      const r = TextAreaRegionModel.create({
        pid: pid,
        _value: text,
      });

      self.regions.push(r);
      self.completion.addRegion(r);

      return r;
    },

    beforeSend() {
      if (self._value && self._value.length) {
        self.addText(self._value);
      }
    },

    deleteText(text) {
      destroy(text);
    },

    onShortcut(value) {
      self.setValue(self._value + value);
    },

    toStateJSON() {
      return self.regions.map(r => r.toStateJSON());
    },

    fromStateJSON(obj, fromModel) {
      return self.addText(obj.value.text, obj.id);
    },
  }));

const TextAreaModel = types.compose("TextAreaModel", TagAttrs, Model, ProcessAttrsMixin);

const HtxTextArea = observer(({ item }) => {
  const rows = parseInt(item.rows);

  const props = {
    name: item.name,
    value: item._value,
    rows: item.rows,
    className: "is-search",
    label: item.label,
    placeholder: item.placeholder,
    onChange: ev => {
      const { value } = ev.target;
      item.setValue(value);
    },
  };

  if (!item.completion.edittable) props["disabled"] = true;

  return (
    <div>
      {Tree.renderChildren(item)}

      {item.showSubmit && (
        <Form
          onSubmit={ev => {
            if (item.allowSubmit) {
              item.addText(item._value);
              item.setValue("");
            }

            ev.preventDefault();
            return false;
          }}
        >
          <Form.Item>
            {rows === 1 ? <Input {...props} /> : <TextArea {...props} />}
            {(rows != 1 || item.showSubmitButton) && (
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Add
                </Button>
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      )}

      {item.regions.length > 0 && (
        <div style={{ marginBottom: "1em" }}>
          {item.regions.map(t => (
            <HtxTextAreaRegion item={t} />
          ))}
        </div>
      )}
    </div>
  );
});

Registry.addTag("textarea", TextAreaModel, HtxTextArea);

export { TextAreaModel, HtxTextArea };
