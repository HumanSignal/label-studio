import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import Constants from '../../core/Constants';
import { guidGenerator } from '../../core/Helpers';
import { customTypes } from '../../core/CustomTypes';

/**
 * The `Relation` tag represents a single relation label. Use with the `Relations` tag to specify the value of a label to apply to a relation between regions.
 *
 * @example
 * <!--Basic labeling configuration to apply the label "similar" to a relation identified between two labeled regions of text -->
 * <View>
 *   <Relations>
 *     <Relation value="similar" />
 *   </Relations>
 *
 *   <Text name="txt-1" value="$text" />
 *   <Labels name="lbl-1" toName="txt-1">
 *     <Label value="Relevant" />
 *     <Label value="Not Relevant" />
 *   </Labels>
 * </View>
 * @name Relation
 * @meta_title Relation Tag for a Single Relation
 * @meta_description Customize Label Studio by using the Relation tag to add a single consistent label to relations between regions in machine learning and data science projects.
 * @param {string} value        - Value of the relation
 * @param {string} [background] - Background color of the active label in hexadecimal
 */
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  background: types.optional(customTypes.color, Constants.RELATION_BACKGROUND),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: 'relation',
  })
  .actions(() => ({
  }));

const RelationModel = types.compose('RelationModel', TagAttrs, Model);

const HtxRelationView = () => {
  return null;
};

Registry.addTag('relation', RelationModel, HtxRelationView);

export { HtxRelationView, RelationModel };
