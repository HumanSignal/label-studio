import React from 'react';
import { observer } from 'mobx-react';
import { getParentOfType, types } from 'mobx-state-tree';

import NormalizationMixin from '../mixins/Normalization';
import RegionsMixin from '../mixins/Regions';
import Registry from '../core/Registry';
import { TextAreaModel } from '../tags/control/TextArea/TextArea';
import { guidGenerator } from '../core/Helpers';

import styles from './TextAreaRegion/TextAreaRegion.module.scss';
import { HtxTextBox } from '../components/HtxTextBox/HtxTextBox';
import { FF_DEV_1566, FF_LSDV_4712, isFF } from '../utils/feature-flags';

const Model = types
  .model('TextAreaRegionModel', {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: 'textarearegion',

    _value: types.string,
    // states: types.array(types.union(ChoicesModel)),
  })
  .volatile(() => ({
    classification: true,
    perRegionTags: [],
    results: [],
    selected: false,
  }))
  .views(self => ({
    get parent() {
      return getParentOfType(self, TextAreaModel);
    },
    getRegionElement() {
      return document.querySelector(`#TextAreaRegion-${self.id}`);
    },
    getOneColor() {
      return null;
    },
  }))
  .actions(self => ({
    setValue(val) {
      if (isFF(FF_LSDV_4712) && (self._value === val || !self.parent.validateValue(val))) return;

      self._value = val;
      self.parent.onChange();
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

const TextAreaRegionModel = types.compose(
  'TextAreaRegionModel',
  RegionsMixin,
  NormalizationMixin,
  Model,
);

const HtxTextAreaRegionView = ({ item, onFocus }) => {
  const classes = [styles.mark];
  const params = { onFocus: e => onFocus(e, item) };
  const { parent } = item;
  const { relationMode } = item.annotation;
  const editable = parent.isEditable && !item.isReadOnly();
  const deleteable = parent.isDeleteable && !item.isReadOnly();

  if (relationMode) {
    classes.push(styles.relation);
  }

  if (item.selected) {
    classes.push(styles.selected);
  } else if (item.highlighted) {
    classes.push(styles.highlighted);
  }

  if (editable || parent.transcription) {
    params.onChange = str => {
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

  const name = `${parent?.name ?? ''}:${item.id}`;

  return (
    <div {...divAttrs} className={styles.row} data-testid="textarea-region">
      <HtxTextBox
        isEditable={editable}
        isDeleteable={deleteable}
        onlyEdit={parent.transcription}
        id={`TextAreaRegion-${item.id}`}
        name={name}
        className={classes.join(' ')}
        rows={parent.rows}
        text={item._value}
        {...params}
        ignoreShortcuts={isFF(FF_DEV_1566)}
      />
    </div>
  );
};

const HtxTextAreaRegion = observer(HtxTextAreaRegionView);

Registry.addTag('textarearegion', TextAreaRegionModel, HtxTextAreaRegion);

export { TextAreaRegionModel, HtxTextAreaRegion };
