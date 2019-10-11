import { types, getParent, getEnv, flow, destroy } from "mobx-state-tree";

import { guidGenerator } from "../core/Helpers";
import Types from "../core/Types";

import Registry from "../core/Registry";
import Tree from "../core/Tree";
import TimeTraveller from "../core/TimeTraveller";

import RelationStore from "./RelationStore";
import NormalizationStore from "./NormalizationStore";
import RegionStore from "./RegionStore";
import { RectangleModel } from "../interfaces/control/Rectangle";

import * as HtxObjectModel from "../interfaces/object";

const Prediction = types
  .model("Prediction", {
    id: types.identifier,
    selected: types.optional(types.boolean, false),

    createdDate: types.optional(types.string, new Date().toISOString()),
    createdAgo: types.maybeNull(types.string),
    model: types.optional(types.string, "Model"),

    root: Types.allModelsTypes(),
    names: types.map(types.reference(Types.allModelsTypes())),
    toNames: types.map(types.array(types.reference(Types.allModelsTypes()))),

    history: types.optional(TimeTraveller, { targetPath: "../root" }),

    dragMode: types.optional(types.boolean, false),

    relationMode: types.optional(types.boolean, false),
    relationStore: types.optional(RelationStore, {
      relations: [],
    }),

    normalizationMode: types.optional(types.boolean, false),
    normalizationStore: types.optional(NormalizationStore, {
      normalizations: [],
    }),

    regionStore: types.optional(RegionStore, {
      regions: [],
    }),

    highlightedNode: types.maybeNull(
      types.union(
        types.safeReference(HtxObjectModel.TextRegionModel),
        types.safeReference(HtxObjectModel.RectRegionModel),
        types.safeReference(HtxObjectModel.AudioRegionModel),
        types.safeReference(HtxObjectModel.TextAreaRegionModel),
        types.safeReference(HtxObjectModel.PolygonRegionModel),
        types.safeReference(RectangleModel),
      ),
    ),
  })
  .views(self => ({
    get store() {
      return getParent(self, 2);
    },
  }))
  .actions(self => ({
    reinitHistory() {
      self.history = { targetPath: "../root" };
    },

    setDragMode(val) {
      self.dragMode = val;
    },

    setNormalizationMode(val) {
      self.normalizationMode = val;
    },

    setHighlightedNode(node) {
      self.highlightedNode = node;
    },

    startRelationMode(node1) {
      self._relationObj = node1;
      self.relationMode = true;
    },

    stopRelationMode() {
      self._relationObj = null;
      self.relationMode = false;

      self.regionStore.unhighlightAll();
    },

    unselectPrediction() {
      self.selected = false;
    },

    addRegion(reg) {
      self.regionStore.unselectAll();
      self.regionStore.addRegion(reg);

      if (self.relationMode) {
        self.addRelation(reg);
        self.stopRelationMode();
      }
    },

    /**
     * Add relation
     * @param {*} reg
     */
    addRelation(reg) {
      self.relationStore.addRelation(self._relationObj, reg);
    },

    addNormalization(normalization) {
      self.normalizationStore.addNormalization();
    },

    /**
     * Remove honeypot
     */
    removeHoneypot() {
      self.honeypot = false;
      self._updateServerState({ honeypot: self.honeypot });
    },

    traverseTree(cb) {
      let visitNode;

      visitNode = function(node) {
        cb(node);

        if (node.children) {
          node.children.forEach(chld => visitNode(chld));
        }
      };

      visitNode(self.root);
    },

    /**
     *
     */
    beforeSend() {
      self.traverseTree(node => {
        if (node && node.beforeSend) {
          node.beforeSend();
        }
      });

      self.stopRelationMode();
      self.regionStore.unselectAll();
    },

    /**
     * Delete region
     * @param {*} region
     */
    deleteRegion(region) {
      destroy(region);
    },

    /**
     * Deserialize predictions of models
     */
    deserializePrediction(json) {
      json.forEach(obj => {
        if (obj["type"] !== "relation") {
          const names = obj.to_name.split(",");
          names.forEach(name => {
            const toModel = self.store.store.completionStore.selected.names.get(name);
            if (!toModel) throw new Error("No model found for " + obj.to_name);

            const fromModel = self.store.store.completionStore.selected.names.get(obj.from_name);
            if (!fromModel) throw new Error("No model found for " + obj.from_name);

            toModel.fromStateJSON(obj, fromModel);
          });
        } else {
          self.relationStore.deserializeRelation(
            self.regionStore.findRegion(obj.from_id),
            self.regionStore.findRegion(obj.to_id),
          );
        }
      });
    },
  }));

export default types
  .model("PredictionStore", {
    predictions: types.array(Prediction),
    selected: types.maybeNull(types.reference(Prediction)),
  })
  .views(self => ({
    /**
     * Get current completion
     */
    get currentPrediction() {
      return self.selected && self.predictions.find(c => c.id === self.selected.id);
    },

    /**
     * Get parent
     */
    get store() {
      return getParent(self);
    },

    /**
     * Get only those that were saved
     */
    get savedPredictions() {
      return self.predictions.filter(c => c);
    },
  }))
  .actions(self => {
    /**
     *
     * @param {*} id
     */
    function selectPrediction(id) {
      self.store.completionStore.selected && self.store.completionStore.selected.unselectCompletion();

      self.predictions.map(c => (c.selected = false));
      const c = self.predictions.find(c => c.id === id);

      // if (self.selected && self.selected.id !== c.id) c.history.reset();

      c.selected = true;
      self.selected = c;
    }

    /**
     * Adding new completion
     * @param {object} node
     * @param {string} type
     */
    function addPredictionItem(node, type) {
      /**
       * Create Completion
       */
      const createdPrediction = Prediction.create(node);

      /**
       * If completion is initial completion
       */
      if (self.store.task && type === "initial") {
        createdPrediction.traverseTree(node => node.updateValue && node.updateValue(self.store));
      }

      self.predictions.push(createdPrediction);

      return createdPrediction;
    }

    /**
     * Initial Completion
     * @returns {object}
     */
    function addInitialPrediction() {
      /**
       * Convert config to model
       */
      const predictionModel = Tree.treeToModel(self.store.config);

      /**
       * Get model by type of tag
       */
      const modelClass = Registry.getModelByTag(predictionModel.type);

      /**
       * Completion model init
       */
      let root = modelClass.create(predictionModel);

      const node = {
        id: guidGenerator(),
        root: root,
      };

      /**
       *
       */
      const prediction = self.addPrediction(node, "initial");

      return prediction;
    }

    /**
     *
     * @param {*} c
     */
    function addPrediction(c) {
      const predictionModel = Tree.treeToModel(self.store.config);
      const modelClass = Registry.getModelByTag(predictionModel.type);

      let root = modelClass.create(predictionModel);

      const node = {
        pk: c.id,
        id: c.id || guidGenerator(),
        createdAgo: c.created_ago,
        model: c.model_version,
        root: root,
      };

      const prediction = self.addPredictionItem(node, "list");

      return prediction;
    }

    function destroyPrediction(prediction) {
      destroy(prediction);

      self.selected = null;
      if (self.predictions.length > 0) self.selectPrediction(self.predictions[0].id);
    }

    return {
      selectPrediction,
      addPredictionItem,
      addPrediction,
      addInitialPrediction,
      destroyPrediction,
    };
  });
