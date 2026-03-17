import { Button } from "@humansignal/ui";
import {
  FF_DEV_1752,
  FF_DEV_2186,
  FF_DEV_2887,
  FF_DEV_3034,
  FF_LSDV_4620_3_ML,
  FF_FIT_1304_STRICT_OVERLAP,
  isFF,
} from "../utils/feature-flags";
import { isActive, FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { isDefined } from "../utils/utils";
import { Modal } from "../components/Common/Modal/Modal";
import { CommentsSdk } from "./comments-sdk";
// import { LSFHistory } from "./lsf-history";
import { annotationToServer, taskToLSFormat } from "./lsf-utils";
import { when, runInAction } from "mobx";
import { isAlive } from "mobx-state-tree";
import { imageCache } from "@humansignal/core";
import { invalidateAnnotationCache, invalidateDistributionCache } from "@humansignal/core/lib/utils/annotation-cache";

const waitForPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

const DEFAULT_INTERFACES = [
  "basic",
  "controls",
  "submit",
  "update",
  "predictions",
  "topbar",
  "predictions:menu", // right menu with prediction items
  "annotations:menu", // right menu with annotation items
  "annotations:current",
  "side-column", // entity
  "edit-history", // undo/redo
];

let LabelStudioDM;

const resolveLabelStudio = () => {
  if (LabelStudioDM) {
    return LabelStudioDM;
  }
  if (window.LabelStudio) {
    return (LabelStudioDM = window.LabelStudio);
  }
};

// Returns true to suppress (swallow) the error, false to bubble to global handler.
// We allow certain errors to bubble so the app-level ApiProvider can show modals:
// - 403 PAUSED: User is paused in the project
// - 400 OVERLAP_REACHED: Annotation overlap limit has been reached (only when feature flag is enabled)
const errorHandlerAllowSpecialErrors = (result) => {
  const isPaused =
    result?.status === 403 &&
    typeof result?.response === "object" &&
    result?.response?.display_context?.reason === "PAUSED";

  // Only handle OVERLAP_REACHED when feature flag is enabled
  const isOverlapReached =
    isFF(FF_FIT_1304_STRICT_OVERLAP) &&
    result?.status === 400 &&
    typeof result?.response === "object" &&
    result?.response?.display_context?.reason === "OVERLAP_REACHED";

  // Return false to allow these errors to bubble up to the global handler
  return !(isPaused || isOverlapReached);
};

// Support portal URL constants used to construct error reporting links
// These are used in showOperationToast() to create support links with request IDs
// for better error tracking and customer support
export const SUPPORT_URL = "https://support.humansignal.com/hc/en-us/requests/new";
export const SUPPORT_URL_REQUEST_ID_PARAM = "tf_37934448633869"; // request_id field ID in ZD

// Toast ID for overlap reached message - used to dismiss this specific toast
// without affecting other toasts like "Annotation Saved"
const OVERLAP_TOAST_ID = "overlap-reached-toast";

export class LSFWrapper {
  /** @type {HTMLElement} */
  root = null;

  /** @type {DataManager} */
  datamanager = null;

  /** @type {Task} */
  task = null;

  /** @type {Annotation} */
  initialAnnotation = null;

  /** @type {LabelStudio} */
  lsf = null;

  /** @type {LSFHistory} */
  // history = null;

  /** @type {boolean} */
  labelStream = false;

  /** @type {boolean} */
  isInteractivePreannotations = false;

  /** @type {function} */
  interfacesModifier = (interfaces) => interfaces;

  /**
   *
   * @param {DataManager} dm
   * @param {HTMLElement} element
   * @param {LSFOptions} options
   */
  constructor(dm, element, options) {
    // we need to pass the rest of the options to LSF below
    const {
      task,
      preload,
      isLabelStream,
      annotation,
      interfacesModifier,
      isInteractivePreannotations,
      user,
      keymap,
      messages,
      ...restOptions
    } = options;

    this.datamanager = dm;
    this.store = dm.store;
    this.root = element;
    this.task = task;
    this.preload = preload;
    this.labelStream = isLabelStream ?? false;
    this.initialAnnotation = annotation;
    this.interfacesModifier = interfacesModifier;
    this.isInteractivePreannotations = isInteractivePreannotations ?? false;

    // Listen for overlap error modal events (only when feature flag is enabled)
    if (isFF(FF_FIT_1304_STRICT_OVERLAP)) {
      this.handleOverlapNextTask = () => this.loadTask();
      this.handleOverlapCloseTask = () => this.closeTask();
      this.handleOverlapExitStream = () => this.exitStream();
      window.addEventListener("overlap-error-next-task", this.handleOverlapNextTask);
      window.addEventListener("overlap-error-close-task", this.handleOverlapCloseTask);
      window.addEventListener("overlap-error-exit-stream", this.handleOverlapExitStream);
    }

    let interfaces = [...DEFAULT_INTERFACES];

    if (this.project.enable_empty_annotation === false) {
      interfaces.push("annotations:deny-empty");
    }

    if (window.APP_SETTINGS.annotator_reviewer_firewall_enabled && this.labelStream) {
      interfaces.push("annotations:hide-info");
    }

    if (this.labelStream) {
      interfaces.push("infobar");
      if (!window.APP_SETTINGS.label_stream_navigation_disabled) interfaces.push("topbar:prevnext");
      if (FF_DEV_2186 && this.project.review_settings?.require_comment_on_reject) {
        interfaces.push("comments:update");
      }
      if (this.project.show_skip_button) {
        interfaces.push("skip");
      }
    } else {
      interfaces.push(
        "infobar",
        "annotations:add-new",
        "annotations:view-all",
        "annotations:delete",
        "annotations:tabs",
        "predictions:tabs",
        "annotations:copy-link",
      );
    }

    if (this.datamanager.hasInterface("instruction")) {
      interfaces.push("instruction");
    }

    if (!this.labelStream && this.datamanager.hasInterface("groundTruth")) {
      interfaces.push("ground-truth");
    }

    if (this.datamanager.hasInterface("autoAnnotation")) {
      interfaces.push("auto-annotation");
    }

    if (isFF(FF_DEV_2887)) {
      interfaces.push("annotations:comments");
      interfaces.push("comments:resolve-any");
    }

    if (this.project.review_settings?.require_comment_on_reject) {
      interfaces.push("comments:reject");
    }

    if (this.interfacesModifier) {
      interfaces = this.interfacesModifier(interfaces, this.labelStream);
    }

    if (!this.shouldLoadNext()) {
      interfaces = interfaces.filter((item) => {
        return !["topbar:prevnext", "skip"].includes(item);
      });
    }

    const queueTotal = dm.store.project.reviewer_queue_total || dm.store.project.queue_total;
    const queueDone = dm.store.project.queue_done;
    const queueLeft = dm.store.project.queue_left;
    const queuePosition = queueDone ? queueDone + 1 : queueLeft ? queueTotal - queueLeft + 1 : 1;
    const commentClassificationConfig = dm.store.project.comment_classification_config;

    const lsfProperties = {
      user: options.user,
      config: this.lsfConfig,
      task: taskToLSFormat(this.task),
      description: this.instruction,
      interfaces,
      users: dm.store.users.map((u) => u.toJSON()),
      keymap: options.keymap,
      forceAutoAnnotation: this.isInteractivePreannotations,
      forceAutoAcceptSuggestions: this.isInteractivePreannotations,
      messages: options.messages,
      queueTotal,
      queuePosition,
      commentClassificationConfig,

      /* EVENTS */
      onSubmitDraft: this.onSubmitDraft,
      onLabelStudioLoad: this.onLabelStudioLoad,
      onTaskLoad: this.onTaskLoad,
      onPresignUrlForProject: this.onPresignUrlForProject,
      onStorageInitialized: this.onStorageInitialized,
      onSubmitAnnotation: this.onSubmitAnnotation,
      onUpdateAnnotation: this.onUpdateAnnotation,
      onDeleteAnnotation: this.onDeleteAnnotation,
      onSkipTask: this.onSkipTask,
      onUnskipTask: this.onUnskipTask,
      onGroundTruth: this.onGroundTruth,
      onEntityCreate: this.onEntityCreate,
      onEntityDelete: this.onEntityDelete,
      onSelectAnnotation: this.onSelectAnnotation,
      onNextTask: this.onNextTask,
      onPrevTask: this.onPrevTask,

      ...restOptions,
    };

    this.initLabelStudio(lsfProperties);
  }

  /** @private */
  initLabelStudio(settings) {
    try {
      const LSF = resolveLabelStudio();

      this.lsfInstance = new LSF(this.root, settings);

      this.lsfInstance.on("presignUrlForProject", this.onPresignUrlForProject);

      const names = Array.from(this.datamanager.callbacks.keys()).filter((k) => k.startsWith("lsf:"));

      names.forEach((name) => {
        this.datamanager.getEventCallbacks(name).forEach((clb) => {
          this.lsfInstance.on(name.replace(/^lsf:/, ""), clb);
        });
      });

      if (isFF(FF_DEV_2887)) {
        new CommentsSdk(this.lsfInstance, this.datamanager);
      }

      this.datamanager.invoke("lsfInit", this, this.lsfInstance);
    } catch (err) {
      console.error("Failed to initialize LabelStudio", settings);
      console.error(err);
    }
  }

  /** @private */
  async preloadTask() {
    const { comment: commentId, task: taskID } = this.preload;
    const api = this.datamanager.api;
    const params = { taskID };

    if (commentId) {
      params.with_comment = commentId;
    }

    if (params) {
      const task = await api.call("task", { params });
      const noData = !task || (!task.annotations?.length && !task.drafts?.length);
      const body = `Task #${taskID}${commentId ? ` with comment #${commentId}` : ""} was not found!`;

      if (noData) {
        Modal.modal({
          title: "Can't find task",
          body,
        });
        return false;
      }

      // for preload it's good to always load the first one
      const annotation = task.annotations[0];

      await this.selectTask(task, annotation?.id, true);
    }

    return false;
  }

  /** @private */
  async loadTask(taskID, annotationID, fromHistory = false) {
    if (!this.lsf) {
      return console.error("Make sure that LSF was properly initialized");
    }

    const nextAction = async () => {
      const tasks = this.datamanager.store.taskStore;

      const newTask = await this.withinLoadingState(async () => {
        let nextTask;

        if (!isDefined(taskID)) {
          nextTask = await tasks.loadNextTask();
        } else {
          nextTask = await tasks.loadTask(taskID);
        }

        /**
         * If we're in label stream and there's no task – end the stream
         * Otherwise allow user to continue exploring tasks after finished labelling
         */
        const noTask = this.labelStream && !nextTask;

        this.lsf.setFlags({ noTask });

        return nextTask;
      });

      // Add new data from received task
      if (newTask) await this.selectTask(newTask, annotationID, fromHistory);
    };

    if (isFF(FF_DEV_2887) && this.lsf?.commentStore?.hasUnsaved) {
      Modal.confirm({
        title: "You have unsaved changes",
        body: "There are comments which are not persisted. Please submit the annotation. Continuing will discard these comments.",
        onOk() {
          nextAction();
        },
        okText: "Discard and continue",
      });
      return;
    }

    await nextAction();
  }

  exitStream() {
    this.datamanager.invoke("navigate", "projects");
  }

  async selectTask(task, annotationID, fromHistory = false) {
    const needsAnnotationsMerge = task && this.task?.id === task.id;
    const annotations = needsAnnotationsMerge ? [...this.annotations] : [];

    this.task = task;

    if (needsAnnotationsMerge) {
      this.task.mergeAnnotations(annotations);
    }

    this.loadUserLabels();

    await this.setLSFTask(task, annotationID, fromHistory);
  }

  async setLSFTask(task, annotationID, fromHistory, selectPrediction = false) {
    if (!this.lsf) return;

    if (isFF(FF_FIT_1304_STRICT_OVERLAP)) {
      this.dismissOverlapToast();
    }

    const hasChangedTasks = this.lsf?.task?.id !== task?.id && task?.id;

    this.setLoading(true, hasChangedTasks);

    // Let the browser paint the loading indicator before heavy store operations
    await waitForPaint();

    if (!this.lsf) return;

    // Pure data preparation (no MobX mutations)
    const lsfTask = taskToLSFormat(task);
    const isRejectedQueue = isDefined(task.default_selected_annotation);
    const taskList = this.datamanager.store.taskStore.list;
    const taskHistory = taskList
      .map((task) => this.taskHistory.find((item) => item.taskId === task.id))
      .filter(Boolean);

    const extracted = taskHistory.find((item) => item.taskId === task.id);

    if (!fromHistory && extracted) {
      taskHistory.splice(taskHistory.indexOf(extracted), 1);
      taskHistory.push(extracted);
    }

    if (!extracted) {
      taskHistory.push({ taskId: task.id, annotationId: null });
    }

    if (isRejectedQueue && !annotationID) {
      annotationID = task.default_selected_annotation;
    }

    // Batch store reset and interface mutations in a single MobX transaction
    // so reactions fire only once instead of cascading after each action.
    // initializeStore must run OUTSIDE this batch because it calls afterReset()
    // which re-attaches shared stores (e.g. Taxonomy). If detach() and re-attach
    // happen in the same transaction, MST throws "already part of state tree".
    runInAction(() => {
      if (hasChangedTasks) {
        this.lsf.resetState();
      } else {
        this.lsf.resetAnnotationStore();
      }

      this.lsf.toggleInterface("postpone", this.task.allow_postpone !== false);
      this.lsf.toggleInterface("topbar:task-counter", true);

      if (isFF(FF_FIT_1304_STRICT_OVERLAP)) {
        const overlapReached = this.task.overlap_reached === true;
        this.overlapReached = overlapReached;
        this.overlapReachedMessage =
          this.task.overlap_reached_message ||
          "Annotation overlap has been reached for this task. Your draft is preserved but cannot be submitted.";

        this.lsf.setFlags({
          overlapReached,
          overlapReachedMessage: this.overlapReachedMessage,
        });
      } else {
        this.overlapReached = false;
        this.overlapReachedMessage = "";
      }

      this.lsf.assignTask(task);
    });

    this.lsf.initializeStore(lsfTask);

    await this.setAnnotation(annotationID, fromHistory || isRejectedQueue, selectPrediction);
    this.setLoading(false);

    if (isFF(FF_FIT_1304_STRICT_OVERLAP) && this.overlapReached) {
      this.showOverlapReachedMessage();
    }
  }

  /**
   * Show informational message when overlap is reached
   * @private
   */
  showOverlapReachedMessage() {
    // Use info toast to communicate the overlap status
    // This is informational, not an error, so we use a neutral tone
    // Use a specific ID so we can dismiss this toast without affecting others
    this.datamanager.invoke("toast", {
      id: OVERLAP_TOAST_ID,
      message: (
        <div className="flex items-center justify-between">
          <span>{this.overlapReachedMessage}</span>
          <Button
            onClick={() => {
              this.datamanager.invoke("toast:dismiss", { id: OVERLAP_TOAST_ID });
              this.handleOverlapNextTask();
            }}
            className="ml-4"
            size="small"
            look="outlined"
          >
            Next Task
          </Button>
        </div>
      ),
      type: "info",
      duration: -1,
    });
  }

  /**
   * Dismiss the overlap reached toast if it's showing
   * @private
   */
  dismissOverlapToast() {
    this.datamanager.invoke("toast:dismiss", { id: OVERLAP_TOAST_ID });
  }

  /**
   * Ensure annotation is fully loaded (for lazy loading - FIT-720)
   * If the annotation is a stub, fetch the full annotation data from the server.
   * @param {string} annotationPk - The annotation pk to load
   * @returns {Promise<Object|null>} The full annotation data or null if not a stub
   * @private
   */
  async ensureAnnotationLoaded(annotationPk) {
    if (!isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) || !this.labelStream) {
      return null;
    }

    // Check if this annotation is a stub in the original task data
    const taskAnnotation = this.task?.annotations?.find((a) => String(a.id) === String(annotationPk));
    if (!taskAnnotation?.is_stub) {
      return null;
    }

    // Fetch full annotation from backend
    try {
      const taskStore = this.datamanager.store.taskStore;
      const fullAnnotation = await taskStore.loadAnnotation(annotationPk);

      if (fullAnnotation && !fullAnnotation.error) {
        // IMPORTANT: Re-fetch the annotation from the store after async operation
        // The original reference might be stale (user navigated, scrolled, etc.)
        // which causes MST "object is protected" errors
        const lsfAnnotation = this.annotations.find((a) => String(a.pk) === String(annotationPk));
        if (!lsfAnnotation) {
          // Annotation no longer exists in the store
          return fullAnnotation;
        }
        if (!isAlive(lsfAnnotation) || !isAlive(lsfAnnotation.trackedState)) {
          // Annotation node was detached while hydration request was in-flight
          return fullAnnotation;
        }

        // Check if already hydrated while we were fetching
        const versionsResult = lsfAnnotation.versions?.result;
        const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
        const hasRegions = lsfAnnotation.areas?.size > 0;

        if (hasVersionsResult || hasRegions) {
          // Already hydrated
          return fullAnnotation;
        }

        if (fullAnnotation.result) {
          if (!isAlive(lsfAnnotation) || !isAlive(lsfAnnotation.trackedState)) return fullAnnotation;
          lsfAnnotation.history.freeze();
          lsfAnnotation.deserializeResults(fullAnnotation.result);
          // Critical: updateObjects() is required to render visual regions after deserializing
          lsfAnnotation.updateObjects();
          lsfAnnotation.history.safeUnfreeze();
          lsfAnnotation.history.reinit();
        }

        return fullAnnotation;
      }
    } catch {
      // Failed to load annotation - will retry on next attempt
    }

    return null;
  }

  /** @private */
  async setAnnotation(annotationID, selectAnnotation = false, selectPrediction = false) {
    const id = annotationID ? annotationID.toString() : null;
    const { annotationStore: cs } = this.lsf;
    let annotation;
    const activeDrafts = cs.annotations.map((a) => a.draftId).filter(Boolean);

    if (this.task.drafts) {
      for (const draft of this.task.drafts) {
        if (activeDrafts.includes(draft.id)) continue;
        let c;

        if (draft.annotation) {
          // Annotation existed - add draft to existed annotation
          const draftAnnotationPk = String(draft.annotation);

          c = cs.annotations.find((c) => c.pk === draftAnnotationPk);
          if (c) {
            c.history.freeze();
            c.addVersions({ draft: draft.result });
            c.deleteAllRegions({ deleteReadOnly: true });
          } else {
            // that shouldn't happen
            console.error(`No annotation found for pk=${draftAnnotationPk}`);
            continue;
          }
        } else {
          // Annotation not found - restore annotation from draft
          c = cs.addAnnotation({
            draft: draft.result,
            userGenerate: true,
            comment_count: draft.comment_count,
            unresolved_comment_count: draft.unresolved_comment_count,
            createdBy: draft.created_username,
            createdAgo: draft.created_ago,
            createdDate: draft.created_at,
          });
        }
        cs.selectAnnotation(c.id);
        c.deserializeResults(draft.result);
        c.setDraftId(draft.id);
        c.setDraftSaved(draft.created_at);
        c.history.safeUnfreeze();
        c.history.reinit();
      }
    }
    const first = this.annotations?.length ? this.annotations[0] : null;
    // if we have annotations created automatically, we don't need to create another one
    // automatically === created here and haven't saved yet, so they don't have pk
    // @todo because of some weird reason pk may be string uid, so check flags then
    const hasAutoAnnotations = !!first && (!first.pk || (first.userGenerate && first.sentUserGenerate === false));
    const showPredictions = this.project.show_collab_predictions === true;

    if (this.labelStream) {
      if (first?.draftId) {
        // not submitted draft, most likely from previous labeling session
        annotation = first;
      } else if (isDefined(annotationID) && selectAnnotation) {
        // Lazy load annotation if it's a stub (FIT-720)
        await this.ensureAnnotationLoaded(annotationID);
        annotation = this.annotations.find(({ pk }) => pk === annotationID);
      } else if (showPredictions && this.predictions.length > 0 && !this.isInteractivePreannotations) {
        annotation = cs.addAnnotationFromPrediction(this.predictions[0]);
      } else {
        annotation = cs.createAnnotation();
      }
    } else {
      if (selectPrediction) {
        annotation = this.predictions.find((p) => p.pk === id);
        annotation ??= first; // if prediction not found, select first annotation and resume existing behaviour
      } else if (this.annotations.length === 0 && this.predictions.length > 0 && !this.isInteractivePreannotations) {
        const predictionByModelVersion = this.predictions.find((p) => p.createdBy === this.project.model_version);
        annotation = cs.addAnnotationFromPrediction(predictionByModelVersion ?? this.predictions[0]);
      } else if (this.annotations.length > 0 && id && id !== "auto") {
        annotation = this.annotations.find((c) => c.pk === id || c.id === id);
      } else if (this.annotations.length > 0 && (id === "auto" || hasAutoAnnotations)) {
        annotation = first;
      } else {
        annotation = cs.createAnnotation();
      }
    }

    if (annotation) {
      // We want to be sure this is explicitly understood to be a prediction and the
      // user wants to select it directly
      if (selectPrediction && annotation.type === "prediction") {
        cs.selectPrediction(annotation.id);
      } else {
        // Otherwise we default the behaviour to being as was before
        cs.selectAnnotation(annotation.id);
      }
      this.datamanager.invoke("annotationSet", annotation);
    }
  }

  saveUserLabels = async () => {
    const body = [];
    const userLabels = this.lsf?.userLabels?.controls;

    if (!userLabels) return;

    for (const from_name in userLabels) {
      for (const label of userLabels[from_name]) {
        body.push({
          value: label.path,
          title: [from_name, JSON.stringify(label.path)].join(":"),
          from_name,
          project: this.project.id,
        });
      }
    }

    if (!body.length) return;

    await this.datamanager.apiCall("saveUserLabels", {}, { body });
  };

  async loadUserLabels() {
    if (!this.lsf?.userLabels) return;

    const userLabels = await this.datamanager.apiCall("userLabelsForProject", {
      project: this.project.id,
      expand: "label",
    });

    if (!userLabels) return;

    const controls = {};

    for (const result of userLabels.results ?? []) {
      // don't trust server's response!
      if (!result?.label?.value?.length) continue;

      const control = result.from_name;

      if (!controls[control]) controls[control] = [];
      controls[control].push(result.label.value);
    }

    this.lsf.userLabels.init(controls);
  }

  onLabelStudioLoad = async (ls) => {
    this.datamanager.invoke("labelStudioLoad", ls);
    this.lsf = ls;

    if (!this.lsf.task) this.setLoading(true);

    const _taskHistory = await this.datamanager.store.taskStore.loadTaskHistory({
      projectId: this.datamanager.store.project.id,
    });

    this.lsf.setTaskHistory(_taskHistory);

    await this.loadUserLabels();

    if (this.canPreloadTask && isFF(FF_DEV_1752)) {
      await this.preloadTask();
    } else if (this.labelStream) {
      await this.loadTask();
    }

    this.setLoading(false);
  };

  /** @private */
  onTaskLoad = async (...args) => {
    this.datamanager.invoke("onSelectAnnotation", ...args);
  };

  /**
   * Proxy urls to presign them if storage is connected
   * @param {*} _ LS instance
   * @param {string} url http/https are not proxied and returned as is
   */
  onPresignUrlForProject = (_, url) => {
    // if URL is a relative, presigned url (url matches /tasks|projects/:id/resolve/.*) make it absolute
    const presignedUrlPattern = /^\/(?:tasks|projects)\/\d+\/resolve\/?/;
    if (presignedUrlPattern.test(url)) {
      url = new URL(url, document.location.origin).toString();
    }

    const parsedUrl = new URL(url);

    // return same url if http(s)
    if (["http:", "https:"].includes(parsedUrl.protocol)) return url;

    const api = this.datamanager.api;
    const projectId = this.project.id;
    const fileuri = btoa(url);

    return api.createUrl(api.endpoints.presignUrlForProject, { projectId, fileuri }).url;
  };

  onStorageInitialized = async (ls) => {
    this.datamanager.invoke("onStorageInitialized", ls);

    if (this.task && this.labelStream === false) {
      const annotationID =
        this.initialAnnotation?.pk ?? this.task.lastAnnotation?.pk ?? this.task.lastAnnotation?.id ?? "auto";

      await this.setAnnotation(annotationID);
    }
  };

  /** @private */
  showOperationToast(status, successMessage, errorAction, result) {
    if (status === 200 || status === 201) {
      this.datamanager.invoke("toast", { message: successMessage, type: "info" });
    } else if (status !== undefined) {
      // Skip toast for errors that are handled by global modal handlers via display_context
      // These errors bubble up to ApiProvider which shows appropriate modals
      // Note: display_context is in result.response for API error responses
      const displayReason = result?.response?.display_context?.reason;
      const isPausedError = displayReason === "PAUSED";
      const isOverlapError = isFF(FF_FIT_1304_STRICT_OVERLAP) && displayReason === "OVERLAP_REACHED";
      if (isPausedError || isOverlapError) {
        // Also update local state for overlap reached (only when feature flag is enabled)
        if (isOverlapError) {
          this.overlapReached = true;
          this.overlapReachedMessage =
            result?.response?.detail ||
            "Annotation overlap has been reached for this task. Your draft is preserved but cannot be submitted.";
          // Set overlap state on LSF store - this will disable buttons with tooltips
          this.lsf.setFlags({
            overlapReached: true,
            overlapReachedMessage: this.overlapReachedMessage,
          });
        }
        return;
      }

      const requestId = result?.$meta?.headers?.get("x-ls-request-id");
      const supportUrl = requestId ? `${SUPPORT_URL}?${SUPPORT_URL_REQUEST_ID_PARAM}=${requestId}` : SUPPORT_URL;

      this.datamanager.invoke("toast", {
        message: (
          <span>
            {errorAction}, please try again or{" "}
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              contact our team
            </a>{" "}
            if it doesn't help.
          </span>
        ),
        type: "error",
      });
    }
  }

  /** @private */
  onSubmitAnnotation = async () => {
    // Prevent submission if overlap is reached (only when feature flag is enabled)
    if (isFF(FF_FIT_1304_STRICT_OVERLAP) && this.overlapReached) {
      this.showOverlapReachedMessage();
      return;
    }

    const exitStream = this.shouldExitStream();
    const loadNext = exitStream ? false : this.shouldLoadNext();
    const result = await this.submitCurrentAnnotation(
      "submitAnnotation",
      async (taskID, body) => {
        return await this.datamanager.apiCall(
          "submitAnnotation",
          { taskID },
          { body },
          // errors are displayed by "toast" event - we don't want to show blocking modal
          { errorHandler: errorHandlerAllowSpecialErrors },
        );
      },
      false,
      loadNext,
    );
    const status = result?.$meta?.status;

    this.showOperationToast(status, "Annotation saved successfully", "Annotation is not saved", result);

    // FIT-720: Invalidate caches after successful submit
    if (status < 400) {
      // Invalidate specific annotation if ID is in result
      if (result?.id) {
        invalidateAnnotationCache(result.id);
      }
      // Invalidate distribution for the task
      invalidateDistributionCache(this.task?.id);
    }

    if (exitStream) return this.exitStream();
  };

  /** @private */
  onUpdateAnnotation = async (ls, annotation, extraData) => {
    const { task } = this;
    const serializedAnnotation = this.prepareData(annotation);
    const exitStream = this.shouldExitStream();

    Object.assign(serializedAnnotation, extraData);

    await this.saveUserLabels();

    const result = await this.withinLoadingState(async () => {
      return this.datamanager.apiCall(
        "updateAnnotation",
        {
          taskID: task.id,
          annotationID: annotation.pk,
        },
        {
          body: serializedAnnotation,
        },
        // errors are displayed by "toast" event - we don't want to show blocking modal
        { errorHandler: errorHandlerAllowSpecialErrors },
      );
    });
    const status = result?.$meta?.status;

    this.showOperationToast(status, "Annotation updated successfully", "Annotation is not updated", result);

    this.datamanager.invoke("updateAnnotation", ls, annotation, result);

    // FIT-720: Invalidate annotation cache after successful update
    if (status < 400 && annotation.pk) {
      invalidateAnnotationCache(annotation.pk);
      invalidateDistributionCache(task.id);
    }

    if (exitStream) return this.exitStream();

    if (status >= 400) {
      return;
    }

    const isRejectedQueue = isDefined(task.default_selected_annotation);

    if (isRejectedQueue) {
      // load next task if that one was updated task from rejected queue
      await this.loadTask();
    } else {
      await this.loadTask(this.task.id, annotation.pk, true);
    }
  };

  deleteDraft = async (id) => {
    const response = await this.datamanager.apiCall("deleteDraft", {
      draftID: id,
    });

    this.task.deleteDraft(id);
    return response;
  };

  /**@private */
  onDeleteAnnotation = async (ls, annotation) => {
    const { task } = this;
    let response;

    task.deleteAnnotation(annotation);

    if (annotation.userGenerate && annotation.sentUserGenerate === false) {
      if (annotation.draftId) {
        response = await this.deleteDraft(annotation.draftId);
      } else {
        response = { ok: true };
      }
    } else {
      response = await this.withinLoadingState(async () => {
        return this.datamanager.apiCall("deleteAnnotation", {
          taskID: task.id,
          annotationID: annotation.pk,
        });
      });

      // this.task.deleteAnnotation(annotation);
      this.datamanager.invoke("deleteAnnotation", ls, annotation);
    }

    if (response.ok) {
      const lastAnnotation = this.annotations[this.annotations.length - 1] ?? {};
      const annotationID = lastAnnotation.pk ?? undefined;

      await this.setAnnotation(annotationID);
    }
  };

  draftToast = (status, result = null) => {
    this.showOperationToast(status, "Draft saved successfully", "Draft is not saved", result);
  };

  needsDraftSave = (annotation) => {
    if (annotation.history?.hasChanges && !annotation.draftSaved) return true;
    if (
      annotation.history?.hasChanges &&
      new Date(annotation.history.lastAdditionTime) > new Date(annotation.draftSaved)
    )
      return true;
    return false;
  };

  saveDraft = async (target = null) => {
    const selected = target || this.lsf?.annotationStore?.selected;
    const hasChanges = selected ? this.needsDraftSave(selected) : false;

    if (selected?.isDraftSaving) {
      await when(() => !selected.isDraftSaving);
      this.draftToast(200);
    } else if (hasChanges && selected) {
      const res = await selected?.saveDraftImmediatelyWithResults();

      this.draftToast(res.$meta?.status, res);
    }
  };

  onSubmitDraft = async (_studio, annotation, params = {}) => {
    // It should be preserved as soon as possible because each `await` will allow it to be changed
    const taskId = this.task.id;
    const annotationDoesntExist = !annotation.pk;
    const data = { body: this.prepareData(annotation, { isNewDraft: true }) }; // serializedAnnotation
    const hasChanges = this.needsDraftSave(annotation);
    const showToast = params?.useToast && hasChanges;
    // console.log('onSubmitDraft', params?.useToast, hasChanges);

    if (params?.useToast) delete params.useToast;

    Object.assign(data.body, params);

    await this.saveUserLabels();

    if (annotation.draftId > 0) {
      // draft has been already created
      const res = await this.datamanager.apiCall("updateDraft", { draftID: annotation.draftId }, data);

      showToast && this.draftToast(res.$meta?.status, res);
      this.datamanager.invoke("submitDraft", this, annotation, res);
      return res;
    }
    let response;

    if (annotationDoesntExist) {
      response = await this.datamanager.apiCall("createDraftForTask", { taskID: taskId }, data);
    } else {
      response = await this.datamanager.apiCall(
        "createDraftForAnnotation",
        { taskID: taskId, annotationID: annotation.pk },
        data,
      );
    }
    response?.id && annotation.setDraftId(response?.id);
    showToast && this.draftToast(response.$meta?.status, response);
    this.datamanager.invoke("submitDraft", this, annotation, response);

    return response;
  };

  onSkipTask = async (_, { comment } = {}) => {
    // Prevent skipping if overlap is reached (only when feature flag is enabled)
    if (isFF(FF_FIT_1304_STRICT_OVERLAP) && this.overlapReached) {
      this.showOverlapReachedMessage();
      return;
    }

    // Manager roles that can force-skip unskippable tasks (OW=Owner, AD=Admin, MA=Manager)
    const MANAGER_ROLES = ["OW", "AD", "MA"];
    const task = this.task;
    const isEnterprise = window.APP_SETTINGS?.billing?.enterprise;
    const skipDisabled = isEnterprise ? task?.allow_skip === false : false;
    const userRole = window.APP_SETTINGS?.user?.role;
    const hasForceSkipPermission = MANAGER_ROLES.includes(userRole);
    const canSkip = !skipDisabled || hasForceSkipPermission;
    if (!canSkip) {
      console.warn("Task cannot be skipped: allow_skip is false and user lacks manager role");
      this.showOperationToast(400, null, "This task cannot be skipped", {
        error: "Task cannot be skipped",
      });
      return;
    }
    const result = await this.submitCurrentAnnotation(
      "skipTask",
      async (taskID, body) => {
        const { id, ...annotation } = body;
        const params = { taskID };
        const options = { body: { ...annotation, was_cancelled: true } };

        if (comment) options.body.comment = comment;

        if (id !== undefined) params.annotationID = id;

        return await this.datamanager.apiCall(
          id === undefined ? "submitAnnotation" : "updateAnnotation",
          params,
          options,
          { errorHandler: errorHandlerAllowSpecialErrors },
        );
      },
      true,
      this.shouldLoadNext(),
    );
    const status = result?.$meta?.status;

    this.showOperationToast(status, "Task skipped successfully", "Task is not skipped", result);
  };

  onUnskipTask = async () => {
    const { task, currentAnnotation } = this;

    if (!isDefined(currentAnnotation) && !isDefined(currentAnnotation.pk)) {
      console.error("Annotation must be on unskip");
      return;
    }

    await this.withinLoadingState(async () => {
      currentAnnotation.pauseAutosave();

      if (isFF(FF_DEV_3034)) {
        await this.datamanager.apiCall("convertToDraft", {
          annotationID: currentAnnotation.pk,
        });
      } else {
        if (currentAnnotation.draftId > 0) {
          await this.datamanager.apiCall(
            "updateDraft",
            {
              draftID: currentAnnotation.draftId,
            },
            {
              body: { annotation: null },
            },
          );
        } else {
          const annotationData = { body: this.prepareData(currentAnnotation) };

          await this.datamanager.apiCall(
            "createDraftForTask",
            {
              taskID: this.task.id,
            },
            annotationData,
          );
        }

        // Carry over any comments to when the annotation draft is eventually submitted
        if (isFF(FF_DEV_2887) && this.lsf?.commentStore?.toCache) {
          this.lsf.commentStore.toCache(`task.${task.id}`);
        }

        await this.datamanager.apiCall("deleteAnnotation", {
          taskID: task.id,
          annotationID: currentAnnotation.pk,
        });
      }
    });
    await this.loadTask(task.id);
    this.datamanager.invoke("unskipTask");
  };

  shouldLoadNext = () => {
    if (!this.labelStream) return false;

    // validating if URL is from notification, in case of notification it shouldn't load next task
    const urlParam = new URLSearchParams(location.search).get("interaction");

    return urlParam !== "notifications";
  };

  shouldExitStream = () => {
    const paramName = "exitStream";
    const urlParam = new URLSearchParams(location.search).get(paramName);
    const searchParams = new URLSearchParams(window.location.search);

    searchParams.delete(paramName);
    let newRelativePathQuery = window.location.pathname;

    if (searchParams.toString()) newRelativePathQuery += `?${searchParams.toString()}`;
    window.history.pushState(null, "", newRelativePathQuery);
    return !!urlParam;
  };

  // Proxy events that are unused by DM integration
  onEntityCreate = (...args) => this.datamanager.invoke("onEntityCreate", ...args);
  onEntityDelete = (...args) => this.datamanager.invoke("onEntityDelete", ...args);
  _selectAnnotationTimeout = null;
  _debouncedFirstOldSelection = undefined;
  onSelectAnnotation = (prevAnnotation, nextAnnotation, options) => {
    // NOTE on parameter naming: LSF fires selectAnnotation(newAnnotation, oldAnnotation).
    // Despite the names here, prevAnnotation = the NEWLY selected annotation,
    // nextAnnotation = the PREVIOUSLY selected annotation (before this selection).
    if (window.APP_SETTINGS.read_only_quick_view_enabled && !this.labelStream) {
      prevAnnotation?.setEditable(false);
    }

    // FIT-720: Debounce selectAnnotation callbacks during batch selection (init)
    // During init, selectAnnotation fires for ALL annotations in rapid succession.
    // This debounce ensures only the final selection triggers the callback.
    if (isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) {
      if (this._selectAnnotationTimeout) {
        clearTimeout(this._selectAnnotationTimeout);
        // Keep nextAnnotation (the "old" selection) from the FIRST call in the batch.
        // After resetAnnotationStore + initializeStore, the first selectAnnotation fires
        // with oldSelection=null (nothing was selected before). Subsequent calls during
        // init have oldSelection=someOtherInitAnnotation. The DataManager's history
        // handler compares new vs old annotation pk to decide whether to refetch.
        // If we use the last call's old selection (which may equal the new selection
        // when re-selecting the same annotation), the handler thinks nothing changed
        // and skips the history fetch. Preserving the first old=null ensures the
        // handler sees a genuine annotation change and fetches history.
      } else {
        this._debouncedFirstOldSelection = nextAnnotation;
      }
      this._selectAnnotationTimeout = setTimeout(() => {
        this._selectAnnotationTimeout = null;
        const firstOld = this._debouncedFirstOldSelection;
        this._debouncedFirstOldSelection = undefined;
        // prevAnnotation from last call = the final newly selected annotation (correct)
        // firstOld = the selection state before the batch started (null after reset)
        this._invokeSelectAnnotation(prevAnnotation, firstOld, options);
      }, 0);
      return;
    }

    this._invokeSelectAnnotation(prevAnnotation, nextAnnotation, options);
  };

  _invokeSelectAnnotation = async (prevAnnotation, nextAnnotation, options) => {
    // Invoke the DataManager callback first so that history fetch can start immediately.
    // The history endpoint only needs the annotation pk (available on stubs).
    // Hydration (which fetches full annotation data) runs in parallel afterwards.
    if (nextAnnotation?.history?.undoIdx) {
      this.saveDraft(nextAnnotation).then(() => {
        this.datamanager.invoke("onSelectAnnotation", prevAnnotation, nextAnnotation, options, this);
      });
    } else {
      this.datamanager.invoke("onSelectAnnotation", prevAnnotation, nextAnnotation, options, this);
    }

    // FIT-720: Hydrate stub annotations when selected
    // IMPORTANT: Use the CURRENTLY SELECTED annotation, not the one from the callback
    // The debounce may have caused the callback annotation to be stale
    if (isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) {
      const currentSelected = this.lsf?.annotationStore?.selected;
      if (currentSelected?.pk) {
        // Prefetch comments on annotation selection so region comment indicators
        // are visible immediately, without waiting for the Comments tab to be opened.
        // Deduplication in CommentStore.listComments prevents redundant API calls
        // if the Comments tab is already open and triggers its own fetch.
        this.lsf?.commentStore?.listComments({ suppressClearComments: false });

        await this._hydrateStubAnnotation(currentSelected);
      }
    }
  };

  // FIT-720: Hydrate a stub annotation by fetching full data from API
  _hydrateStubAnnotation = async (annotation) => {
    // Check if annotation is a stub (no regions/results)
    // Stubs have empty results - check via the areas map which holds deserialized regions
    const hasRegions = annotation.areas?.size > 0;
    const isUserGenerated = annotation.userGenerate && !annotation.sentUserGenerate;

    // Also check versions.result to see if the annotation was loaded with actual results
    const versionsResult = annotation.versions?.result;
    const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;

    // Skip if already hydrated or is a new user-generated annotation
    // Use versionsResult as the source of truth - if it has data, the annotation is already hydrated
    if (hasVersionsResult || isUserGenerated) {
      return;
    }

    const annotationPk = annotation.pk;

    try {
      const fullAnnotation = await this.datamanager.apiCall("fetchAnnotation", {
        annotationID: annotationPk,
      });

      if (fullAnnotation?.result && !fullAnnotation.error) {
        // IMPORTANT: Re-fetch the annotation from the store after async operation
        // The original reference might be stale (user navigated, scrolled, etc.)
        // which causes MST "object is protected" errors
        const freshAnnotation = this.annotations.find((a) => String(a.pk) === String(annotationPk));
        if (!freshAnnotation) {
          // Annotation no longer exists in the store
          return;
        }
        if (!isAlive(freshAnnotation) || !isAlive(freshAnnotation.trackedState)) {
          // Annotation node was detached while hydration request was in-flight
          return;
        }

        // Check if annotation was already hydrated while we were fetching
        const freshVersionsResult = freshAnnotation.versions?.result;
        const freshHasVersionsResult = Array.isArray(freshVersionsResult) && freshVersionsResult.length > 0;
        const freshHasRegions = freshAnnotation.areas?.size > 0;

        if (freshHasVersionsResult || freshHasRegions) {
          // Already hydrated (possibly by another code path)
          return;
        }

        // Freeze history to prevent undo/redo issues during hydration
        freshAnnotation.history?.freeze?.();

        // Deserialize the results into the annotation
        if (!isAlive(freshAnnotation) || !isAlive(freshAnnotation.trackedState)) return;
        freshAnnotation.deserializeResults(fullAnnotation.result);

        // Critical: updateObjects() MUST be called to render visual regions after deserializing
        freshAnnotation.updateObjects?.();

        // Unfreeze history
        freshAnnotation.history?.safeUnfreeze?.();

        // reinitHistory cancels autosave and sets initial values so LSF knows this is the base state
        // This prevents the hydration from being treated as a user modification
        freshAnnotation.reinitHistory?.();
      }
    } catch {
      // Failed to hydrate annotation - will show stub state
    }
  };

  onNextTask = async (nextTaskId, nextAnnotationId) => {
    await this.saveDraft();
    await this.loadTask(nextTaskId, nextAnnotationId, true);
  };
  onPrevTask = async (prevTaskId, prevAnnotationId) => {
    await this.saveDraft();
    await this.loadTask(prevTaskId, prevAnnotationId, true);
  };
  async submitCurrentAnnotation(eventName, submit, includeId = false, loadNext = true) {
    const { taskID, currentAnnotation } = this;
    const unique_id = this.task.unique_lock_id;
    const serializedAnnotation = this.prepareData(currentAnnotation, { includeId });

    if (unique_id) {
      serializedAnnotation.unique_id = unique_id;
    }

    this.setLoading(true);

    await this.saveUserLabels();

    const result = await this.withinLoadingState(async () => {
      const result = await submit(taskID, serializedAnnotation);

      return result;
    });

    if (result && result.id !== undefined) {
      const annotationId = result.id.toString();

      currentAnnotation.updatePersonalKey(annotationId);

      const eventData = annotationToServer(currentAnnotation);

      this.datamanager.invoke(eventName, this.lsf, eventData, result);

      // Persist any queued comments which are not currently attached to an annotation
      if (
        isFF(FF_DEV_2887) &&
        ["submitAnnotation", "skipTask"].includes(eventName) &&
        this.lsf?.commentStore?.persistQueuedComments
      ) {
        await this.lsf.commentStore.persistQueuedComments();
      }
    }

    this.setLoading(false);
    if (result?.$meta?.status >= 400) {
      // don't reload the task on error to avoid losing the user's changes
      return result;
    }

    if (!loadNext || this.datamanager.isExplorer) {
      await this.loadTask(taskID, currentAnnotation.pk, true);
    } else {
      await this.loadTask();
    }

    return result;
  }

  /**
   * Finds the active draft for the given annotation.
   * @param {Object} annotation - The annotation object.
   * @returns {Object|undefined} The active draft or undefined if no draft is found.
   * @private
   */
  findActiveDraft(annotation) {
    if (isDefined(annotation.draftId)) {
      return this.task.drafts.find((possibleDraft) => possibleDraft.id === annotation.draftId);
    }
    return undefined;
  }

  /**
   * Calculates the startedAt time for an annotation.
   * @param {Object|undefined} currentDraft - The current draft object, if any.
   * @param {Date} loadedDate - The date when the annotation was loaded.
   * @returns {Date} The calculated startedAt time.
   * @private
   */
  calculateStartedAt(currentDraft, loadedDate) {
    if (currentDraft) {
      const draftStartedAt = new Date(currentDraft.created_at);
      const draftLeadTime = Number(currentDraft.lead_time ?? 0);
      const adjustedStartedAt = new Date(Date.now() - draftLeadTime * 1000);

      if (adjustedStartedAt < draftStartedAt) return draftStartedAt;

      return adjustedStartedAt;
    }
    return loadedDate;
  }

  /**
   * Prepare data for draft/submission of annotation
   * @param {Object} annotation - The annotation object.
   * @param {Object} options - The options object.
   * @param {boolean} options.includeId - Whether to include the id in the result.
   * @param {boolean} options.isNewDraft - Whether the draft is new.
   * @returns {Object} The prepared data.
   * @private
   */
  prepareData(annotation, { includeId, isNewDraft } = {}) {
    const userGenerate = !annotation.userGenerate || annotation.sentUserGenerate;
    const currentDraft = this.findActiveDraft(annotation);
    const sessionTime = (Date.now() - annotation.loadedDate.getTime()) / 1000;
    const submittedTime = isNewDraft ? 0 : Number(annotation.leadTime ?? 0);
    const draftTime = Number(currentDraft?.lead_time ?? 0);
    const leadTime = submittedTime + draftTime + sessionTime;
    const startedAt = this.calculateStartedAt(currentDraft, annotation.loadedDate);

    const result = {
      lead_time: leadTime,
      result: (isNewDraft ? annotation.versions.draft : annotation.serializeAnnotation()) ?? [],
      draft_id: annotation.draftId,
      parent_prediction: annotation.parent_prediction,
      parent_annotation: annotation.parent_annotation,
      started_at: startedAt.toISOString(),
    };

    if (includeId && userGenerate) {
      result.id = Number.parseInt(annotation.pk);
    }

    return result;
  }

  /** @private */
  setLoading(isLoading, shouldReset = false) {
    if (isFF(FF_LSDV_4620_3_ML) && shouldReset) this.lsf.clearApp();
    this.lsf.setFlags({ isLoading });
    if (isFF(FF_LSDV_4620_3_ML) && shouldReset) this.lsf.renderApp();
  }

  async withinLoadingState(callback) {
    let result;

    this.setLoading(true);
    if (callback) {
      result = await callback.call(this);
    }
    this.setLoading(false);

    return result;
  }

  destroy() {
    // Clean up overlap error event listeners and dismiss toast (only when feature flag is enabled)
    if (isFF(FF_FIT_1304_STRICT_OVERLAP)) {
      window.removeEventListener("overlap-error-next-task", this.handleOverlapNextTask);
      window.removeEventListener("overlap-error-close-task", this.handleOverlapCloseTask);
      window.removeEventListener("overlap-error-exit-stream", this.handleOverlapExitStream);
      // Dismiss the overlap toast if it's showing - this ensures the toast doesn't
      // persist after leaving the labeling interface
      this.dismissOverlapToast();
    }

    if (isActive(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) {
      imageCache?.forceClear?.();
    }

    this.lsfInstance?.destroy?.();
    this.lsfInstance = null;
  }

  /**
   * Close the current task panel (for DataManager context)
   */
  closeTask() {
    // Invoke the data manager's close task action
    this.datamanager.invoke("closeTask");
  }

  get taskID() {
    return this.task.id;
  }

  get taskHistory() {
    return this.lsf.taskHistory;
  }

  get currentAnnotation() {
    try {
      return this.lsf.annotationStore.selected;
    } catch {
      return null;
    }
  }

  get annotations() {
    return this.lsf.annotationStore.annotations;
  }

  get predictions() {
    return this.lsf.annotationStore.predictions;
  }

  /** @returns {string|null} */
  get lsfConfig() {
    return this.datamanager.store.labelingConfig;
  }

  /** @returns {Dict} */
  get project() {
    return this.datamanager.store.project;
  }

  /** @returns {string|null} */
  get instruction() {
    return (this.project.instruction ?? this.project.expert_instruction ?? "").trim() || null;
  }

  get canPreloadTask() {
    return Boolean(this.preload?.interaction);
  }
}
