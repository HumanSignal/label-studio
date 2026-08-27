import { emitEvent } from "@humansignal/core/telemetry";

type LabelingStore = {
  project?: { id?: number | string | null };
  task?: { id?: number | string | null };
  reviewMode?: boolean;
  hasInterface?: (name: string) => boolean;
};

type LabelingEntity = {
  pk?: number | string | null;
  id?: number | string | null;
  type?: string;
  leadTime?: number;
  ground_truth?: boolean;
  was_cancelled?: boolean;
  serializeAnnotation?: () => unknown[];
};

type LabelingRegion = {
  id?: string | number;
  type?: string;
  selected?: boolean;
};

export type AnnotationTabSelectTrigger = "user_click" | "auto_select";

/** Parse a persisted annotation database pk; returns null for drafts / non-numeric ids. */
export function parseAnnotationPk(pk: string | number | null | undefined): number | null {
  if (pk == null || pk === "") return null;
  if (typeof pk === "number") return Number.isFinite(pk) ? pk : null;
  const trimmed = String(pk).trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function annotationTelemetryIds(entity: LabelingEntity) {
  return {
    annotation_tab_id: String(entity.id),
    annotation_pk: parseAnnotationPk(entity.pk ?? null),
  };
}

export function previousAnnotationTelemetryIds(previous: LabelingEntity | null | undefined) {
  if (!previous?.id) {
    return {
      previous_annotation_tab_id: null as string | null,
      previous_annotation_pk: null as number | null,
    };
  }
  const ids = annotationTelemetryIds(previous);
  return {
    previous_annotation_tab_id: ids.annotation_tab_id,
    previous_annotation_pk: ids.annotation_pk,
  };
}

export function sourceAnnotationTelemetryIds(entity: LabelingEntity) {
  const ids = annotationTelemetryIds(entity);
  return {
    source_annotation_tab_id: ids.annotation_tab_id,
    source_annotation_pk: ids.annotation_pk,
  };
}

export function labelingTelemetryContext(store: LabelingStore | null | undefined) {
  return {
    project_id: store?.project?.id,
    task_id: store?.task?.id,
    review_mode: Boolean(store?.reviewMode),
  };
}

export function emitLabelingEvent(
  store: LabelingStore | null | undefined,
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  emitEvent(eventName, { ...labelingTelemetryContext(store), ...properties });
}

export type CompareAllView = "summary" | "compare";

/** Same key as ViewAll `usePersistentState` — read only for open-time telemetry. */
export const COMPARE_ALL_VIEW_STORAGE_KEY = "view-all-tab";

export function readPersistedCompareAllView(): CompareAllView {
  if (typeof window === "undefined") return "summary";
  return window.localStorage.getItem(COMPARE_ALL_VIEW_STORAGE_KEY) === "compare" ? "compare" : "summary";
}

export function emitCompareAllViewSelected(store: LabelingStore | null | undefined, view: CompareAllView): void {
  emitLabelingEvent(store, "label_compare_view_selected", { view });
}

export function labelingDisplayViewProps(
  store: LabelingStore | null | undefined,
  options: { viewingAll: boolean; entity?: LabelingEntity | null },
): Record<string, unknown> {
  if (options.viewingAll) {
    const view = store?.hasInterface?.("annotations:summary") ? readPersistedCompareAllView() : "compare";
    return {
      labeling_view: "compare_all",
      view,
      annotation_tab_id: null,
      annotation_pk: null,
    };
  }
  const ids = options.entity?.id
    ? annotationTelemetryIds(options.entity)
    : { annotation_tab_id: null, annotation_pk: null };
  return {
    labeling_view: "annotation_tab",
    view: null,
    ...ids,
    ...(options.entity?.type ? { annotation_type: options.entity.type } : {}),
  };
}

export function emitCompareAllClosed(
  store: LabelingStore | null | undefined,
  restoredEntity: LabelingEntity | null | undefined,
): void {
  emitLabelingEvent(store, "label_compare_all_closed", {
    ...labelingDisplayViewProps(store, { viewingAll: false, entity: restoredEntity }),
  });
}

export function emitOverviewOpenedOrClosed(store: LabelingStore | null | undefined, action: "opened" | "closed"): void;
export function emitOverviewOpenedOrClosed(
  store: LabelingStore | null | undefined,
  action: "closed",
  restoredEntity: LabelingEntity | null | undefined,
): void;
export function emitOverviewOpenedOrClosed(
  store: LabelingStore | null | undefined,
  action: "opened" | "closed",
  restoredEntity?: LabelingEntity | null,
): void {
  if (action === "closed") {
    emitCompareAllClosed(store, restoredEntity ?? null);
    return;
  }
  const view = store?.hasInterface?.("annotations:summary") ? readPersistedCompareAllView() : "compare";
  emitCompareAllViewSelected(store, view);
}

export function annotationActionProps(
  store: LabelingStore | null | undefined,
  entity: LabelingEntity | null | undefined,
) {
  const ids = entity?.id ? annotationTelemetryIds(entity) : { annotation_tab_id: null, annotation_pk: null };
  return {
    ...ids,
    lead_time: entity?.leadTime,
    result_count: entity?.serializeAnnotation?.()?.length || 0,
    ground_truth: Boolean(entity?.ground_truth),
    was_skip: Boolean(entity?.was_cancelled),
    review_mode: Boolean(store?.reviewMode),
  };
}

export function emitAnnotationCreated(
  store: LabelingStore | null | undefined,
  entity: LabelingEntity,
  source: "new" | "duplicate",
  sourceEntity?: LabelingEntity | null,
) {
  emitLabelingEvent(store, "annotation_created", {
    ...annotationTelemetryIds(entity),
    source,
    auto_selected: true,
    ...(sourceEntity ? sourceAnnotationTelemetryIds(sourceEntity) : {}),
  });
}

export function emitAnnotationTabSelected(
  store: LabelingStore | null | undefined,
  entity: LabelingEntity,
  previous: LabelingEntity | null | undefined,
  options: {
    exitViewAll?: boolean;
    trigger?: AnnotationTabSelectTrigger;
  } = {},
) {
  emitLabelingEvent(store, "annotation_tab_selected", {
    ...annotationTelemetryIds(entity),
    ...previousAnnotationTelemetryIds(previous),
    annotation_type: entity.type,
    exit_view_all: Boolean(options.exitViewAll),
    trigger: options.trigger ?? "user_click",
  });
}

export function emitRegionSelected(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  region: LabelingRegion | null | undefined,
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_selected", {
    ...ids,
    region_id: region?.id,
    region_type: region?.type,
  });
}

