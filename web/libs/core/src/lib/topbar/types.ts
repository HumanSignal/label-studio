/**
 * Shared TopBar contract types.
 *
 * These types are the only thing the shared TopBar layer in `@humansignal/core/lib/topbar`
 * accepts. They MUST stay independent of MobX/MST and Jotai. Each editor implements a thin
 * wrapper that maps its own state graph onto these props.
 */

/**
 * Plain user shape consumed by the shared annotation tab.
 *
 * Mirrors the new editor's `ShellUser` shape, but accepts both `firstName/lastName`
 * (camelCase) and `first_name/last_name` (snake_case) so wrappers can pass MST objects
 * directly without renaming. Wrappers should still strip MST proxies before forwarding.
 */
export interface SharedUser {
  id?: number | string | null;
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
  initials?: string | null;
}

/**
 * The single annotation/prediction descriptor consumed by the shared TopBar.
 *
 * Wrappers translate their live store entity (MST node or Jotai atom value) into this
 * plain object every render. No live references must escape the wrapper layer.
 */
export interface SharedAnnotation {
  /** Stable client-side id (always defined). */
  id: string;
  /** Server-assigned id, `null` for unsaved drafts. */
  pk: string | null;
  type: "annotation" | "prediction";
  selected: boolean;
  /** Display name fallback when `user` lacks resolvable data (typically email/username). */
  createdBy: string;
  createdDate: string;
  /** ISO timestamp of the last update (server `updated_at` or draft save time). */
  updatedDate?: string;
  user: SharedUser | null;
  groundTruth: boolean;
  skipped: boolean;
  editable?: boolean;
  /** When true, the tab shows a hatched/striped top border (unsaved/temporary state). */
  ephemeral?: boolean;
  /** Server-assigned draft id, 0 when no saved draft. */
  draftId: number | null;
  score: number | null;
  commentCount: number;
  unresolvedCommentCount: number;
  userGenerate?: boolean;
  sentUserGenerate?: boolean;
  acceptedState: "accepted" | "rejected" | "fixed" | "fixed_and_accepted" | null;
  resultCount?: number;
  versions?: { draft?: unknown[]; result?: unknown[] };
}

/**
 * Per-editor capability flags. Drives menu item visibility and the carousel render path.
 *
 * The shared layer never reads its own capabilities from a global; the wrapper computes
 * them from `hasInterface(...)` (classic) or `useHasInterface(...)` (shell).
 */
export interface AnnotationCapabilities {
  groundTruthEnabled: boolean;
  enableCreateAnnotation: boolean;
  enableAnnotationDelete: boolean;
  enablePredictionDelete?: boolean;
  enableAnnotations: boolean;
  enablePredictions: boolean;
  enableCopyLink: boolean;
  /**
   * When true (default), the "Copy Annotation ID" / "Copy Prediction ID" item
   * is shown in the context menu. The new editor wrapper sets this to `false`
   * when the host's `allowed_iframe_permissions` policy excludes
   * `clipboard-write` so users aren't shown an action that the broker would
   * deny. Classic editor leaves this `true` (no sandbox).
   */
  enableCopyAnnotationId?: boolean;
  /**
   * When true (default), the "Compare All Annotations" item is shown in the
   * context menu. Wrappers MUST set this from the same interface flag that
   * gates the left-side ViewAllToggle (`annotations:view-all`) so the menu
   * item can never trigger an action that the host has disabled.
   *
   * Defaulting to `true` keeps the contract backward-compatible for any
   * out-of-tree consumer that hasn't been updated yet — both in-tree
   * wrappers (classic + shell) pass an explicit value.
   */
  enableCompareAllAnnotations?: boolean;
  /** When true, the "Open Performance Dashboard" item is shown (LSE only, with project id). */
  enablePerformanceDashboard?: boolean;
  /** When true, show Accepted / Rejected / Fix + Accepted filters (LSE only). */
  enableReviewStatusFilters?: boolean;
  /** When false, the user-info row is rendered as "Me"/"User" (annotations:hide-info). */
  showUserInfo: boolean;
}

