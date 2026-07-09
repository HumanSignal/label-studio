/**
 * Classic editor (MST) AnnotationButton wrapper.
 *
 * Mounts the shared `AnnotationButton` from `@humansignal/core/lib/topbar` and is the
 * ONLY place MobX/MST runs for the tab UI. Responsibilities that stay here:
 *   - Lazy stub hydration via `useAnnotationFetcher` + `applyAnnotationHydrationFromApi`
 *     when FF_FIT_720_LAZY_LOAD_ANNOTATIONS is on (B10).
 *   - User resolution via `useResolveUser` + `enrichUsers` for stub annotations.
 *   - Live MST → SharedAnnotation mapping (snake_case → camelCase, isAlive guard).
 *   - Delete confirmation via `editor/common/Modal/Modal#confirm` (B9).
 *   - Performance Dashboard URL construction (LSE-only, capability-gated, B6/B13).
 *   - LSE review-status read from `task.source` (preserves existing tooltip
 *     accepted/rejected/fixed badges).
 *
 * The exported component name and props (`entity, capabilities, annotationStore,
 * store, onAnnotationChange`) match the legacy API so the existing 774-line
 * `__tests__/AnnotationButton.test.tsx` continues to compile.
 */
import { useCallback, useMemo, useRef } from "react";
import { inject, observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import { ToastType, useToast } from "@humansignal/ui";
import {
  AnnotationButton as SharedAnnotationButton,
  type AnnotationActionHandlers,
  type AnnotationCapabilities,
  type AnnotationsListLayout,
  type SharedAnnotation,
  resolveClassicEntityReviewState,
} from "@humansignal/core";
import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import {
  annotationNeedsHydration,
  applyAnnotationHydrationFromApi,
} from "@humansignal/core/lib/utils/annotationLazyHydration";
import { isUserComplete, useResolveUser } from "@humansignal/core/hooks/useResolveUser";
import { isFF } from "../../utils/feature-flags";
import { useAnnotationFetcher } from "../../hooks/useAnnotationQuery";
// eslint-disable-next-line
// @ts-ignore
import { confirm } from "../../common/Modal/Modal";

interface AnnotationButtonInterface {
  entity?: any;
  capabilities?: any;
  annotationStore?: any;
  store?: any;
  onAnnotationChange?: () => void;
  layout?: AnnotationsListLayout;
}

const injector = inject(({ store }) => ({ store }));

/**
 * Map a live MST `entity` node to the plain `SharedAnnotation` shape consumed by the
 * shared TopBar layer. Reads must happen inside the observer body so MobX tracks
 * dependencies correctly; that's why this is a function called every render rather
 * than a memoized helper.
 */
function mapEntityToShared(entity: any, annotationStore: any, infoIsHidden: boolean): SharedAnnotation {
  const isPrediction = entity.type === "prediction";
  const acceptedState = resolveClassicEntityReviewState(entity, annotationStore?.store);

  // Resolve a clean SharedUser shape; respect `infoIsHidden` (annotations:hide-info).
  let user: SharedAnnotation["user"] = null;
  if (infoIsHidden) {
    const currentUser = annotationStore?.store?.user;
    const isCurrentUser = entity.user?.id === currentUser?.id || entity.createdBy === currentUser?.email;
    user = { email: isCurrentUser ? "Me" : "User" };
  } else if (entity.user && isUserComplete(entity.user)) {
    const u = entity.user;
    user = {
      id: u.id ?? null,
      firstName: u.firstName ?? u.first_name ?? null,
      lastName: u.lastName ?? u.last_name ?? null,
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      username: u.username ?? null,
      email: u.email ?? null,
      avatar: u.avatar ?? null,
      initials: u.initials ?? null,
    };
  }

  return {
    id: String(entity.id),
    pk: entity.pk != null ? String(entity.pk) : null,
    type: isPrediction ? "prediction" : "annotation",
    selected: Boolean(entity.selected),
    createdBy: entity.createdBy ?? "",
    createdDate: entity.createdDate ?? "",
    user,
    groundTruth: Boolean(entity.ground_truth),
    skipped: Boolean(entity.skipped),
    editable: entity.editable,
    draftId: entity.draftId ?? 0,
    score: typeof entity.score === "number" ? entity.score : null,
    commentCount: entity.comment_count ?? 0,
    unresolvedCommentCount: entity.unresolved_comment_count ?? 0,
    userGenerate: entity.userGenerate,
    sentUserGenerate: entity.sentUserGenerate,
    acceptedState,
    versions: entity.versions,
  };
}

const AnnotationButtonInner = injector(
  observer(
    ({ entity, capabilities = {}, annotationStore, store, onAnnotationChange, layout }: AnnotationButtonInterface) => {
      const buttonContainerRef = useRef<HTMLDivElement | null>(null);
      const toast = useToast();
      const { fetchAnnotationCached } = useAnnotationFetcher(store?.task?.id);

      const enrichUser = useCallback(
        (userData: any) => annotationStore?.store?.enrichUsers?.([userData]),
        [annotationStore],
      );
      useResolveUser({
        user: entity?.user,
        onUserResolved: enrichUser,
        elementRef: buttonContainerRef as unknown as React.RefObject<HTMLElement | undefined>,
      });

      const entityIsAlive = entity ? isAlive(entity) : false;
      const isPrediction = entityIsAlive ? entity.type === "prediction" : false;
      const infoIsHidden = annotationStore?.store?.hasInterface?.("annotations:hide-info");

      // Building the shared shape every render keeps MobX subscriptions on the entity's
      // live properties — memoizing on the entity reference would make the strip stop
      // updating when MST mutates fields in place.
      const sharedAnnotation: SharedAnnotation | null = entityIsAlive
        ? mapEntityToShared(entity, annotationStore, Boolean(infoIsHidden))
        : null;

      const isLSE = (window as any).APP_SETTINGS?.version?.edition === "Enterprise";
      const hasProjectId = !!window.location.pathname.match(/\/projects\/(\d+)/);

      const sharedCapabilities: AnnotationCapabilities = useMemo(
        () => ({
          groundTruthEnabled: Boolean(capabilities.groundTruthEnabled),
          enableCreateAnnotation: Boolean(capabilities.enableCreateAnnotation),
          enableAnnotationDelete: Boolean(capabilities.enableAnnotationDelete),
          enablePredictionDelete: Boolean(capabilities.enablePredictionDelete),
          enableAnnotations: capabilities.enableAnnotations !== false,
          enablePredictions: capabilities.enablePredictions !== false,
          enableCopyLink: Boolean(store?.hasInterface?.("annotations:copy-link")),
          // Mirror the gate used by the left-side ViewAllToggle in
          // `editor/src/components/TopBar/TopBar.jsx` so the menu item is
          // hidden when the project's interfaces don't include
          // `annotations:view-all` (otherwise the action would silently
          // toggle a state with no UI to leave it).
          enableCompareAllAnnotations: Boolean(store?.hasInterface?.("annotations:view-all")),
          enablePerformanceDashboard: isLSE && hasProjectId,
          showUserInfo: !infoIsHidden,
        }),
        [capabilities, store, isLSE, hasProjectId, infoIsHidden],
      );

      const handlers: AnnotationActionHandlers = useMemo(
        () => ({
          onSelect: () => {
            if (!entityIsAlive) return;
            const { selected, id, type } = entity;
            if (selected) return;
            if (type === "prediction") {
              annotationStore.selectPrediction(id, { exitViewAll: true });
            } else {
              annotationStore.selectAnnotation(id, { exitViewAll: true });
            }
          },
          onSetGroundTruth: (_a, value) => {
            if (!entityIsAlive) return;
            entity.setGroundTruth(value);
          },
          onDuplicate: async () => {
            if (!entityIsAlive) return;
            try {
              // FF_FIT_720_LAZY_LOAD_ANNOTATIONS: hydrate stub annotations before duplicating
              // so the resulting copy has region results, not an empty shell.
              if (
                isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) &&
                entity.type === "annotation" &&
                entity.pk &&
                annotationNeedsHydration(entity)
              ) {
                const data = await fetchAnnotationCached(entity.pk);
                if (!data || (data as { error?: unknown }).error) {
                  toast?.show({
                    message: "Could not load annotation to duplicate. Try selecting it first.",
                    type: ToastType.error,
                  });
                  return;
                }
                applyAnnotationHydrationFromApi(annotationStore.annotations, entity.pk, data);
              }
              if (!isAlive(entity)) return;
              const c = annotationStore.addAnnotationFromPrediction(entity);
              window.setTimeout(() => {
                annotationStore.selectAnnotation(c.id, { exitViewAll: true });
              });
            } catch {
              toast?.show({ message: "Could not duplicate annotation.", type: ToastType.error });
            }
          },
          onDelete: () => {
            if (!entityIsAlive) return;
            const isPredictionLocal = entity.type === "prediction";
            confirm({
              title: isPredictionLocal ? "Delete prediction?" : "Delete annotation?",
              body: (
                <>
                  This will <strong>delete all existing regions</strong>. Are you sure you want to delete them?
                  <br />
                  This action cannot be undone.
                </>
              ),
              buttonLook: "negative",
              okText: "Delete",
              onOk: () => {
                if (isPredictionLocal) {
                  entity.list.deletePrediction(entity);
                } else {
                  entity.list.deleteAnnotation(entity);
                }
              },
            });
          },
          onShowOtherAnnotations: () => {
            annotationStore.toggleViewingAllAnnotations();
          },
          onOpenPerformanceDashboard: () => {
            if (!isLSE) return;
            const url = new URL(window.location.origin);
            const useNewAnalytics = isFF("fflag_feat_all_fit_778_analytics_short");
            url.pathname = useNewAnalytics ? "/analytics/member-performance" : "/performance";
            if (entity?.user?.id) url.searchParams.set("user", String(entity.user.id));
            const projectMatch = window.location.pathname.match(/\/projects\/(\d+)/);
            if (projectMatch) url.searchParams.set("project", projectMatch[1]);
            window.open(url.toString(), "_blank");
          },
          onAnnotationChange,
        }),
        [entityIsAlive, entity, annotationStore, fetchAnnotationCached, toast, isLSE, onAnnotationChange],
      );

      if (!entityIsAlive || !sharedAnnotation) return null;

      // IMPORTANT: do NOT introduce any wrapper element here. Selenium page objects
      // (`label-studio-test-automation/.../QuickViewTabManagement.java`) rely on the
      // direct-child relationship `lsf-annotations-carousel__carosel > .lsf-annotation-button`,
      // and break (silently returning empty annotation IDs from the active tab) when
      // any DOM element sits between the carousel container and the button. The
      // shared `SharedAnnotationButton` accepts a `ref` to its outer container so
      // `useResolveUser`'s IntersectionObserver still has the correct target.
      return (
        <SharedAnnotationButton
          ref={buttonContainerRef as React.MutableRefObject<HTMLDivElement | null>}
          annotation={sharedAnnotation}
          capabilities={sharedCapabilities}
          handlers={handlers}
          layout={layout}
        />
      );
    },
  ),
);

export const AnnotationButton = AnnotationButtonInner;
