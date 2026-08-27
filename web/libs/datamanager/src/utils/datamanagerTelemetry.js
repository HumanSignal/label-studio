import { emitEvent } from "@humansignal/core/telemetry";

const COMPARE_ALL_VIEW_STORAGE_KEY = "view-all-tab";

function parseAnnotationPk(pk) {
  if (pk == null || pk === "") return null;
  if (typeof pk === "number") return Number.isFinite(pk) ? pk : null;
  const trimmed = String(pk).trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Labeling UI display context after LSF finishes loading a quickview task. */
export function labelingDisplayViewFromLsf(lsf) {
  const lsfRoot = lsf?.lsf;
  const annotationStore = lsfRoot?.annotationStore;
  if (!annotationStore) {
    return { labeling_view: "unknown", view: null, annotation_tab_id: null, annotation_pk: null };
  }
  if (annotationStore.viewingAll) {
    const hasSummary = lsfRoot?.hasInterface?.("annotations:summary");
    let view = "compare";
    if (hasSummary) {
      try {
        view = localStorage.getItem(COMPARE_ALL_VIEW_STORAGE_KEY) === "compare" ? "compare" : "summary";
      } catch {
        view = "summary";
      }
    }
    return {
      labeling_view: "compare_all",
      view,
      annotation_tab_id: null,
      annotation_pk: null,
    };
  }
  const selected = annotationStore.selected;
  if (!selected) {
    return { labeling_view: "annotation_tab", view: null, annotation_tab_id: null, annotation_pk: null };
  }
  return {
    labeling_view: "annotation_tab",
    view: null,
    annotation_tab_id: String(selected.id),
    annotation_pk: parseAnnotationPk(selected.pk),
    annotation_type: selected.type,
  };
}

/**
 * Data Manager telemetry gateway — the **only** module in DM that may import core/telemetry.
 *
 * Product code calls this so PRs have one review surface and CI can block direct imports.
 * Defers ingest (setTimeout 0) and swallows errors so tracking never interleaves with DM
 * state updates or throws into product paths — same contract as interface-telemetry.ts.
 */
export function emitDatamanagerEvent(eventName, properties = {}) {
  setTimeout(() => {
    try {
      void emitEvent(eventName, properties);
    } catch {
      // Observe-only — never surface telemetry failures to product code.
    }
  }, 0);
}