/**
 * Pure callback bundle the shared TopBar invokes. The wrapper is the only place
 * MST/Jotai actions run.
 */
export interface AnnotationActionHandlers {
  onSelect: (annotation: SharedAnnotation) => void;
  onSetGroundTruth: (annotation: SharedAnnotation, value: boolean) => void;
  onDuplicate: (annotation: SharedAnnotation) => void;
  /** Wrapper is responsible for confirmation modal (classic) before invoking. */
  onDelete: (annotation: SharedAnnotation) => void;
  /**
   * Toggle the "compare all annotations" / view-all state. The action is global
   * (no per-annotation argument) — both wrappers map this onto a store-level
   * `toggleViewingAllAnnotations()` / `toggleViewAll()` action.
   */
  onShowOtherAnnotations: () => void;
  /** Optional: open the performance dashboard for this annotation's user/project. */
  onOpenPerformanceDashboard?: (annotation: SharedAnnotation) => void;
  /** Optional: invoked after any menu item closes the dropdown — used by classic for refresh hooks. */
  onAnnotationChange?: () => void;
}

/** Annotation list layout orientation. */
export type AnnotationsListLayout = "horizontal" | "vertical";

/** Sort field for the annotations list. */
export type AnnotationsListSortField = "createdAt" | "updatedAt" | "name";

/** Sort direction for the annotations list. */
export type AnnotationsListSortDirection = "asc" | "desc";

/** Persisted sort state for the annotations list. */
export interface AnnotationsListSortState {
  field: AnnotationsListSortField;
  direction: AnnotationsListSortDirection;
}

/** @deprecated Use {@link AnnotationsListSortField} */
export type AnnotationsListSort = AnnotationsListSortField;

/** Type filter for the annotation list. */
export type AnnotationsListTypeFilter = "all" | "annotation" | "prediction";

/** Tri-state boolean filter: `null` = any, `true` / `false` = match that value. */
export type AnnotationsListBooleanFilter = true | false | null;

/** Status field keys for the annotation list boolean filters. */
export type AnnotationsListStatusField =
  | "draft"
  | "groundTruth"
  | "skipped"
  | "unresolvedComments"
  | "reviewed"
  | "accepted"
  | "rejected"
  | "fixedAndAccepted";

/** @deprecated Use {@link AnnotationsListStatusField} */
export type AnnotationsListStatusFilter = AnnotationsListStatusField;

/** Boolean status filters for the annotation list (AND semantics across active fields). */
export interface AnnotationsListStatusFilters {
  draft: AnnotationsListBooleanFilter;
  groundTruth: AnnotationsListBooleanFilter;
  skipped: AnnotationsListBooleanFilter;
  unresolvedComments: AnnotationsListBooleanFilter;
  reviewed: AnnotationsListBooleanFilter;
  accepted: AnnotationsListBooleanFilter;
  rejected: AnnotationsListBooleanFilter;
  fixedAndAccepted: AnnotationsListBooleanFilter;
}

/** Persisted filter state for the annotations list. */
export interface AnnotationsListFilter {
  query: string;
  type: AnnotationsListTypeFilter;
  statuses: AnnotationsListStatusFilters;
}

/**
 * Props the shared `TopBar` layout accepts. Children are usually `<AnnotationsCarousel/>`
 * or a wrapper composition of it. Visibility gates remain in the per-editor wrapper.
 */
export interface TopBarSlotProps {
  /** Whether to render the bar at all (false = nothing rendered, gates live in wrappers). */
  visible: boolean;
  showViewAll: boolean;
  isViewAll: boolean;
  onToggleViewAll: () => void;
  showAddNew: boolean;
  onAddNew: () => void;
  /** Carousel slot — usually the `AnnotationsCarousel`, but the wrapper composes it freely. */
  children?: React.ReactNode;
}
