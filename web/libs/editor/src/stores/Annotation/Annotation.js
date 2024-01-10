import { destroy, detach, flow, getEnv, getParent, getRoot, isAlive, onSnapshot, types } from 'mobx-state-tree';

import throttle from 'lodash.throttle';
import Constants from '../../core/Constants';
import { errorBuilder } from '../../core/DataValidator/ConfigValidator';
import { guidGenerator } from '../../core/Helpers';
import { Hotkey } from '../../core/Hotkey';
import TimeTraveller from '../../core/TimeTraveller';
import Tree, { TRAVERSE_STOP } from '../../core/Tree';
import Types from '../../core/Types';
import Area from '../../regions/Area';
import Result from '../../regions/Result';
import Utils from '../../utils';
import {
  FF_DEV_1284,
  FF_DEV_1598,
  FF_DEV_2100,
  FF_DEV_2432,
  FF_DEV_3391, FF_LLM_EPIC,
  FF_LSDV_3009,
  FF_LSDV_4583,
  FF_LSDV_4832,
  FF_LSDV_4988,
  isFF
} from '../../utils/feature-flags';
import { delay, isDefined } from '../../utils/utilities';
import { CommentStore } from '../Comment/CommentStore';
import RegionStore from '../RegionStore';
import RelationStore from '../RelationStore';
import { UserExtended } from '../UserStore';

const hotkeys = Hotkey('Annotations', 'Annotations');

const TrackedState = types
  .model('TrackedState', {
    areas: types.map(Area),
    relationStore: types.optional(RelationStore, {}),
  });

