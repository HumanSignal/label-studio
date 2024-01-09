import { applySnapshot, getEnv, getSnapshot, onSnapshot, resolvePath, types } from 'mobx-state-tree';
import { FF_DEV_1284, isFF } from '../utils/feature-flags';

/**
 * Time Traveller
 */
const TimeTraveller = types
  .model('TimeTraveller', {
    undoIdx: 0,
    targetPath: '',
    skipNextUndoState: types.optional(types.boolean, false),
    lastAdditionTime: types.optional(types.Date, new Date()),
    createdIdx: 0,
  })
  .volatile(() => ({
    history: [],
    isFrozen: false,
  }))
  .views(self => ({
    get canUndo() {
      return self.undoIdx > 0;
    },
    get canRedo() {
      return self.undoIdx < self.history.length - 1;
    },
    get hasChanges() {
      return self.history.length > 1;
    },
  }))
  .actions(self => {
    let targetStore;
    let snapshotDisposer;
    const updateHandlers = new Set();
    // A way to handle multiple simultaneous freezes from different places
    const freezingLockSet = new Set();
    let changesDuringFreeze = false;
    let replaceNextUndoState = false;

    function triggerHandlers(force = true) {
      updateHandlers.forEach(handler => handler(force));
    }

    return {
      freeze(key) {
        freezingLockSet.add(key);
        if (!self.isFrozen) {
          changesDuringFreeze = false;
          self.isFrozen = true;
        }
      },

      safeUnfreeze(key) {
        freezingLockSet.delete(key);
        self.isFrozen = freezingLockSet.size > 0;
      },

      unfreeze(key) {
        self.safeUnfreeze(key);
        if (!self.isFrozen) {
          if (changesDuringFreeze) self.recordNow();
          self.setReplaceNextUndoState(false);
        }
      },

      setSkipNextUndoState(value = true) {
        self.skipNextUndoState = value;
      },

      setReplaceNextUndoState(value = true) {
        replaceNextUndoState = value;
      },

      recordNow() {
        if (!targetStore) return;

        self.addUndoState(getSnapshot(targetStore));
      },

      onUpdate(handler) {
        updateHandlers.add(handler);
        return () => {
          updateHandlers.delete(handler);
        };
      },

      addUndoState(recorder) {
        if (self.isFrozen) {
          changesDuringFreeze = true;
          return;
        }
        if (self.skipNextUndoState) {
          /**
           * Skip recording if this state was caused by undo / redo
           */
          self.skipNextUndoState = false;

          return;
        }

        // mutate history to trigger history-related UI items
        self.history = self.history.slice(0, self.undoIdx + !replaceNextUndoState).concat(recorder);
        self.undoIdx = self.history.length - 1;
        replaceNextUndoState = false;
        changesDuringFreeze = false;
        self.lastAdditionTime = new Date();
      },

      reinit(force = true) {
        self.history = [getSnapshot(targetStore)];
        self.undoIdx = 0;
        self.createdIdx = 0;
        triggerHandlers(force);
      },

      afterCreate() {
        targetStore = self.targetPath ? resolvePath(self, self.targetPath) : getEnv(self).targetStore;

        if (!targetStore)
          throw new Error(
            'Failed to find target store for TimeTraveller. Please provide `targetPath` property, or a `targetStore` in the environment',
          );
        // start listening to changes
        snapshotDisposer = onSnapshot(targetStore, snapshot => this.addUndoState(snapshot));
        // record an initial state if no known
        if (self.history.length === 0) {
          self.recordNow();
        }

        self.createdIdx = self.undoIdx;
      },

      beforeDestroy() {
        snapshotDisposer();
        targetStore = null;
        snapshotDisposer = null;
        updateHandlers.clear();
        freezingLockSet.clear();
      },

      undo() {
        self.set(self.undoIdx - 1);
      },

      redo() {
        self.set(self.undoIdx + 1);
      },

      set(idx) {
        self.undoIdx = idx;
        self.skipNextUndoState = true;
        applySnapshot(targetStore, self.history[idx]);
        triggerHandlers();
        if (isFF(FF_DEV_1284)) {
          setTimeout(() => {
            // Prevent skiping next undo state if onSnapshot event was somehow missed after applying snapshot
            self.setSkipNextUndoState(false);
          });
        }
      },

      reset() {
        // just apply zero state; it would be added as a new hisory item
        applySnapshot(targetStore, self.history[self.createdIdx]);
        triggerHandlers();
      },
    };
  });

export default TimeTraveller;
