import { type Instance, types } from "mobx-state-tree";
import { ff } from "@humansignal/core";
import { FF_DEV_3391 } from "../utils/feature-flags";

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);
/**
 * Supress all additional events during this window in ms.
 * 100ms is too short to notice, but covers enough frames (~6) for back and forth events.
 */
export const SYNC_WINDOW = 100;

export type SyncEvent = "play" | "pause" | "seek" | "speed" | "buffering";

/**
 * Currently only for reference, MST mixins don't allow to apply this interface
 */
export interface SyncTarget {
  name: string;
  sync: string;
  syncSend(data: SyncData, event: SyncEvent): void;
  syncReceive(data: SyncData, event: SyncEvent): void;
  registerSyncHandlers(): void;
  destroy(): void;
}

export interface SyncDataFull {
  time: number;
  playing: boolean;
  speed: number;
  buffering: boolean;
}

export type SyncData = Partial<SyncDataFull>;

/**
 * Sync group of tags with each other; every tag should be registered
 */
export class SyncManager {
  syncTargets = new Map<string, Instance<typeof SyncableMixin>>();
  locked: string | null = null; // refers to the main tag, which locked this sync
  audioTags = 0; // number of audio tags in the group to control muted state
  bufferingOrigins = new Set<string>(); // tracks which components are currently buffering

  get isBuffering(): boolean {
    return isSyncedBuffering ? this.bufferingOrigins.size > 0 : false;
  }

  isBufferingOrigin(name: string) {
    return this.bufferingOrigins.has(name);
  }

  register(syncTarget: Instance<typeof SyncableMixin>) {
    this.syncTargets.set(syncTarget.name, syncTarget);
    if (syncTarget.type === "audio") this.audioTags += 1;
  }

  unregister(syncTarget: Instance<typeof SyncableMixin>) {
    this.syncTargets.delete(syncTarget.name);
    if (syncTarget.type === "audio") this.audioTags -= 1;
    // @todo remove manager on empty set
  }

  isLockable(event: SyncEvent) {
    if (!isSyncedBuffering) return true;

    // buffering does not cause loops at all, so it should not lock the sync
    if (event === "buffering") {
      return false;
    }

    // play/pause events during buffering should not cause loops and should be processed anyhow, so we should avoid locking for them
    if (this.isBuffering && ["play", "pause"].includes(event)) {
      return false;
    }

    return true;
  }

  /**
   * Sync `origin` state (in `data`) to connected tags.
   * No back-sync to origin of the event.
   * During SYNC_WINDOW only events from origin are processed, others are skipped
   * @param {SyncData} data state to sync between connected tags
   * @param {string} event name of event, supplementary info, actions should rely on data
   * @param {string} origin name of the tag triggered event
   * @returns {boolean} false if event was suppressed, because it's inside other event sync window
   */
  sync(data: SyncData, event: SyncEvent, origin: string) {
    // Buffering event logging
    if (event === "buffering") {
      if (data.buffering) {
        this.bufferingOrigins.add(origin);
      } else {
        this.bufferingOrigins.delete(origin);
      }
    }

    const shouldSkipLocking = !this.isLockable(event);

    // @todo remove
    if (shouldSkipLocking || !this.locked || this.locked === origin)
      console.log("SYNC", { event, locked: this.locked, data, origin });

    if (!shouldSkipLocking) {
      if (this.locked && this.locked !== origin)
        ///// locking mechanism
        // also send events came from original tag even when sync window is locked,
        // this allows to correct state in case of coupled events like play + seek.
        return false;
      if (!this.locked) setTimeout(() => (this.locked = null), SYNC_WINDOW);
      this.locked = origin;
    }

    for (const target of this.syncTargets.values()) {
      if (origin !== target.name) {
        target.syncReceive(data, event);
      }
    }
    return true;
  }
}

export const SyncManagerFactory = {
  managers: new Map<string, SyncManager>(),

  /**
   * Retrieve or create SyncManager
   * @param name sync manager's name, can be any string
   * @param fallbackName previously `sync` attrs of two tags were referring their respective names;
   *                     for backward compatibility these names can be passed here,
   *                     so the first tag will create manager by the name of the second tag
   *                     and the second tag will get this manager by the name of this tag.
   * @returns SyncManager
   */
  get(name: string, fallbackName?: string): SyncManager {
    let manager = this.managers.get(name);

    if (!manager && fallbackName) manager = this.managers.get(fallbackName);

    if (!manager) {
      manager = new SyncManager();
      this.managers.set(name, manager);
    }

    return manager;
  },
};

export type SyncHandler = (data: SyncData, event: string) => void;

interface SyncableProps {
  syncHandlers: Map<string, SyncHandler>;
  syncManager: SyncManager | null;
}

/**
 * Tag should override `registerSyncHandlers()` or `syncReceive()` to handle sync events.
 * To trigger sync events internal methods should call `syncSend()`.
 * Should be used before ObjectBase to not break FF_DEV_3391.
 */
const SyncableMixin = types
  .model("SyncableMixin", {
    name: types.string,
    type: types.string,
    sync: types.optional(types.string, ""),
  })
  /* eslint-disable @typescript-eslint/indent */
  .volatile<SyncableProps>(() => ({
    syncHandlers: new Map(),
    syncManager: null,
    isBuffering: false,
    wasPlayingBeforeBuffering: false,
  }))
  .actions(() => ({
    syncMuted(_muted: boolean) {
      // Should be overriden in models, that can be muted, with simple code like this:
      // self.muted = muted;
    },
  }))
  /* eslint-enable @typescript-eslint/indent */
  .actions((self) => ({
    afterCreate() {
      if (!self.sync) return;

      let sync = self.sync;
      let fallbackSync = self.name;

      if (ff.isActive(FF_DEV_3391)) {
        if (!self.annotationStore.initialized) return;

        // different annotations have their own independent trees and should have independent
        // sync managers; also history items are also independent, so should have the same
        const postfix = `@${self.annotationOrHistoryItem?.id}`;
        sync += postfix;
        fallbackSync += postfix;
      }

      self.syncManager = SyncManagerFactory.get(sync, fallbackSync);
      self.syncManager!.register(self as Instance<typeof SyncableMixin>);
      (self as Instance<typeof SyncableMixin>).registerSyncHandlers();
    },

    /**
     * Tag can add handlers to `syncHandlers` here
     */
    registerSyncHandlers() {},

    syncSend(data: SyncData, event: SyncEvent) {
      if (!self.sync) return;
      if (!self.syncManager) return; // Wait until initialized

      const notSuppressed = self.syncManager.sync(data, event, self.name);

      if (notSuppressed && event === "play") {
        // Only Audio has volume controls, so Audio should not be muted,
        // while other synced tags should be muted, otherwise volume can't be controlled.
        // But if there are no Audio tags in group, the tag triggered sync
        // should be the main tag with volume active, and others should be muted.
        self.syncMuted(self.type !== "audio" && self.syncManager.audioTags > 0);
      }
    },

    syncReceive(data: SyncData, event: SyncEvent) {
      const handler = self.syncHandlers.get(event);

      if (event === "play") {
        // audio is the only tag with volume control, so don't mute it, but mute others.
        self.syncMuted(self.type !== "audio");
      }

      if (handler) {
        handler(data, event);
      }
    },

    destroy() {
      self.syncManager?.unregister(self as Instance<typeof SyncableMixin>);
    },
  }));

export { SyncableMixin };
