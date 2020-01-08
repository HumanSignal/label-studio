import { types, destroy } from "mobx-state-tree";

import { AllRegionsType } from "../regions";

/**
 * Relation between two different nodes
 */
const Relation = types
  .model("Relation", {
    node1: types.reference(AllRegionsType),
    node2: types.reference(AllRegionsType),
  })
  .actions(self => ({
    toggleHighlight() {
      if (self.node1 === self.node2) {
        self.node1.toggleHightlight();
      } else {
        self.node1.toggleHightlight();
        self.node2.toggleHightlight();
      }
    },
  }));

export default types
  .model("RelationStore", {
    relations: types.array(Relation),
  })
  .actions(self => ({
    findRelations(node1, node2) {
      if (!node2) {
        return self.relations.filter(rl => {
          return rl.node1.id === node1.id || rl.node2.id === node1.id;
        });
      }

      return self.relations.filter(rl => {
        return rl.node1.id === node1.id && rl.node2.id === node2.id;
      });
    },

    nodesRelated(node1, node2) {
      return self.findRelations(node1, node2).length > 0;
    },

    addRelation(node1, node2) {
      if (self.nodesRelated(node1, node2)) return;

      const rl = Relation.create({
        node1: node1,
        node2: node2,
      });

      // self.relations.unshift(rl);
      self.relations.push(rl);

      return rl;
    },

    deleteRelation(rl) {
      destroy(rl);
    },

    deleteNodeRelation(node) {
      // lookup $node and delete it's relation
      const rl = self.findRelations(node);
      rl.length && rl.forEach(self.deleteRelation);
    },

    serializeCompletion() {
      return self.relations.map(r => {
        return {
          from_id: r.node1.pid,
          to_id: r.node2.pid,
          type: "relation",
        };
      });
    },

    deserializeRelation(node1, node2) {
      self.addRelation(node1, node2);
    },
  }));
