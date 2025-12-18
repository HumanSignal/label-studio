import { observer } from "mobx-react";
import { types, getParent } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
// import { CustomTagModel } from "../tags/Custom";
import { guidGenerator } from "../core/Helpers";

import { HtxTextBox } from "../components/HtxTextBox/HtxTextBox";
import { cn } from "../utils/bem";

const Model = types
  .model("CustomRegionModel", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: "customregion",

    _value: types.frozen(),
    // states: types.array(types.union(ChoicesModel)),
  })
  .volatile(() => ({
    classification: true,
    perRegionTags: [],
    results: [],
    selected: false,
  }))
  .views((self) => ({
    get parent() {
      // Since getParentOfType might not work, we'll use getParent which should work
      // for any MobX parent-child relationship
      return getParent(self);
    },
    getRegionElement() {
      return document.querySelector(`#CustomRegion-${self.id}`);
    },
    getOneColor() {
      return null;
    },
  }))
  .actions((self) => ({
    setValue(val) {
      if (self._value === val || !self.parent.validateText(val)) return;

      self._value = val;
      self.parent.onChange();
    },

    updateValue(newValue) {
      // This is the sanctioned way to update the region's value
      // from an external component like the POC UI.
      self._value = newValue;
      // Also notify the parent about the change so it can update results
      if (self.parent.updateResult) {
        self.parent.updateResult();
      }
    },

    deleteRegion() {
      self.parent.remove(self);
    },

    selectRegion() {
      self.selected = true;
    },

    afterUnselectRegion() {
      self.selected = false;
    },
  }));

const CustomRegionModel = types.compose("CustomRegionModel", RegionsMixin, NormalizationMixin, Model);

const HtxCustomRegionView = ({ item, onFocus }) => {
  const classes = [styles.mark];
  const params = { onFocus: (e) => onFocus(e, item) };
  const { parent } = item;
  const { relationMode } = item.annotation;
  const editable = parent.isEditable && !item.isReadOnly();
  const deletable = parent.isDeletable && !item.isReadOnly();

  if (relationMode) {
    classes.push(styles.relation);
  }

  if (item.selected) {
    classes.push(styles.selected);
  } else if (item.highlighted) {
    classes.push(styles.highlighted);
  }

  if (editable || parent.transcription) {
    params.onChange = (str) => {
      item.setValue(str);
      item.parent.updateLeadTime();
    };
    params.onInput = () => {
      item.parent.countTime();
    };
  }

  params.onDelete = item.deleteRegion;

  let divAttrs = {};

  if (!parent.perregion) {
    divAttrs = {
      onMouseOver: () => {
        if (relationMode) {
          item.setHighlight(true);
        }
      },
      onMouseOut: () => {
        /* range.setHighlight(false); */
        if (relationMode) {
          item.setHighlight(false);
        }
      },
    };
  }

  const name = `${parent?.name ?? ""}:${item.id}`;

  return (
    <div {...divAttrs} className={cn("row").toString()} data-testid="custom-region">
      <HtxTextBox
        isEditable={editable}
        isDeletable={deletable}
        onlyEdit={parent.transcription}
        id={`CustomRegion-${item.id}`}
        name={name}
        className={classes.join(" ")}
        rows={parent.rows}
        text={item._value}
        {...params}
        ignoreShortcuts={true}
      />
    </div>
  );
};

const HtxCustomRegion = observer(HtxCustomRegionView);

Registry.addTag("customregion", CustomRegionModel, HtxCustomRegion);
Registry.addRegionType(CustomRegionModel, "custominterface");

export { CustomRegionModel, HtxCustomRegion };
