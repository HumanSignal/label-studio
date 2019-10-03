import React, { Component } from "react";

import { observer, inject, Provider } from "mobx-react";
import { types, destroy, getEnv, flow, getParentOfType, getRoot } from "mobx-state-tree";

import { Form, Input, Button } from "antd";

import { renderChildren } from "../../core/Tree";
import { guidGenerator } from "../../core/Helpers";

import { HtxTextAreaRegion, TextAreaRegionModel } from "../object/TextAreaRegion";
import { ShortcutModel } from "../control/Shortcut";

import Registry from "../../core/Registry";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

import Tree from "../../core/Tree";
import Types from "../../core/Types";

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
      const toname = self.toname || self.name;

      return [
        self.regions.map(r => {
          return {
            id: r.pid,
            from_name: self.name,
            to_name: toname,
            type: self.type,
            value: {
              text: r._value,
            },
          };
        }),
      ];
    },

    fromStateJSON(obj, fromModel) {
      return self.addText(obj.value.text, obj.id);
    },
  }));

const TextAreaModel = types.compose(
  "TextAreaModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

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
            {rows == 1 ? <Input {...props} /> : <TextArea {...props} />}
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