export function emitAnnotationMenuAction(
  store: LabelingStore | null | undefined,
  entity: LabelingEntity,
  action: "copy_id" | "copy_link" | "set_ground_truth" | "delete" | "open_performance_dashboard",
  extra: Record<string, unknown> = {},
) {
  emitLabelingEvent(store, `annotation_${action}`, {
    ...annotationTelemetryIds(entity),
    annotation_type: entity.type ?? "annotation",
    ...extra,
  });
}

export function emitRegionVisibilityToggled(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: {
    region_id?: string | number | null;
    visible: boolean;
    scope: "region" | "all" | "label" | "tool";
  },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_visibility_toggled", {
    ...ids,
    region_id: options.region_id ?? null,
    visible: options.visible,
    scope: options.scope,
  });
}

export function emitRegionLockToggled(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: { region_id: string | number; locked: boolean },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_lock_toggled", {
    ...ids,
    region_id: options.region_id,
    locked: options.locked,
  });
}

export function emitRegionMenuAction(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  action: "copy_link",
  options: { region_id: string | number; region_type?: string | null },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, `region_${action}`, {
    ...ids,
    region_id: options.region_id,
    region_type: options.region_type ?? null,
  });
}

export function emitRegionListSorted(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: { sort_key: string; ascending: boolean },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_list_sorted", {
    ...ids,
    sort_key: options.sort_key,
    ascending: options.ascending,
  });
}

export function emitRegionListGrouped(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: { group_by: string },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_list_grouped", {
    ...ids,
    group_by: options.group_by,
  });
}

export function emitRegionFilterToggled(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: { filter_open: boolean },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_filter_toggled", {
    ...ids,
    filter_open: options.filter_open,
  });
}

export function emitRegionListFiltered(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: { filter_query: string; match_count: number },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_list_filtered", {
    ...ids,
    filter_query: options.filter_query,
    match_count: options.match_count,
  });
}

export function emitRelationCreated(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: {
    relation_id?: string | number | null;
    source_region_id: string | number;
    target_region_id: string | number;
  },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "relation_created", {
    ...ids,
    relation_id: options.relation_id ?? null,
    source_region_id: options.source_region_id,
    target_region_id: options.target_region_id,
  });
}

export function emitRelationVisibilityToggled(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: {
    relation_id?: string | number | null;
    visible: boolean;
    scope: "relation" | "all";
  },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "relation_visibility_toggled", {
    ...ids,
    relation_id: options.relation_id ?? null,
    visible: options.visible,
    scope: options.scope,
  });
}

export function emitRegionDeleted(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: { region_id: string | number; region_type?: string | null },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "region_deleted", {
    ...ids,
    region_id: options.region_id,
    region_type: options.region_type ?? null,
  });
}

export function emitRelationDirectionChanged(
  store: LabelingStore | null | undefined,
  annotation: LabelingEntity | null | undefined,
  options: {
    relation_id?: string | number | null;
    direction: "left" | "right" | "bi";
  },
) {
  const ids = annotation?.id ? annotationTelemetryIds(annotation) : { annotation_tab_id: null, annotation_pk: null };
  emitLabelingEvent(store, "relation_direction_changed", {
    ...ids,
    relation_id: options.relation_id ?? null,
    direction: options.direction,
  });
}

export function emitLabelSidebarToggled(
  store: LabelingStore | null | undefined,
  options: { side: string; collapsed: boolean },
) {
  emitLabelingEvent(store, "label_sidebar_toggled", options);
}
