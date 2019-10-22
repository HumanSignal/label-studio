import { types, resolvePath, getEnv, onSnapshot, getSnapshot, applySnapshot } from "mobx-state-tree";

const TimeTraveller = types
  .model("TimeTraveller", {
    history: types.array(types.frozen()),
    undoIdx: -1,
    targetPath: "",

    createdIdx: 1,

    isFrozen: types.optional(types.boolean, false),
    frozenIdx: -1,
  })
  .views(self => ({
    get canUndo() {
      // [TODO] since we initialize state a bit incorrectly we end up with 2 items in history
      // before even any action takes place. To protect those items we keep them in history forever
      return self.undoIdx > 1;
    },
    get canRedo() {
      return self.undoIdx < self.history.length - 1;
    },
  }))
  .actions(self => {
    let targetStore;
    let snapshotDisposer;
    let skipNextUndoState = false;

    return {
      freeze() {
        self.isFrozen = true;
        skipNextUndoState = true;
        self.frozenIdx = self.undoIdx;
      },

      addUndoState(ss) {
        if (skipNextUndoState) {
          // skip recording if this state was caused by undo / redo
          skipNextUndoState = false;
          return;
        }

        self.history.splice(self.undoIdx + 1);
        self.history.push(ss);
        self.undoIdx = self.history.length - 1;
      },

      afterCreate() {
        targetStore = self.targetPath ? resolvePath(self, self.targetPath) : getEnv(self).targetStore;

        if (!targetStore)
          throw new Error(
            "Failed to find target store for TimeTraveller. Please provide `targetPath`  property, or a `targetStore` in the environment",
          );
        // TODO: check if targetStore doesn't contain self
        // if (contains(targetStore, self)) throw new Error("TimeTraveller shouldn't be recording itself. Please specify a sibling as taret, not some parent")
        // start listening to changes
        snapshotDisposer = onSnapshot(targetStore, snapshot => this.addUndoState(snapshot));
        // record an initial state if no known
        if (self.history.length === 0) {
          this.addUndoState(getSnapshot(targetStore));
        }

        self.createdIdx = self.undoIdx;
      },

      beforeDestroy() {
        snapshotDisposer();
      },

      undo() {
        if (self.isFrozen && self.frozenIdx <= self.undoIdx) return;

        self.undoIdx--;
        skipNextUndoState = true;
        applySnapshot(targetStore, self.history[self.undoIdx]);
      },

      redo() {
        self.undoIdx++;
        skipNextUndoState = true;
        applySnapshot(targetStore, self.history[self.undoIdx]);
      },

      set(idx) {
        self.undoIdx = idx;
        skipNextUndoState = true;
        applySnapshot(targetStore, self.history[self.undoIdx]);
      },

      reset() {
        self.undoIdx = 1;
        skipNextUndoState = true;
        applySnapshot(targetStore, self.history[self.undoIdx]);
      },
    };
  });

export default TimeTraveller;
