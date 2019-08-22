import { types, getParent, getEnv, flow, destroy } from "mobx-state-tree";

import { guidGenerator } from "../core/Helpers";
import Types from "../core/Types";

import Registry from "../core/Registry";
import Tree from "../core/Tree";
import TimeTraveller from "../core/TimeTraveller";
import Hotkey from "../core/Hotkey";

import RelationStore from "./RelationStore";
import NormalizationStore from "./NormalizationStore";
import RegionStore from "./RegionStore";
import { RectangleModel } from "../interfaces/control/Rectangle";

import * as HtxObjectModel from "../interfaces/object";

const Completion = types
  .model("Completion", {
    id: types.identifier,
    pk: types.optional(types.integer, 1),
    selected: types.optional(types.boolean, false),

    createdDate: types.optional(types.string, new Date().toISOString()),
    createdAgo: types.maybeNull(types.string),
    createdBy: types.optional(types.string, "Admin"),

    honeypot: types.optional(types.boolean, false),
    prediction: types.optional(types.boolean, false),

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
    /**
     * Send update to serve
     * @param {*} state
     */
    _updateServerState(state) {
      let appStore = getParent(self, 3);
      let url = "/api/tasks/" + appStore.task.id + "/completions/" + self.pk + "/";

      getEnv(self).patch(url, JSON.stringify(state));
    },

    setHoneypot() {
      self.honeypot = true;
      self._updateServerState({ honeypot: self.honeypot });
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

    deleteAllRegions() {
      self.regionStore.regions.forEach(r => r.deleteRegion());
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

    afterCreate() {
      self.traverseTree(node => {
        // create mapping from name to Model (by ref)
        if (node && node.name && node.id) self.names.set(node.name, node.id);

        if (node && node.toname && node.id) {
          const val = self.toNames.get(node.toname);
          if (val) {
            val.push(node.id);
          } else {
            self.toNames.set(node.toname, [node.id]);
          }
        }
      });

      Hotkey.unbindAll();

      // [TODO] we need to traverse this two times, fix
      self.traverseTree(node => {
        if (node && node.onHotKey && node.hotkey) Hotkey.addKey(node.hotkey, node.onHotKey);
      });

      self.traverseTree(node => {
        if (node && node.onHotKey && !node.hotkey) {
          const comb = Hotkey.makeComb();

          if (!comb) return;

          node.hotkey = comb;
          Hotkey.addKey(node.hotkey, node.onHotKey);
        }
      });

      Hotkey.setScope("main");
    },

    serializeCompletion() {
      const arr = [];

      self.traverseTree(node => {
        if (node.toStateJSON) {
          const val = node.toStateJSON();

          if (val) arr.push(val);
        }
      });

      const relations = self.relationStore.serializeCompletion();
      arr.push(relations);

      const flatten = arr => {
        return arr.reduce(function(flat, toFlatten) {
          return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
        }, []);
      };

      return flatten(arr);
    },

    /**
     * Deserialize completion of models
     */
    deserializeCompletion(json) {
      let objCompletion = json;

      if (typeof objCompletion !== "object") {
        objCompletion = JSON.parse(objCompletion);
      }

      objCompletion.forEach(obj => {
        if (obj["type"] !== "relation") {
          const names = obj.to_name.split(",");
          names.forEach(name => {
            const toModel = self.names.get(name);
            if (!toModel) throw new Error("No model found for " + obj.to_name);

            const fromModel = self.names.get(obj.from_name);
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
  .model("CompletionStore", {
    completions: types.array(Completion),
    selected: types.maybeNull(types.reference(Completion)),
  })
  .views(self => ({
    /**
     * Get current completion
     */
    get currentCompletion() {
      return self.selected && self.completions.find(c => c.id === self.selected.id);
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
    get savedCompletions() {
      return self.completions.filter(c => c);
    },
  }))
  .actions(self => {
    /**
     *
     * @param {*} id
     */
    function selectCompletion(id) {
      self.completions.map(c => (c.selected = false));
      const c = self.completions.find(c => c.id === id);

      // if (self.selected && self.selected.id !== c.id) c.history.reset();

      c.selected = true;
      self.selected = c;
    }

    /**
     * Adding new completion
     * @param {object} node
     * @param {string} type
     */
    function addCompletion(node, type) {
      /**
       * Create Completion
       */
      const createdCompletion = Completion.create(node);

      /**
       * If completion is initial completion
       */
      if (self.store.task && type === "initial") {
        createdCompletion.traverseTree(node => node.updateValue && node.updateValue(self.store));
      }

      self.completions.push(createdCompletion);

      return createdCompletion;
    }

    /**
     *
     */
    const _deleteCompletion = flow(function* _deleteCompletion(pk) {
      try {
        const json = yield getEnv(self).remove("/api/tasks/" + self.store.task.id + "/completions/" + pk + "/");
      } catch (err) {
        console.error("Failed to skip task ", err);
      }
    });

    /**
     * Destroy completion
     * @param {*} completion
     */
    function destroyCompletion(completion) {
      destroy(completion);

      self.selected = null;
      if (self.completions.length > 0) self.selectCompletion(self.completions[0].id);
    }

    function deleteCompletion(completion) {
      _deleteCompletion(completion.pk);
      destroyCompletion(completion);
    }

    /**
     *
     * @param {*} c
     */
    function addSavedCompletion(c) {
      const completionModel = Tree.treeToModel(self.store.config);
      const modelClass = Registry.getModelByTag(completionModel.type);

      let root = modelClass.create(completionModel);

      const node = {
        pk: c.id,
        id: c.id || guidGenerator(),
        createdAgo: c.created_ago,
        createdBy: c.created_username,
        honeypot: c.honeypot,
        root: root,
      };

      const completion = self.addCompletion(node, "list");

      return completion;
    }

    /**
     * Initial Completion
     * @returns {object}
     */
    function addInitialCompletion() {
      /**
       * Convert config to model
       */
      const completionModel = Tree.treeToModel(self.store.config);

      /**
       * Get model by type of tag
       */
      const modelClass = Registry.getModelByTag(completionModel.type);

      /**
       * Completion model init
       */
      let root = modelClass.create(completionModel);

      const node = {
        id: guidGenerator(),
        root: root,
      };

      /**
       * Expert module for initial completion
       */
      if (self.store.expert) {
        const { expert } = self.store;

        node["createdBy"] = `${expert.firstName} ${expert.lastName}`;
      }

      /**
       *
       */
      const completion = self.addCompletion(node, "initial");

      return completion;
    }

    return {
      selectCompletion,
      addCompletion,
      deleteCompletion,
      destroyCompletion,
      addInitialCompletion,
      addSavedCompletion,
    };
  });
