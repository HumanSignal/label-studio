/**
 * mobx store for ML-backend capabilities, keyed by projectId.
 *
 * Design goals:
 *   - One fetch per (projectId, backendId), shared across all components.
 *   - Observable so the UI re-renders when capabilities land.
 *   - Lives outside the editor's MST tree so we don't couple enterprise
 *     code to OSS AppStore internals.
 *
 * The repo is on mobx 5 (no `makeObservable`/`makeAutoObservable`,
 * no decorators) — we use `decorate()` + `observable.map`.
 */

import { action, decorate, observable, runInAction } from "mobx";

import { fetchCapabilities, fetchInteractiveBackends } from "./api";
import type { Capabilities, InteractiveBackend, InteractiveBinding } from "./types";

type ProjectStatus = "idle" | "loading" | "loaded" | "error";

class ProjectSlot {
  status: ProjectStatus = "idle";
  error: string | null = null;
  backends = observable.map<number, InteractiveBackend>({}, { deep: false });
  // non-observable: just a concurrency guard
  loadPromise: Promise<void> | null = null;
}
decorate(ProjectSlot, {
  status: observable,
  error: observable,
});

class InteractiveCapabilityStore {
  // Observable map so UI components that read a slot before it exists
  // (page-load race: bar renders → useEffect schedules `load()` → slot
  // appears asynchronously) still get a re-render once the slot lands.
  // With a plain Map, the first `.get(projectId)` returning `undefined`
  // subscribed the observer to nothing, so capabilities that arrived later
  // were invisible until some unrelated observable changed.
  private projects = observable.map<number, ProjectSlot>({}, { deep: false });

  private slot(projectId: number): ProjectSlot {
    let slot = this.projects.get(projectId);
    if (!slot) {
      slot = new ProjectSlot();
      runInAction(() => {
        this.projects.set(projectId, slot as ProjectSlot);
      });
    }
    return slot;
  }

  getStatus(projectId: number): ProjectStatus {
    return this.projects.get(projectId)?.status ?? "idle";
  }

  getBackends(projectId: number): InteractiveBackend[] {
    const slot = this.projects.get(projectId);
    if (!slot) return [];
    return Array.from(slot.backends.values());
  }

  /**
   * Flattened (backend × control-tag) list. Callers filter this by the
   * control tag type they need — see `useBindingsForControl`.
   */
  getBindings(projectId: number): InteractiveBinding[] {
    const bindings: InteractiveBinding[] = [];
    for (const backend of this.getBackends(projectId)) {
      for (const target of backend.capabilities.targets) {
        bindings.push({
          backendId: backend.id,
          backendTitle: backend.title,
          modelInfo: backend.capabilities.model_info,
          controlTag: target.tag,
          output: target.output,
          prompts: backend.capabilities.prompts,
          features: new Set(target.features ?? []),
        });
      }
    }
    return bindings;
  }

  /**
   * Ensure capabilities for every interactive backend under `projectId`
   * are loaded. Concurrent calls across components share the same fetch
   * via `slot.loadPromise`.
   */
  load(projectId: number, taskId: number): Promise<void> {
    const slot = this.slot(projectId);
    if (slot.loadPromise) return slot.loadPromise;
    if (slot.status === "loaded") return Promise.resolve();

    slot.loadPromise = (async () => {
      runInAction(() => {
        slot.status = "loading";
        slot.error = null;
      });
      try {
        const summaries = await fetchInteractiveBackends(projectId);
        const results = await Promise.all(
          summaries.map(async (s) => {
            const caps = await fetchCapabilities(s.id, taskId);
            return caps ? ({ id: s.id, title: s.title, capabilities: caps } as InteractiveBackend) : null;
          }),
        );
        runInAction(() => {
          slot.backends.clear();
          for (const b of results) {
            if (b) slot.backends.set(b.id, b);
          }
          slot.status = "loaded";
        });
      } catch (err: any) {
        runInAction(() => {
          slot.status = "error";
          slot.error = err?.message ?? "Failed to load ML capabilities";
        });
      } finally {
        slot.loadPromise = null;
      }
    })();

    return slot.loadPromise;
  }

  /** Wipe a project's cache — use after backend-settings changes. */
  invalidate(projectId: number) {
    this.projects.delete(projectId);
  }

  invalidateAll() {
    this.projects.clear();
  }
}
decorate(InteractiveCapabilityStore, {
  invalidate: action,
  invalidateAll: action,
});

export const interactiveCapabilityStore = new InteractiveCapabilityStore();
export type { InteractiveCapabilityStore };
export type { Capabilities };