export const Annotation = types
  .model('Annotation', {
    id: types.identifier,
    // @todo this value used `guidGenerator(5)` as default value before
    // @todo but it calculates once, so all the annotations have the same pk
    // @todo why don't use only `id`?
    // @todo reverted back to wrong type; maybe it breaks all the deserialisation
    pk: types.maybeNull(types.string),

    selected: types.optional(types.boolean, false),
    type: types.enumeration(['annotation', 'prediction', 'history']),

    createdDate: types.optional(types.string, Utils.UDate.currentISODate()),
    createdAgo: types.maybeNull(types.string),
    createdBy: types.optional(types.string, 'Admin'),
    user: types.optional(types.maybeNull(types.safeReference(UserExtended)), null),

    parent_prediction: types.maybeNull(types.integer),
    parent_annotation: types.maybeNull(types.integer),
    last_annotation_history: types.maybeNull(types.integer),

    comment_count: types.maybeNull(types.integer),
    unresolved_comment_count: types.maybeNull(types.integer),

    loadedDate: types.optional(types.Date, () => new Date()),
    leadTime: types.maybeNull(types.number),

    // @todo use types.Date
    draftSaved: types.maybe(types.string),

    // created by user during this session
    userGenerate: types.optional(types.boolean, true),
    update: types.optional(types.boolean, false),
    sentUserGenerate: types.optional(types.boolean, false),
    localUpdate: types.optional(types.boolean, false),

    ground_truth: types.optional(types.boolean, false),
    skipped: false,

    // This field stores all data that affects undo/redo history
    // It should contain real objects to be able to work with them through snapshots
    // Annotation will use getters to get them at the top level
    // This data is never redefined directly, it's empty at the start
    trackedState: types.optional(TrackedState, {}),
    history: types.optional(TimeTraveller, { targetPath: '../trackedState' }),

    dragMode: types.optional(types.boolean, false),

    editable: types.optional(types.boolean, true),
    readonly: types.optional(types.boolean, false),

    relationMode: types.optional(types.boolean, false),

    suggestions: types.map(Area),

    regionStore: types.optional(RegionStore, {
      regions: [],
    }),

    isDrawing: types.optional(types.boolean, false),

    commentStore: types.optional(CommentStore, {
      comments: [],
    }),

    ...(isFF(FF_DEV_3391) ? { root: Types.allModelsTypes() } : {}),
  })
  .views(self => ({
    get areas() {
      return self.trackedState.areas;
    },
    get relationStore() {
      return self.trackedState.relationStore;
    },
  }))
  .preProcessSnapshot(sn => {
    // sn.draft = Boolean(sn.draft);
    let user = sn.user ?? sn.completed_by ?? undefined;
    let root;

    const updateIds = item => {
      const children = item.children?.map(updateIds);

      if (children) item = { ...item, children };
      if (item.id) item = { ...item, id: (item.name ?? item.id) + '@' + sn.id };
      // @todo fallback for tags with name as id:
      // if (item.name) item = { ...item, name: item.name + "@" + sn.id };
      // @todo soon no such tags should left

      return item;
    };

    if (isFF(FF_DEV_3391)) {
      root = updateIds(sn.root.toJSON());
    }

    if (user && typeof user !== 'number') {
      user = user.id;
    }

    return {
      ...sn,
      ...(isFF(FF_DEV_3391) ? { root } : {}),
      user,
      editable: sn.editable ?? (sn.type === 'annotation'),
      ground_truth: sn.honeypot ?? sn.ground_truth ?? false,
      skipped: sn.skipped || sn.was_cancelled,
      acceptedState: sn.accepted_state ?? sn.acceptedState ?? null,
    };
  })
  .views(self => isFF(FF_DEV_3391)
    ? {}
    : {
      get root() {
        return self.list.root;
      },

      get names() {
        return self.list.names;
      },

      get toNames() {
        return self.list.toNames;
      },
    })
  .views(self => ({
    get store() {
      return getRoot(self);
    },

    get list() {
      return getParent(self, 2);
    },

    get objects() {
      // Without correct validation toname may be null for control tags so we need to check isObjectTag instead of it
      return Array.from(self.names.values()).filter(
        isFF(FF_DEV_1598)
          ? tag => tag.isObjectTag
          : tag => !tag.toname,
      );
    },

    get regions() {
      return Array.from(self.areas.values());
    },

    get lastSelectedRegion() {
      return self.selectedRegions[self.selectedRegions.length - 1];
    },

    get results() {
      const results = [];

      if (isAlive(self)) self.areas.forEach(a => a.results.forEach(r => results.push(r)));
      return results;
    },

    get serialized() {
      // Dirty hack to force MST track changes
      self.areas.toJSON();

      return self.results
        .map(r => r.serialize())
        .filter(Boolean)
        .concat(self.relationStore.serializeAnnotation());
    },

    get serializedSelection() {
      // Dirty hack to force MST track changes
      self.areas.toJSON();

      const selectedResults = [];

      self.areas.forEach(a => {
        if (!a.inSelection) return;
        a.results.forEach(r => {
          selectedResults.push(r);
        });
      });

      return selectedResults
        .map(r => r.serialize())
        .filter(Boolean);
    },

    get highlightedNode() {
      return self.regionStore.selection.highlighted;
    },

    get hasSelection() {
      return self.regionStore.selection.hasSelection;
    },
    get selectionSize() {
      return self.regionStore.selection.size;
    },

    get selectedRegions() {
      return Array.from(self.regionStore.selection.selected.values());
    },

    get selectedDrawingRegions() {
      return Array.from(self.regionStore.selection.drawingSelected.values());
    },

    // existing annotation which can be updated
    get exists() {
      const dataExists = (self.userGenerate && self.sentUserGenerate) || isDefined(self.versions.result);
      const pkExists = isDefined(self.pk);

      return dataExists && pkExists;
    },

    get hasSuggestionsSupport() {
      return self.objects.some((obj) => {
        return obj.supportSuggestions;
      });
    },

    isReadOnly() {
      return self.readonly || !self.editable;
    },
  }))
  .volatile(() => ({
    hidden: false,
    draftId: 0,
    draftSelected: false,
    autosaveDelay: 5000,
    isDraftSaving: false,
    // This flag indicates that we are accepting suggestions right now (an accepting is started and not finished yet)
    isSuggestionsAccepting: false,
    submissionStarted: 0,
    versions: {},
    resultSnapshot: '',
  }))
  .volatile(() => isFF(FF_DEV_3391)
    ? {
      names: new Map(),
      toNames: new Map(),
      ids: new Map(),
    }
    : {})
  .actions(self => ({
    reinitHistory(force = true) {
      self.history.reinit(force);
      self.autosave && self.autosave.cancel();
      if (self.type === 'annotation') self.setInitialValues();
    },

    setEdit(val) {
      self.editable = val;
    },

    setReadonly(val) {
      self.readonly = val;
    },

    setIsDrawing(isDrawing) {
      self.isDrawing = isDrawing;
    },

    setUnresolvedCommentCount(val) {
      self.unresolved_comment_count = val;
    },

    setCommentCount(val) {
      self.comment_count = val;
    },

    setGroundTruth(value, ivokeEvent = true) {
      const root = getRoot(self);

      if (root && root !== self && ivokeEvent) {
        const as = root.annotationStore;
        const assignGroundTruths = p => {
          if (self !== p) p.setGroundTruth(false, false);
        };

        as.predictions.forEach(assignGroundTruths);
        as.annotations.forEach(assignGroundTruths);
      }

      self.ground_truth = value;

      if (ivokeEvent) {
        getEnv(self).events.invoke('groundTruth', self.store, self, value);
      }
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
      getRoot(self).addAnnotationToTaskHistory?.(self.pk);
    },

    toggleVisibility(visible) {
      self.hidden = visible === undefined ? !self.hidden : !visible;
    },

    setHighlightedNode() {
      // moved to selectArea and others
    },

    selectArea(area) {
      if (self.highlightedNode === area) return;
      // if (current) current.setSelected(false);
      self.regionStore.highlight(area);
      // area.setSelected(true);
    },

    toggleRegionSelection(area, isSelected) {
      self.regionStore.toggleSelection(area, isSelected);
    },

    selectAreas(areas) {
      self.unselectAreas();
      self.extendSelectionWith(areas);
    },

    extendSelectionWith(areas) {
      for (const area of (Array.isArray(areas) ? areas : [areas])) {
        self.regionStore.toggleSelection(area, true);
      }
    },

    unselectArea(area) {
      if (self.highlightedNode !== area) return;
      // area.setSelected(false);
      self.regionStore.toggleSelection(area, false);
    },

    unselectAreas() {
      if (!self.selectionSize) return;
      self.regionStore.clearSelection();
    },

    hideSelectedRegions() {
      self.selectedRegions.forEach(region => {
        region.toggleHidden();
      });
    },

    deleteSelectedRegions() {
      self.selectedRegions.forEach(region => {
        region.deleteRegion();
      });
    },

    unselectStates() {
      self.names.forEach(tag => tag.unselectAll && tag.unselectAll());
    },

    /**
     * @param {boolean} tryToKeepStates don't unselect labels if such setting is enabled
     */
    unselectAll(tryToKeepStates = false) {
      const keepStates = tryToKeepStates && self.store.settings.continuousLabeling;

      self.unselectAreas();
      if (!keepStates) self.unselectStates();
    },

    removeArea(area) {
      destroy(area);
    },

    startRelationMode(node1) {
      self._relationObj = node1;
      self.relationMode = true;

      document.body.style.cursor = Constants.CHOOSE_CURSOR;
    },

    stopRelationMode() {
      document.body.style.cursor = Constants.DEFAULT_CURSOR;

      self._relationObj = null;
      self.relationMode = false;

      self.regionStore.unhighlightAll();
    },

    deleteAllRegions({ deleteReadOnly = false } = {}) {
      let regions = Array.from(self.areas.values());

      // remove everything unconditionally
      if (deleteReadOnly && isFF(FF_LSDV_4832)) {
        self.unselectAll(true);
        self.setIsDrawing(false);
        self.relationStore.deleteAllRelations();

        regions.forEach(r => {
          r.destroyRegion?.();
          destroy(r);
        });

        self.updateObjects();

        return;
      }

      if (deleteReadOnly === false) regions = regions.filter(r => r.readonly === false);

      regions.forEach(r => r.deleteRegion());
      self.updateObjects();
    },

    addRegion(reg) {
      self.regionStore.unselectAll(true);

      if (self.relationMode) {
        self.addRelation(reg);
        self.stopRelationMode();
      }
    },

    unloadRegionState(region) {
      region.states &&
        region.states.forEach(s => {
          const mainViewTag = self.names.get(s.name);

          mainViewTag.unselectAll && mainViewTag.unselectAll();
          mainViewTag.perRegionCleanup && mainViewTag.perRegionCleanup();
        });
    },

    addRelation(reg) {
      self.relationStore.addRelation(self._relationObj, reg);
    },

    validate() {
      let ok = true;

      self.traverseTree(function(node) {
        ok = node.validate?.();
        if (ok === false) {
          return TRAVERSE_STOP;
        }
      });

      // should be true or false
      return ok ?? true;
    },

    traverseTree(cb) {
      return Tree.traverseTree(self.root, cb);
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
      self.unselectAll();
    },

    /**
     * Delete region
     * @param {*} region
     */
    deleteRegion(region) {
      if (region.isReadOnly()) return;

      const { regions } = self.regionStore;
      // move all children into the parent region of the given one
      const children = regions.filter(r => r.parentID === region.id);

      children && children.forEach(r => r.setParentID(region.parentID));

      if (!region.classification) getEnv(self).events.invoke('entityDelete', region);

      self.relationStore.deleteNodeRelation(region);

      if (region.type === 'polygonregion') {
        detach(region);
      }

      destroy(region);

      // If the annotation was in a drawing state and the user deletes it, we need to reset the drawing state
      // to avoid the user being stuck in a drawing state
      self.setIsDrawing(false);
    },

    deleteArea(area) {
      destroy(area);
    },

    undo() {
      const { history, regionStore } = self;

      if (history && history.canUndo) {
        let stopDrawingAfterNextUndo = false;
        const selectedIds = regionStore.selectedIds;
        const currentRegion = regionStore.findRegion(selectedIds[selectedIds.length - 1] ?? regionStore.regions[regionStore.regions.length - 1]?.id);

        if (currentRegion?.type === 'polygonregion') {
          const points = currentRegion?.points?.length ?? 0;

          stopDrawingAfterNextUndo = points <= 1;
        }

        history.undo();
        regionStore.selectRegionsByIds(selectedIds);

        if (stopDrawingAfterNextUndo) {
          currentRegion.setDrawing(false);
          self.setIsDrawing(false);
        }
      }
    },

    redo() {
      const { history, regionStore } = self;

      if (history && history.canRedo) {
        const selectedIds = regionStore.selectedIds;

        history.redo();
        regionStore.selectRegionsByIds(selectedIds);
      }
    },

    /**
     * update some fragile parts after snapshot manipulations (undo/redo)
     *
     * @param {boolean} [force=true] force update will unselect all regions
     */
    updateObjects(force = true) {
      // Some async or lazy mode operations (ie. Images lazy load) need to reinitHistory without removing state selections
      if (force) self.unselectAll();

      self.names.forEach(tag => tag.needsUpdate && tag.needsUpdate());
      self.areas.forEach(area => area.updateAppearenceFromState && area.updateAppearenceFromState());
      if (isFF(FF_DEV_2432)) {
        const areas = Array.from(self.areas.values());
        const filtered = areas.filter(area => area.isDrawing);

        self.regionStore.selection._updateResultsFromRegions(filtered);
      }
    },

    setInitialValues() {
      // <Label selected="true"/>
      self.names.forEach(tag => {
        if (tag.type.endsWith('labels')) {
          // @todo check for choice="multiple" and multiple preselected labels
          const preselected = tag.children?.find(label => label.initiallySelected);

          if (preselected) preselected.setSelected(true);
        }
      });

      // @todo deal with `defaultValue`s
    },

    setDefaultValues() {
      self.names.forEach(tag => {
        if (['choices', 'taxonomy'].includes(tag?.type) && tag.preselectedValues?.length) {
          // <Choice selected="true"/>
          self.createResult({}, { [tag?.type]: tag.preselectedValues }, tag, tag.toname);
        }
      });
    },

    addVersions(versions) {
      self.versions = { ...self.versions, ...versions };
      if (versions.draft) self.setDraftSelected();
    },

    toggleDraft(explicitValue) {
      const isDraft = self.draftSelected;
      const shouldSelectDraft = explicitValue ?? !isDraft;

      // if explicitValue already achieved
      if (shouldSelectDraft === isDraft) return;
      // if there are no draft to switch to
      if (shouldSelectDraft && !self.versions.draft) return;

      // if there were some changes waiting they'll be saved
      self.autosave.flush();
      self.pauseAutosave();

      // reinit annotation from required state
      self.deleteAllRegions({ deleteReadOnly: true });
      if (shouldSelectDraft) {
        self.deserializeResults(self.versions.draft);
      } else {
        self.deserializeResults(self.versions.result);
      }
      self.draftSelected = shouldSelectDraft;

      // reinit objects
      self.updateObjects();
      self.startAutosave();
    },

    startAutosave: flow(function* () {
      if (!getEnv(self).events.hasEvent('submitDraft')) return;
      // view all must never trigger autosave
      if (self.isReadOnly()) return;

      // some async tasks should be performed after deserialization
      // so start autosave on next tick
      yield delay(0);

      if (self.autosave) {
        self.autosave.cancel();
        self.autosave.paused = false;
        return;
      }

      // mobx will modify methods, so add it directly to have cancel() method
      self.autosave = throttle(
        () => {
          // if autosave is paused, do nothing
          if (self.autosave.paused) return;

          self.saveDraft();
        },
        self.autosaveDelay,
        { leading: false },
      );

      onSnapshot(self.areas, self.autosave);
    }),

    saveDraft: flow(function* (params) {
      // There is no draft to save as it was already saved as an annotation
      if (self.submissionStarted) return;
      // if this is now a history item or prediction don't save it
      if (!self.editable) return;

      const result = yield self.serializeAnnotation({ fast: true });
      // if this is new annotation and no regions added yet

      if (!isFF(FF_LSDV_3009) && !self.pk && !result.length) return;

      self.setDraftSelected();
      self.versions.draft = result;
      self.setDraftSaving(true);
      return self.store.submitDraft(self, params).then((res) => {
        self.onDraftSaved(res);

        return res;
      });
    }),

    submissionInProgress() {
      self.submissionStarted = Date.now();
    },

    saveDraftImmediately() {
      if (self.autosave) self.autosave.flush();
    },

    saveDraftImmediatelyWithResults: flow(function *(params) {
      // There is no draft to save as it was already saved as an annotation
      if (self.submissionStarted || self.isDraftSaving) return {};
      self.setDraftSaving(true);
      const res = yield self.saveDraft(params);

      return res;
    }),

    pauseAutosave() {
      if (!self.autosave) return;
      self.autosave.paused = true;
      self.autosave.cancel();
    },

    beforeDestroy() {
      self.autosave && self.autosave.cancel && self.autosave.cancel();
    },

    setDraftId(id) {
      self.draftId = id;
    },

    setDraftSelected(selected = true) {
      self.draftSelected = selected;
    },

    onDraftSaved() {
      self.setDraftSaved(Utils.UDate.currentISODate());
      self.setDraftSaving(false);
    },

    dropDraft() {
      if (!self.autosave) return;
      self.autosave.cancel();
      self.draftId = 0;
      self.draftSelected = false;
      self.draftSaved = undefined;
      self.versions.draft = undefined;
    },

    setDraftSaving(saving = false) {
      self.isDraftSaving = saving;
    },

    setDraftSaved(date) {
      self.draftSaved = date;
    },

    afterAttach() {
      self.traverseTree(node => {
        // called when the annotation is attached to the main store,
        // at this point the whole tree is available. This method
        // may come handy when you have a tag that acts or depends
        // on other elements in the tree.
        if (node.annotationAttached) node.annotationAttached();
      });

      self.history.onUpdate(self.updateObjects);
      self.startAutosave();
    },

    afterCreate() {
      if (isFF(FF_DEV_3391)) {
        const { names, toNames } = Tree.extractNames(self.root);

        names.forEach((tag, name) => self.names.set(name, tag));
        toNames.forEach((tags, name) => self.toNames.set(name, tags));

        Tree.traverseTree(self.root, node => {
          const id = node.id ?? node.name;

          if (id) {
            self.ids.set(Tree.cleanUpId(id), node);
          }

          if (self.store.task && node.updateValue) node.updateValue(self.store);
        });
      }

      if (self.userGenerate && !self.sentUserGenerate) {
        self.loadedDate = new Date();
      }
    },

    setupHotKeys() {
      hotkeys.unbindAll();

      let audiosNum = 0;
      let audioNode = null;
      const mod = 'shift+space';
      let comb = mod;

      // [TODO] we need to traverse this two times, fix
      // Hotkeys setup
      self.traverseTree(node => {
        if (node && node.onHotKey && node.hotkey) {
          hotkeys.addKey(node.hotkey, node.onHotKey, undefined, node.hotkeyScope);
        }
      });

      self.traverseTree(node => {
        // add Space hotkey for playbacks of audio, there might be
        // multiple audios on the screen
        if (node && !node.hotkey && (node.type === 'audio' || node.type === 'audioplus')) {
          if (audiosNum > 0) comb = mod + '+' + (audiosNum + 1);
          else audioNode = node;

          node.hotkey = comb;
          hotkeys.addKey(comb, node.onHotKey, 'Play an audio', Hotkey.DEFAULT_SCOPE + ',' + Hotkey.INPUT_SCOPE);

          audiosNum++;
        }
      });

      self.traverseTree(node => {
        /**
         * Hotkey for controls
         */
        if (node && node.onHotKey && !node.hotkey) {
          const comb = hotkeys.makeComb();

          if (!comb) return;

          node.hotkey = comb;
          hotkeys.addKey(node.hotkey, node.onHotKey);
        }
      });

      if (audioNode && audiosNum > 1) {
        audioNode.hotkey = mod + '+1';
        hotkeys.addKey(audioNode.hotkey, audioNode.onHotKey);
        hotkeys.removeKey(mod);
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

      Hotkey.setScope(Hotkey.DEFAULT_SCOPE);
    },

    createResult(areaValue, resultValue, control, object, skipAfrerCreate = false) {
      // Without correct validation object may be null, but it it shouldn't be so in results - so we should find any
      if (isFF(FF_DEV_1598) && !object && control.type === 'textarea') {
        object = self.objects[0];
      }
      const objectTag = self.names.get(object.name ?? object);

      const result = {
        from_name: self.names.get(control.name),
        // @todo should stick to area
        to_name: objectTag,
        type: control.resultType,
        value: resultValue,
        readonly: self.readonly,
      };

      const areaRaw = {
        id: guidGenerator(),
        object: objectTag,
        // data for Model instance
        ...areaValue,
        // for Model detection
        value: areaValue,
        results: [result],
      };


      // TODO: MST is crashing if we don't validate areas?, this problem isn't
      // happening locally. So to reproduce you have to test in production or environment
      const area = self?.areas?.put(areaRaw);

      objectTag?.afterResultCreated?.(area);

      if (!area) return;

      if (!area.classification) getEnv(self).events.invoke('entityCreate', area);
      if (!skipAfrerCreate) self.afterCreateResult(area, control);

      return area;
    },

    afterCreateResult(area, control) {
      if (self.store.settings.selectAfterCreate) {
        if (!area.classification) {
          // some regions might need some actions right after creation (i.e. text)
          // and some may be already deleted (i.e. bboxes)
          setTimeout(() => isAlive(area) && self.selectArea(area));
        }
      } else {
        // unselect labeling tools after use, but consider "keep labels selected" settings
        if (control.isLabeling) self.unselectAll(true);
      }
    },

    appendResults(results) {
      if (!self.editable || self.readonly) return;

      const regionIdMap = {};
      const prevSize = self.regionStore.regions.length;

      // Generate new ids to prevent collisions
      results.forEach((result) => {
        const regionId = result.id;

        if (!regionIdMap[regionId]) {
          regionIdMap[regionId] = guidGenerator();
        }
        result.id = regionIdMap[regionId];
      });

      self.deserializeResults(results);
      self.updateObjects();
      return self.regionStore.regions.slice(prevSize);
    },

    serializeAnnotation: flow(function *(options) {
      document.body.style.cursor = 'wait';

      const result = (yield Promise.all(
        self.results.map(r => r.serialize(options)))
      )
        .filter(Boolean)
        .concat(self.relationStore.serialize(options));

      document.body.style.cursor = 'default';

      return result;
    }),

    // Some annotations may be created with wrong assumptions
    // And this problems are fixable, so better to fix them on start
    fixBrokenAnnotation(json) {
      return (json ?? []).reduce((res, objRaw) => {
        const obj = structuredClone(objRaw) ?? {};

        if (obj.type === 'relation') {
          res.push(objRaw);
          return res;
        }

        if (obj.type === 'htmllabels') obj.type = 'hypertextlabels';
        if (obj.normalization) obj.meta = { ...obj.meta, text: [obj.normalization] };
        const tagNames = self.names;

        // Clear non-existent labels
        if (obj.type.endsWith('labels')) {
          const keys = Object.keys(obj.value);

          for (let key of keys) {
            if (key.endsWith('labels')) {
              const hasControlTag = tagNames.has(obj.from_name) || tagNames.has('labels');

              // remove non-existent labels, it actually breaks dynamic labels
              // and makes no reason overall — labels from predictions can be out of config
              if (!isFF(FF_LSDV_4988) && hasControlTag) {
                const labelsContainer = tagNames.get(obj.from_name) ?? tagNames.get('labels');
                const value = obj.value[key];

                if (value && value.length && labelsContainer.type.endsWith('labels')) {
                  const filteredValue = value.filter(labelName => !!labelsContainer.findLabel(labelName));
                  const oldKey = key;

                  key = key === labelsContainer.type ? key : labelsContainer.type;

                  if (oldKey !== key) {
                    obj.type = key;
                    obj.value[key] = obj.value[oldKey];
                    delete obj.value[oldKey];
                  }

                  if (filteredValue.length !== value.length) {
                    obj.value[key] = filteredValue;
                  }
                }
              }

              // detect most relevant label tags if that one from from_name is missing
              // can be useful for predictions in old format with config in new format:
              // Rectangle + Labels -> RectangleLabels
              if (
                !tagNames.has(obj.from_name) ||
                (!obj.value[key].length && !tagNames.get(obj.from_name).allowempty)
              ) {
                delete obj.value[key];
                if (tagNames.has(obj.to_name)) {
                  // Redirect references to existent tool
                  const targetObject = tagNames.get(obj.to_name);
                  const states = targetObject.states();

                  if (states?.length) {
                    const altToolsControllerType = obj.type.replace(/labels$/, '');
                    const sameLabelsType = obj.type;
                    const simpleLabelsType = 'labels';

                    for (const altType of [altToolsControllerType, sameLabelsType, simpleLabelsType]) {
                      const state = states.find(state => state.type === altType);

                      if (state) {
                        obj.type = altType;
                        obj.from_name = state.name;
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        if (tagNames.has(obj.from_name) && tagNames.has(obj.to_name)) {
          res.push(obj);
        }

        // Insert image dimensions from result 
        (() => {
          if (!isDefined(obj.original_width)) return;
          if (!tagNames.has(obj.to_name)) return;

          const tag = tagNames.get(obj.to_name);

          if (tag.type !== 'image') return;

          const imageEntity = tag.findImageEntity(obj.item_index ?? 0);

          if (!imageEntity) return;

          imageEntity.setNaturalWidth(obj.original_width);
          imageEntity.setNaturalHeight(obj.original_height);
        })();

        return res;
      }, []);
    },

    setSuggestions(rawSuggestions) {
      const { history } = self;

      self.suggestions.clear();

      if (!rawSuggestions) return;
      self.deserializeResults(rawSuggestions, {
        suggestions: true,
      });

      self.isSuggestionsAccepting = true;
      if (getRoot(self).autoAcceptSuggestions) {
        if (isFF(FF_DEV_1284)) {
          self.history.setReplaceNextUndoState(true);
        }
        self.acceptAllSuggestions();
      } else {
        self.suggestions.forEach((suggestion) => {
          // regions that can't be accepted in usual way, should be auto-accepted;
          const supportSuggestions = suggestion.supportSuggestions;

          // If we cannot display suggestions on object/control then just accept them
          if (!supportSuggestions) {
            self.acceptSuggestion(suggestion.id);
            if (isFF(FF_DEV_1284)) {
              // This is necessary to prevent the occurrence of new steps in the history after updating objects at the end of current method
              history.setReplaceNextUndoState(true);
            }
          }
        });
      }
      self.isSuggestionsAccepting = false;

      if (!isFF(FF_DEV_1284)) {
        history.freeze('richtext:suggestions');
      }
      self.names.forEach(tag => tag.needsUpdate?.({ suggestions: true }));
      if (!isFF(FF_DEV_1284)) {
        history.setReplaceNextUndoState(true);
        history.unfreeze('richtext:suggestions');
      }
    },

    cleanClassificationAreas() {
      const classificationAreasByControlName = {};
      const duplicateAreaIds = [];

      self.areas.forEach(a => {
        const controlName = a.results[0].from_name.name;
        // May be null but null is also valid key in this case
        const itemIndex = a.item_index;

        if (a.classification) {
          if (classificationAreasByControlName[controlName]?.[itemIndex]) {
            duplicateAreaIds.push(classificationAreasByControlName[controlName][itemIndex]);
          }
          classificationAreasByControlName[controlName] = classificationAreasByControlName[controlName] || {};
          classificationAreasByControlName[controlName][itemIndex] = a.id;
        }
      });
      duplicateAreaIds.forEach(id => self.areas.delete(id));
    },

    /**
     * Deserialize results
     * @param {string | Array<any>} json Input results
     * @param {{
     * suggestions: boolean
     * }} options Deserialization options
     */
    deserializeResults(json, { suggestions = false, hidden = false } = {}) {
      try {
        const objAnnotation = self.prepareAnnotation(json);
        const areas = suggestions ? self.suggestions : self.areas;

        self._initialAnnotationObj = objAnnotation;

        objAnnotation.forEach(obj => {
          self.deserializeSingleResult(obj,
            (id) => areas.get(id),
            (snapshot) => areas.put(snapshot),
          );
        });

        // It's not necessary, but it's calmer with this
        if (isFF(FF_DEV_2100)) self.cleanClassificationAreas();

        !hidden && self.results
          .filter(r => r.area.classification)
          .forEach(r => r.from_name.updateFromResult?.(r.mainValue));

        objAnnotation.forEach(obj => {
          if (obj['type'] === 'relation') {
            self.relationStore.deserializeRelation(
              `${obj.from_id}#${self.id}`,
              `${obj.to_id}#${self.id}`,
              obj.direction,
              obj.labels,
            );
          }
        });
      } catch (e) {
        console.error(e);
        self.list.addErrors([errorBuilder.generalError(e)]);
      }
    },

    deserializeAnnotation(...args) {
      console.warn('deserializeAnnotation() is deprecated. Use deserializeResults() instead');
      return self.deserializeResults(...args);
    },

    prepareAnnotation(rawAnnotation) {
      let objAnnotation = rawAnnotation;

      if (typeof objAnnotation !== 'object') {
        objAnnotation = JSON.parse(objAnnotation);
      }

      objAnnotation = self.fixBrokenAnnotation(objAnnotation ?? []);

      return objAnnotation;
    },

    deserializeSingleResult(obj, getArea, createArea) {
      if (obj['type'] !== 'relation') {
        const { id, value: rawValue, type, ...data } = obj;
        let { from_name, to_name } = data;

        const object = self.names.get(data.to_name) ?? {};
        const tagType = object.type;

        // avoid duplicates of the same areas in different annotations/predictions
        const areaId = `${id || guidGenerator()}#${self.id}`;
        const resultId = `${data.from_name}@${areaId}`;
        const value = self.prepareValue(rawValue, tagType);
        // This should fix a problem when the order of results is broken
        const omitValueFields = (value) => {
          const newValue = { ...value };

          Result.properties.value.propertyNames.forEach(propName => {
            delete newValue[propName];
          });
          return newValue;
        };

        if (isFF(FF_DEV_3391)) {
          to_name = `${to_name}@${self.id}`;
          from_name = `${from_name}@${self.id}`;
        }

        let area = getArea(areaId);

        if (!area) {
          const areaSnapshot = {
            id: areaId,
            object: to_name,
            ...data,
            // We need to omit value properties due to there may be conflicting property types, for example a text.
            ...omitValueFields(value),
            value,
          };

          area = createArea(areaSnapshot);

          if (isFF(FF_LSDV_4583)) {
            // store copy of the original result inside the area
            // useful when you need to serialize a result without
            // updating it from current/actual data
            // For safety reasons this object is always readonly
            Object.defineProperty(area, '_rawResult', {
              value: Object.freeze(structuredClone(obj)),
            });
          }
        }

        area.addResult({ ...data, id: resultId, type, value, from_name, to_name });

        // if there is merged result with region data and type and also with the labels
        // and object allows such merge — create new result with these labels
        if (!type.endsWith('labels') && value.labels && object.mergeLabelsAndResults) {
          const labels = value.labels;
          const labelControl = object.states()?.find(control => control?.findLabel(labels[0]));

          area.setValue(labelControl);
          area.results.find(r => r.type.endsWith('labels'))?.setValue(labels);
        }
      }
    },

    prepareValue(value, type) {
      switch (type) {
        case 'text':
        case 'hypertext':
        case 'richtext': {
          const hasStartEnd = isDefined(value.start) && isDefined(value.end);
          const lacksOffsets = !isDefined(value.startOffset) && !isDefined(value.endOffset);

          // @todo move this Text regions offsets transform to RichTextRegion
          if (hasStartEnd && lacksOffsets) {
            return Object.assign({}, value, {
              start: '',
              end: '',
              startOffset: Number(value.start),
              endOffset: Number(value.end),
              isText: true,
            });
          }
          break;
        }
        default:
          return value;
      }

      return value;
    },

    acceptAllSuggestions() {
      Array.from(self.suggestions.keys()).forEach((id) => {
        self.acceptSuggestion(id);
      });
      self.deleteAllDynamicregions(isFF(FF_DEV_1284));
    },

    rejectAllSuggestions() {
      Array.from(self.suggestions.keys).forEach((id) => {
        self.suggestions.delete(id);
      });
      self.deleteAllDynamicregions(isFF(FF_DEV_1284));
    },

    deleteAllDynamicregions(silent = false) {
      self.regions.forEach(r => {
        if (r.dynamic) {
          if (silent) {
            // dirty hack to prevent sending regionFinishedDrawing notification
            r.setDrawing(true);
          }
          r.deleteRegion();
        }
      });
    },

    acceptSuggestion(id) {
      const item = self.suggestions.get(id);
      let itemId = id;
      const isGlobalClassification = item.classification;

      // this piece of code prevents from creating duplicated global classifications
      if (isFF(FF_LLM_EPIC)) {
        if (isGlobalClassification) {
          const itemResult = item.results[0];
          const areasIterator = self.areas.values();

          for (const area of areasIterator) {
            const areaResult = area.results[0];
            const isFound = areaResult.from_name === itemResult.from_name
              && areaResult.to_name === itemResult.to_name
              && areaResult.item_index === itemResult.item_index;

            if (isFound) {
              itemId = area.id;
              break;
            }
          }
        } else {
          // @todo: there is a strange behaviour that should be documented somewhere
          // On serialization we use area id as result id to save it somewhere
          // and on deserialization we use result id as area id
          // but when we use suggestions we should keep in mind that we need to do it manually or use serialized data instead
          // or we can get weird regions duplication in some cases
          const area = self.areas.get(item.cleanId);

          if (area) {
            itemId = area.id;
          }
        }
      }

      self.areas.set(itemId, {
        ...item.toJSON(),
        id: itemId,
        fromSuggestion: true,
      });
      const area = self.areas.get(itemId);
      const activeStates = area.object.activeStates();

      activeStates.forEach(state => {
        area.setValue(state);
      });
      self.suggestions.delete(id);

    },

    rejectSuggestion(id) {
      self.suggestions.delete(id);
    },

    resetReady() {
      self.objects.forEach(object => object.setReady && object.setReady(false));
      self.areas.forEach(area => area.setReady && area.setReady(false));
    },
  }));
