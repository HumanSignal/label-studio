import React from "react";
import arrayMove from "array-move";
import { List } from "antd";
import { SortableContainer, SortableElement, sortableHandle } from "react-sortable-hoc";
import { observer, inject } from "mobx-react";
import { types } from "mobx-state-tree";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";

const RankerItemModel = types
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
 * Ranker tag, used to ranking models
 * @example
 * <View>
 *   <Ranker name="ranker" value="$items"></Ranker>
 * </View>
 * @name Ranker
 * @param {string} name of group
 * @param {y|x=} [axis=y] axis direction
 * @param {string} sortedHighlightColor sorted color
 */
const TagAttrs = types.model({
  axis: types.optional(types.string, "y"),
  lockaxis: types.maybeNull(types.string),

  // elementvalue: types.maybeNull(types.string),
  elementtag: types.optional(types.string, "Text"),
  ranked: types.optional(types.boolean, true),
  sortable: types.optional(types.boolean, true),

  sortedhighlightcolor: types.maybeNull(types.string),

  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "ranker",
    update: types.optional(types.number, 1),

    regions: types.array(RankerItemModel),
    // update: types.optional(types.boolean, false)
  })
  .views(self => ({}))
  .actions(self => ({
    setUpdate() {
      self.update = self.update + 1;
    },

    _addRegion(val, idx) {
      const reg = RankerItemModel.create({
        value: val,
        idx: idx,
        _value: val,
      });

      self.regions.push(reg);
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
      return {
        from_name: self.name,
        to_name: self.name,
        value: {
          // weights: ranked,
          items: self.regions.map(r => r.value),
          selected: self.regions.map(r => r.selected),
        },
      };
    },

    fromStateJSON(obj, fromModel) {
      obj.value.items.forEach((v, idx) => {
        self._addRegion(v, idx);
      });

      self.setUpdate();
    },
  }));

const RankerModel = types.compose("RankerModel", TagAttrs, Model);

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

const HtxRankerView = observer(({ store, item }) => {
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

const HtxRanker = inject("store")(observer(HtxRankerView));

Registry.addTag("ranker", RankerModel, HtxRanker);

export { RankerModel, HtxRanker };
