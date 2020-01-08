import React from "react";
import arrayMove from "array-move";
import { List } from "antd";
import { SortableContainer, SortableElement, sortableHandle } from "react-sortable-hoc";
import { observer, inject } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import { variableNotation } from "../../core/Template";

const ListItemModel = types
  .model({
    backgroundColor: types.optional(types.string, "transparent"),
    value: types.maybeNull(types.string),
    _value: types.maybeNull(types.string),
    selected: types.optional(types.boolean, false),
    idx: types.number,
  })
  .views(self => ({}))
  .actions(self => ({
    setBG(val) {
      self.backgroundColor = val;
    },

    setIdx(idx) {
      self.idx = idx;
    },

    setSelected(val) {
      self.selected = val;
    },
  }));

/**
 * List element, used for ranking results. Great choice for recomendation systems.
 * @example
 * <View>
 *  <HyperText value="$markup"></HyperText>
 *  <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" ranked="true" sortedHighlightColor="#fcfff5"></List>
 * </View>
 * @name List
 * @param {string} elementValue lookup key for child object
 * @param {Text|Image|Audio} elementTag element used to render children
 * @param {string} value list value
 * @param {string} name of group
 * @param {string=} sortedHighlightColor color
 * @param {string=} axis axis used for drag-n-drop
 * @param {string=} lockAxis lock axis
 */
const TagAttrs = types.model({
  axis: types.optional(types.string, "y"),
  lockaxis: types.maybeNull(types.string),

  elementvalue: types.maybeNull(types.string),
  elementtag: types.optional(types.string, "Text"),
  // ranked: types.optional(types.string, "true"),
  // sortable: types.optional(types.string, "true"),

  sortedhighlightcolor: types.maybeNull(types.string),

  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "list",
    update: types.optional(types.number, 1),

    regions: types.array(ListItemModel),
    // update: types.optional(types.boolean, false)
  })
  .views(self => ({}))
  .actions(self => ({
    setUpdate() {
      self.update = self.update + 1;
    },

    addRegion(vals, idx) {
      const reg = ListItemModel.create({
        value: self.elementvalue,
        idx: idx,
        _value: variableNotation(self.elementvalue, vals[idx]),
      });

      self.regions.push(reg);
    },

    updateValue(store) {
      const val = variableNotation(self.value, store.task.dataObj);

      // in case we're in expert mode it will call updateValue
      // on each new task loaded, therefore we need to remove
      // previously loaded regions here
      self.regions = [];
      val.forEach((v, idx) => self.addRegion(val, idx));

      val.forEach((v, idx) => {
        v["_orig_idx"] = idx;
      });

      self._value = val;
      self.setUpdate();
    },

    moveItems({ oldIndex, newIndex }) {
      if (oldIndex === newIndex) return;

      if (self.sortedhighlightcolor) {
        self.regions[oldIndex].setBG(self.sortedhighlightcolor);
      }

      self.regions[oldIndex].setSelected(true);

      if (self._value) self._value = arrayMove(self._value, oldIndex, newIndex);

      self.regions = arrayMove(self.regions, oldIndex, newIndex);
      self.setUpdate();
    },

    toStateJSON() {
      const map = {};

      self._value.forEach((v, idx) => {
        map[self.regions[idx].idx] = 1 / (1 + idx);
      });

      const ranked = Object.keys(map)
        .sort((a, b) => a - b)
        .map(function(v) {
          return map[v];
        });

      const selected = [];
      for (let i = 0; i < Object.keys(map).length; i++) {
        selected[self.regions[i].idx] = self.regions[i].selected ? 1 : 0;
      }

      return {
        from_name: self.name,
        to_name: self.name,
        value: {
          weights: ranked,
          selected: selected,
        },
      };
    },

    fromStateJSON(obj, fromModel) {
      const ranked = [];
      const regions = [];
      const item_weight = {};

      obj.value.weights.forEach((v, idx) => {
        if (item_weight[v]) {
          item_weight[v].push(idx);
        } else {
          item_weight[v] = [idx];
        }
      });

      Object.keys(item_weight)
        .sort((a, b) => b - a)
        .forEach(v => {
          const idxes = item_weight[v];
          idxes.forEach(idx => {
            regions.push(self.regions[idx]);
            ranked.push(self._value[idx]);
          });
        });

      regions.forEach((r, idx) => r.setIdx(idx));

      self._value = ranked;
      self.regions = regions;

      // self.regions = ranked;
      self.setUpdate();
    },
  }));

const ListModel = types.compose("ListModel", TagAttrs, Model);

const DragHandle = sortableHandle(() => <div className="drag-handle"></div>);

function isMobileDevice() {
  try {
    return typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;
  } catch (e) {
    return false;
  }
}

const SortableText = SortableElement(({ item, value }) => {
  let classNames;
  if (isMobileDevice) {
    classNames = "noselect";
  }

  const map = {
    text: v => <span className={classNames}>{v._value}</span>,
    image: v => <img src={v._value} alt="" />,
    audio: v => <audio src={v._value} />,
  };

  return (
    <div
      style={{
        padding: "1em",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        background: value.selected ? item.sortedhighlightcolor : "transparent",
      }}
      className={classNames}
      onClick={ev => {
        if (value.selected) {
          value.setSelected(false);
          item.setUpdate();
        } else {
          value.setSelected(true);
          item.setUpdate();
        }
        ev.preventDefault();
        return false;
      }}
    >
      <DragHandle />
      {map[item.elementtag.toLowerCase()](value)}
    </div>
  );
});

const SortableList = SortableContainer(({ item, items }) => {
  return (
    <List celled>
      {items.map((value, index) => (
        <SortableText
          key={`item-${index}`}
          index={index}
          value={value}
          color={value.backgroundColor}
          item={item}
          onClick={ev => {}}
        />
      ))}
    </List>
  );
});

const HtxListView = observer(({ store, item }) => {
  const props = {};
  if (isMobileDevice()) {
    props["pressDelay"] = 100;
  } else {
    props["distance"] = 7;
  }

  return (
    <div>
      <SortableList update={item.update} item={item} items={item.regions} onSortEnd={item.moveItems} {...props} />
    </div>
  );
});

const HtxList = inject("store")(observer(HtxListView));

Registry.addTag("list", ListModel, HtxList);

export { ListModel, HtxList };
