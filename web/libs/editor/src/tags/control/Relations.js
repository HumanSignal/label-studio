import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import Types from '../../core/Types';
import { guidGenerator } from '../../core/Helpers';

/**
 * The `Relations` tag is used to create label relations between regions. Use to provide many values to apply to the relationship between two labeled regions.
 *
 * Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.
 * @example
 * <!--Basic labeling configuration to apply the label "similar" or "dissimilar" to a relation identified between two labeled regions of text -->
 * <View>
 *   <Relations>
 *     <Relation value="similar" />
 *     <Relation value="dissimilar" />
 *   </Relations>
 *
 *   <Text name="txt-1" value="$text" />
 *   <Labels name="lbl-1" toName="txt-1">
 *     <Label value="Relevant" />
 *     <Label value="Not Relevant" />
 *   </Labels>
 * </View>
 * @name Relations
 * @meta_title Relations Tag for Multiple Relations
 * @meta_description Customize Label Studio by adding labels to relationships between labeled regions for machine learning and data science projects.
 * @param {single|multiple=} [choice=single] Configure whether you can select one or multiple labels
 */
const TagAttrs = types.model({
  choice: types.optional(types.enumeration(['single', 'multiple']), 'multiple'),
});

/**
 * @param {boolean} showinline
 * @param {identifier} id
 * @param {string} pid
 */
const ModelAttrs = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    type: 'relations',
    children: Types.unionArray(['relation']),
  })
  .views(self => ({
    get values() {
      return self.children.map(c => c.value);
    },
    findRelation(value) {
      return self.children.find(c => c.value === value);
    },
  }))
  .actions(() => ({
  }));

const RelationsModel = types.compose('RelationsModel', ModelAttrs, TagAttrs);

const HtxRelations = () => {
  return null;
};

Registry.addTag('relations', RelationsModel, HtxRelations);

export { HtxRelations, RelationsModel };
