import React from "react";
import { observer, inject } from "mobx-react";
import { types, getRoot } from "mobx-state-tree";
import { Divider, Empty } from "antd";

import { guidGenerator } from "../../utils/unique";
import Registry from "../../core/Registry";
import DialogView from "../../components/Dialog/Dialog";
import { stringToColor, convertToRGBA } from "../../utils/colors";

/**
 * Dialog tag renders a dialog
 * @example
 * <View>
 *  <Dialog name="dialog" value="$dialog"></Dialog>
 * <View>
 * @param {string} name name of the element
 * @param {object} value value of the element
 */
const Replica = types.model({
  name: types.string,
  text: types.string,
  selected: types.optional(types.boolean, false),
  date: types.optional(types.string, ""),
  hint: types.optional(types.string, ""),
});

const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  name: types.maybeNull(types.string),
});

function DialogActions(self) {
  return {
    fromStateJSON(obj) {
      if (obj.value.choices) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      if (obj.value.text) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }
    },
  };
}

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "Dialog",
    data: types.map(Replica),
  })
  .views(self => ({
    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => DialogActions(self));

const DialogModel = types.compose("DialogModel", TagAttrs, Model);

const HtxDialogView = inject("store")(
  observer(({ store, item }) => {
    if (!store.task || !store.task.dataObj) {
      return <Empty />;
    }

    let result = [];
    let name = item.value;

    if (name.charAt(0) === "$") {
      name = name.substr(1);
    }

    store.task.dataObj[name].forEach((item, ind) => {
      let bgColor;

      if (item.name) {
        bgColor = convertToRGBA(stringToColor(item.name), 0.1);
      }

      result.push(
        <DialogView
          key={ind}
          name={item.name}
          hint={item.hint}
          text={item.text}
          selected={item.selected}
          date={item.date}
          id={item.id}
          bg={bgColor}
        />,
      );
    });

    return (
      <div>
        <div
          style={{
            display: "flex",
            flexFlow: "column",
            maxHeight: "500px",
            overflowY: "scroll",
            paddingRight: "10px",
            marginTop: "10px",
          }}
        >
          {result}
        </div>
        <Divider dashed={true} />
      </div>
    );
  }),
);

Registry.addTag("dialog", DialogModel, HtxDialogView);

export { DialogModel, HtxDialogView };
