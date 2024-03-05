import { destroy, getParentOfType, getRoot, isAlive, types } from 'mobx-state-tree';

import { guidGenerator } from '../core/Helpers';
import Tree, { TRAVERSE_SKIP } from '../core/Tree';
import Area from '../regions/Area';
import { isDefined } from '../utils/utilities';

/**
 * Relation between two different nodes
 */
const Relation = types
  .model('Relation', {
    id: types.optional(types.identifier, guidGenerator),

    node1: types.reference(Area),
    node2: types.reference(Area),

    direction: types.optional(types.enumeration(['left', 'right', 'bi']), 'right'),

    // labels
    labels: types.maybeNull(types.array(types.string)),
  })
  .volatile(() => ({
    showMeta: false,
    visible: true,
  }))
  .views(self => ({
    get parent() {
      return getParentOfType(self, RelationStore);
    },

    get control() {
      return self.parent.control;
    },

    get selectedValues() {
      return self.labels?.filter(relationLabel => {
        return self.control?.values.includes(relationLabel);
      });
    },

    get hasRelations() {
      return self.control?.children?.length > 0;
    },

    get shouldRender() {
      if (!isAlive(self)) return false;
      const { node1: start, node2: end } = self;
      const [sIdx, eIdx] = [start.item_index, end.item_index];

      // as we don't currently have a unified solution for multi-object segmentation
      // and the Image tag is the only one to support it, we rely on its API
      // TODO: make multi-object solution more generic
      if (isDefined(sIdx) &&
          start.object.multiImage && 
          sIdx !== start.object.currentImage) return false;

      if (isDefined(eIdx) &&
          end.object.multiImage && 
          eIdx !== end.object.currentImage) return false;

      return true;
    },
  }))
  .actions(self => ({
    rotateDirection() {
      const d = ['left', 'right', 'bi'];
      let idx = d.findIndex(item => item === self.direction);

      idx = idx + 1;
      if (idx >= d.length) idx = 0;

      self.direction = d[idx];
    },

    toggleHighlight() {
      if (self.node1 === self.node2) {
        self.node1.toggleHighlight();
      } else {
        self.node1.toggleHighlight();
        self.node2.toggleHighlight();
      }
    },

    toggleMeta() {
      self.showMeta = !self.showMeta;
    },

    setSelfHighlight(highlighted = false) {
      if (highlighted) {
        self.parent.setHighlight(self);
      } else {
        self.parent.removeHighlight();
      }
    },

    toggleVisibility() {
      self.visible = !self.visible;
    },

    setRelations(values) {
      self.labels = values;
    },
  }));

const RelationStore = types
  .model('RelationStore', {
    relations: types.array(Relation),
  })
  .volatile(() => ({
    showConnections: true,
    _highlighted: null,
    control: null,
  }))
  .views(self => ({
    get highlighted() {
      return self.relations.find(r => r.id === self._highlighted);
    },
    get size() {
      return self.relations.length;
    },
    get values() {
      return self.control?.values ?? [];
    },
  }))
  .actions(self => ({
    afterAttach() {
      const appStore = getRoot(self);

      // find <Relations> tag in the tree
      let relationsTag = null;

      Tree.traverseTree(appStore.annotationStore.root, function(node) {
        if (node.type === 'relations') {
          relationsTag = node;
          return TRAVERSE_SKIP;
        }
      });
      self.setControl(relationsTag);
    },
    setControl(relationsTag) {
      self.control = relationsTag;
    },
    findRelations(node1, node2) {
      const id1 = node1.id || node1;
      const id2 = node2?.id || node2;

      if (!id2) {
        return self.relations.filter(rl => {
          return rl.node1.id === id1 || rl.node2.id === id1;
        });
      }

      return self.relations.filter(rl => {
        return rl.node1.id === id1 && rl.node2.id === id2;
      });
    },

    nodesRelated(node1, node2) {
      return self.findRelations(node1, node2).length > 0;
    },

    addRelation(node1, node2) {
      if (self.nodesRelated(node1, node2)) return;

      const rl = Relation.create({ node1, node2 });

      // self.relations.unshift(rl);
      self.relations.push(rl);

      return rl;
    },

    deleteRelation(rl) {
      self.relations = self.relations.filter(r => r.id !== rl.id);
      destroy(rl);
    },

    deleteNodeRelation(node) {
      // lookup $node and delete it's relation
      const rl = self.findRelations(node);

      rl.length && rl.forEach(self.deleteRelation);
    },

    deleteAllRelations() {
      self.relations.forEach(rl => destroy(rl));
      self.relations = [];
    },

    serialize() {
      return self.relations.map(r => {
        const s = {
          from_id: r.node1.cleanId,
          to_id: r.node2.cleanId,
          type: 'relation',
          direction: r.direction,
        };

        if (r.selectedValues) s['labels'] = r.selectedValues;

        return s;
      });
    },

    deserializeRelation(node1, node2, direction, labels) {
      const rl = self.addRelation(node1, node2);

      if (!rl) return; // duplicated relation

      rl.direction = direction;
      rl.labels = labels;
    },

    toggleConnections() {
      self.showConnections = !self.showConnections;
    },

    setHighlight(relation) {
      self._highlighted = relation.id;
    },

    removeHighlight() {
      self._highlighted = null;
    },
  }));

export default RelationStore;
