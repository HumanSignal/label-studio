import { types, getParent, getEnv, getRoot, flow, destroy, detach } from "mobx-state-tree";

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
import Utils from "../utils";

import * as HtxObjectModel from "../interfaces/object";

const Completion = types
  .model("Completion", {
    id: types.identifier,
    pk: types.optional(types.string, guidGenerator(5)),

    selected: types.optional(types.boolean, false),
    type: types.enumeration(["completion", "prediction"]),

    createdDate: types.optional(types.string, Utils.UDate.currentISODate()),
    createdAgo: types.maybeNull(types.string),
    createdBy: types.optional(types.string, "Admin"),

    loadedDate: types.optional(types.Date, new Date()),
    leadTime: types.maybeNull(types.number),

    userGenerate: types.optional(types.boolean, true),
    update: types.optional(types.boolean, false),
    sentUserGenerate: types.optional(types.boolean, false),
    localUpdate: types.optional(types.boolean, false),

    honeypot: types.optional(types.boolean, false),

    root: Types.allModelsTypes(),
    names: types.map(types.reference(Types.allModelsTypes())),
    toNames: types.map(types.array(types.reference(Types.allModelsTypes()))),

    history: types.optional(TimeTraveller, { targetPath: "../root" }),

    dragMode: types.optional(types.boolean, false),

    edittable: types.optional(types.boolean, true),

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
        types.safeReference(HtxObjectModel.KeyPointRegionModel),
        types.safeReference(HtxObjectModel.HyperTextRegionModel),
        types.safeReference(RectangleModel),
      ),
    ),
  })
  .views(self => ({
    get store() {
      return getRoot(self);
    },

    get list() {
      return getParent(self, 2);
    },
  }))
  .actions(self => ({
    reinitHistory() {
      self.history = { targetPath: "../root" };
    },

    setGroundTruth(value) {
      self.honeypot = value;
      getEnv(self).onGroundTruth(self.store, self, value);
    },

    sendUserGenerate() {
      self.sentUserGenerate = true;
    },

    setLocalUpdate(value) {
      self.localUpdate = value;
    },

    setDragMode(val) {
      self.dragMode = val;
    },

    updatePersonalKey(value) {
      self.pk = value;
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
      if (region.type === "polygonregion") {
        detach(region);
        return;
      }

      destroy(region);
    },

    setupHotKeys() {
      Hotkey.unbindAll();

      let audiosNum = 0;
      let audioNode = null;
      let mod = "shift+space";
      let comb = mod;

      // [TODO] we need to traverse this two times, fix
      self.traverseTree(node => {
        if (node && node.onHotKey && node.hotkey) {
          Hotkey.addKey(node.hotkey, node.onHotKey, node.hotkeyScope);
        }
      });

      self.traverseTree(node => {
        // add Space hotkey for playbacks of audio
        if (node && !node.hotkey && node.type == "audio") {
          if (audiosNum > 0) comb = mod + "+" + (audiosNum + 1);
          else audioNode = node;

          node.hotkey = comb;
          Hotkey.addKey(comb, node.onHotKey);

          audiosNum++;
        }
      });

      self.traverseTree(node => {
        /**
         * Hotkey for controls
         */
        if (node && node.onHotKey && !node.hotkey) {
          const comb = Hotkey.makeComb();

          if (!comb) return;

          node.hotkey = comb;
          Hotkey.addKey(node.hotkey, node.onHotKey);
        }
      });

      if (audioNode && audiosNum > 1) {
        audioNode.hotkey = mod + "+1";
        Hotkey.addKey(audioNode.hotkey, audioNode.onHotKey);
        Hotkey.removeKey(mod);
      }

      // prevent spacebar from scrolling
      // document.onkeypress = function(e) {
      //     e = e || window.event;

      //   var charCode = e.keyCode || e.which;
      //   if (charCode === 32) {
      //     e.preventDefault();
      //     return false;
      //   }
      // };

      Hotkey.setScope("__main__");
    },

    afterAttach() {
      self.traverseTree(node => node.updateValue && node.updateValue(self.store));
    },

    afterCreate() {
      //
      if (self.userGenerate && !self.sentUserGenerate) {
        self.loadedDate = new Date();
      }

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
      if (relations) arr.push(relations);

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
    selected: types.maybeNull(types.reference(Completion)),

    completions: types.array(Completion),
    predictions: types.array(Completion),

    viewingAllCompletions: types.optional(types.boolean, false),
    viewingAllPredictions: types.optional(types.boolean, false),
  })
  .views(self => ({
    get store() {
      return getRoot(self);
    },
  }))
  .actions(self => {
    function _toggleViewingAll() {
      if (self.viewingAllCompletions || self.viewingAllPredictions) {
        self.completions.forEach(c => {
          c.selected = false;
          c.highlightedNode && c.highlightedNode.unselectRegion();
        });

        self.predictions.forEach(c => (c.selected = false));
      } else {
        selectCompletion(self.completions[0].id);
      }
    }

    function toggleViewingAllPredictions() {
      self.viewingAllPredictions = !self.viewingAllPredictions;

      if (self.viewingAllPredictions) self.viewingAllCompletions = false;

      _toggleViewingAll();
    }

    function toggleViewingAllCompletions() {
      self.viewingAllCompletions = !self.viewingAllCompletions;

      if (self.viewingAllCompletions) {
        self.viewingAllPredictions = false;
        self.completions.forEach(c => (c.edittable = false));
      }

      _toggleViewingAll();
    }

    function unselectViewingAll() {
      self.viewingAllCompletions = false;
      self.viewingAllPredictions = false;
    }

    function selectItem(id, list) {
      unselectViewingAll();

      if (self.selected) self.selected.selected = false;

      const c = list.find(c => c.id === id);
      c.selected = true;
      self.selected = c;

      return c;
    }

    /**
     * Select completion
     * @param {*} id
     */
    function selectCompletion(id) {
      const c = selectItem(id, self.completions);

      c.edittable = true;
      c.setupHotKeys();

      return c;
    }

    function selectPrediction(id) {
      return selectItem(id, self.predictions);
    }

    function deleteCompletion(completion) {
      getEnv(self).onDeleteCompletion(self.store, completion);

      /**
       * MST destroy completion
       */
      destroy(completion);

      self.selected = null;
      /**
       * Select other completion
       */
      if (self.completions.length > 0) {
        self.selectCompletion(self.completions[0].id);
      }
    }

    function addItem(options) {
      const { user, config } = self.store;

      // convert config to mst model
      const completionModel = Tree.treeToModel(config);
      const modelClass = Registry.getModelByTag(completionModel.type);

      //
      let root = modelClass.create(completionModel);

      const id = options["id"];
      delete options["id"];

      //
      let node = {
        id: id || guidGenerator(5),
        root: root,

        createdBy: user && user.displayName,
        userGenerate: false,

        ...options,
      };

      //
      return Completion.create(node);
    }

    function addPrediction(options = {}) {
      options.edittable = false;
      options.type = "prediction";

      const item = addItem(options);
      self.predictions.unshift(item);

      return item;
    }

    function addCompletion(options = {}) {
      options.type = "completion";

      const item = addItem(options);
      self.completions.unshift(item);

      return item;
    }

    function addCompletionFromPrediction(prediction) {
      const c = self.addCompletion({ userGenerate: true });

      const selectedData = prediction.serializeCompletion();
      c.deserializeCompletion(selectedData);

      return c;
    }

    return {
      toggleViewingAllCompletions,
      toggleViewingAllPredictions,

      addPrediction,
      addCompletion,
      addCompletionFromPrediction,

      selectCompletion,
      selectPrediction,

      deleteCompletion,
    };
  });
