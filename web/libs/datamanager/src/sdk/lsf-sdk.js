/** @typedef {import("../stores/Tasks").TaskModel} Task */
/** @typedef {import("label-studio").LabelStudio} LabelStudio */
/** @typedef {import("./dm-sdk").DataManager} DataManager */

/** @typedef {{
 * user: Dict
 * config: string,
 * interfaces: string[],
 * task: Task
 * labelStream: boolean,
 * interfacesModifier: function,
 * messages: Dict<string|Function>
 * }} LSFOptions */

import {
  FF_DEV_1752,
  FF_DEV_2186,
  FF_DEV_2887,
  FF_DEV_3034,
  FF_DEV_3734,
  FF_LSDV_4620_3_ML,
  FF_OPTIC_2,
  isFF,
} from "../utils/feature-flags";
import { isDefined } from "../utils/utils";
import { Modal } from "../components/Common/Modal/Modal";
import { CommentsSdk } from "./comments-sdk";
// import { LSFHistory } from "./lsf-history";
import { annotationToServer, taskToLSFormat } from "./lsf-utils";
import { when } from "mobx";

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

const resolveLabelStudio = async () => {
  if (LabelStudioDM) {
    return LabelStudioDM;
  }
  if (window.LabelStudio) {
    return (LabelStudioDM = window.LabelStudio);
  }
};

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
    this.datamanager = dm;
    this.store = dm.store;
    this.root = element;
    this.task = options.task;
    this.preload = options.preload;
    this.labelStream = options.isLabelStream ?? false;
    this.initialAnnotation = options.annotation;
    this.interfacesModifier = options.interfacesModifier;
    this.isInteractivePreannotations = options.isInteractivePreannotations ?? false;

    let interfaces = [...DEFAULT_INTERFACES];

    if (this.project.enable_empty_annotation === false) {
      interfaces.push("annotations:deny-empty");
    }

    if (this.labelStream) {
      interfaces.push("infobar");
      interfaces.push("topbar:prevnext");
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

    if (this.interfacesModifier) {
      interfaces = this.interfacesModifier(interfaces, this.labelStream);
    }

    console.group("Interfaces");
    console.log([...interfaces]);

    if (!this.shouldLoadNext()) {
      interfaces = interfaces.filter((item) => {
        return !["topbar:prevnext", "skip"].includes(item);
      });
    }

    console.log([...interfaces]);
    console.groupEnd();
    const queueTotal = dm.store.project.reviewer_queue_total || dm.store.project.queue_total;
    const queueDone = dm.store.project.queue_done;
    const queueLeft = dm.store.project.queue_left;
    const queuePosition = queueDone ? queueDone + 1 : queueLeft ? queueTotal - queueLeft + 1 : 1;

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
    };

    this.initLabelStudio(lsfProperties);
  }

  /** @private */
  async initLabelStudio(settings) {
    try {
      const LSF = await resolveLabelStudio();

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

      this.selectTask(task, annotation?.id, true);
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
      if (newTask) this.selectTask(newTask, annotationID, fromHistory);
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

  selectTask(task, annotationID, fromHistory = false) {
    const needsAnnotationsMerge = task && this.task?.id === task.id;
    const annotations = needsAnnotationsMerge ? [...this.annotations] : [];

    this.task = task;

    if (needsAnnotationsMerge) {
      this.task.mergeAnnotations(annotations);
    }

    this.loadUserLabels();

    this.setLSFTask(task, annotationID, fromHistory);
  }

  setLSFTask(task, annotationID, fromHistory) {
    if (!this.lsf) return;

    const hasChangedTasks = this.lsf?.task?.id !== task?.id && task?.id;

    this.setLoading(true, hasChangedTasks);
    const lsfTask = taskToLSFormat(task);
    const isRejectedQueue = isDefined(task.default_selected_annotation);
    const taskList = this.datamanager.store.taskStore.list;
    // annotations are set in LSF only and order in DM only, so combine them
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

    if (hasChangedTasks) {
      this.lsf.resetState();
    } else {
      this.lsf.resetAnnotationStore();
    }

    // Initial idea to show counter for Manual assignment only
    // But currently we decided to hide it for any stream
    // const distribution = this.project.assignment_settings.label_stream_task_distribution;
    // const isManuallyAssigned = distribution === "assigned_only";

    // undefined or true for backward compatibility
    this.lsf.toggleInterface("postpone", this.task.allow_postpone !== false);
    this.lsf.toggleInterface("topbar:task-counter", !isFF(FF_DEV_3734));
    this.lsf.assignTask(task);
    this.lsf.initializeStore(lsfTask);
    this.setAnnotation(annotationID, fromHistory || isRejectedQueue);
    this.setLoading(false);
  }

  /** @private */
  setAnnotation(annotationID, selectAnnotation = false) {
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
        annotation = this.annotations.find(({ pk }) => pk === annotationID);
      } else if (showPredictions && this.predictions.length > 0 && !this.isInteractivePreannotations) {
        annotation = cs.addAnnotationFromPrediction(this.predictions[0]);
      } else {
        annotation = cs.createAnnotation();
      }
    } else {
      if (this.annotations.length === 0 && this.predictions.length > 0 && !this.isInteractivePreannotations) {
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
      cs.selectAnnotation(annotation.id);
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

      this.setAnnotation(annotationID);
    }
  };

  /** @private */
  onSubmitAnnotation = async () => {
    const exitStream = this.shouldExitStream();
    const loadNext = exitStream ? false : this.shouldLoadNext();
    const result = await this.submitCurrentAnnotation(
      "submitAnnotation",
      async (taskID, body) => {
        return await this.datamanager.apiCall(
          "submitAnnotation",
          { taskID },
          { body },
          // don't react on duplicated annotations error
          { errorHandler: (result) => result.status === 409 },
        );
      },
      false,
      loadNext,
    );
    const status = result?.$meta?.status;

    if (status === 200 || status === 201)
      this.datamanager.invoke("toast", { message: "Annotation saved successfully", type: "info" });
    else if (status !== undefined)
      this.datamanager.invoke("toast", { message: "There was an error saving your Annotation", type: "error" });

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
      );
    });
    const status = result?.$meta?.status;

    if (status === 200 || status === 201)
      this.datamanager.invoke("toast", { message: "Annotation updated successfully", type: "info" });
    else if (status !== undefined)
      this.datamanager.invoke("toast", { message: "There was an error updating your Annotation", type: "error" });

    this.datamanager.invoke("updateAnnotation", ls, annotation, result);

    if (exitStream) return this.exitStream();

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

      this.setAnnotation(annotationID);
    }
  };

  draftToast = (status) => {
    if (status === 200 || status === 201)
      this.datamanager.invoke("toast", { message: "Draft saved successfully", type: "info" });
    else if (status !== undefined)
      this.datamanager.invoke("toast", { message: "There was an error saving your draft", type: "error" });
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
    const hasChanges = this.needsDraftSave(selected);

    if (selected?.isDraftSaving) {
      await when(() => !selected.isDraftSaving);
      this.draftToast(200);
    } else if (hasChanges && selected) {
      const res = await selected?.saveDraftImmediatelyWithResults();
      const status = res?.$meta?.status;

      this.draftToast(status);
    }
  };

  onSubmitDraft = async (studio, annotation, params = {}) => {
    const annotationDoesntExist = !annotation.pk;
    const data = { body: this.prepareData(annotation, { draft: true }) }; // serializedAnnotation
    const hasChanges = this.needsDraftSave(annotation);
    const showToast = params?.useToast && hasChanges;
    // console.log('onSubmitDraft', params?.useToast, hasChanges);

    if (params?.useToast) delete params.useToast;

    Object.assign(data.body, params);

    await this.saveUserLabels();

    if (annotation.draftId > 0) {
      // draft has been already created
      const res = await this.datamanager.apiCall("updateDraft", { draftID: annotation.draftId }, data);

      showToast && this.draftToast(res?.$meta?.status);
      return res;
    }
    let response;

    if (annotationDoesntExist) {
      response = await this.datamanager.apiCall("createDraftForTask", { taskID: this.task.id }, data);
    } else {
      response = await this.datamanager.apiCall(
        "createDraftForAnnotation",
        { taskID: this.task.id, annotationID: annotation.pk },
        data,
      );
    }
    response?.id && annotation.setDraftId(response?.id);
    showToast && this.draftToast(response?.$meta?.status);

    return response;
  };

  onSkipTask = async (_, { comment } = {}) => {
    await this.submitCurrentAnnotation(
      "skipTask",
      (taskID, body) => {
        const { id, ...annotation } = body;
        const params = { taskID };
        const options = { body: annotation };

        options.body.was_cancelled = true;
        if (comment) options.body.comment = comment;

        if (id === undefined) {
          return this.datamanager.apiCall("submitAnnotation", params, options);
        }
        params.annotationID = id;
        return this.datamanager.apiCall("updateAnnotation", params, options);
      },
      true,
      this.shouldLoadNext(),
    );
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
  onSelectAnnotation = (prevAnnotation, nextAnnotation, options) => {
    if (isFF(FF_OPTIC_2) && !!nextAnnotation?.history?.undoIdx) {
      this.saveDraft(nextAnnotation).then(() => {
        this.datamanager.invoke("onSelectAnnotation", prevAnnotation, nextAnnotation, options, this);
      });
    } else {
      this.datamanager.invoke("onSelectAnnotation", prevAnnotation, nextAnnotation, options, this);
    }
  };

  onNextTask = async (nextTaskId, nextAnnotationId) => {
    if (isFF(FF_OPTIC_2)) this.saveDraft();
    this.loadTask(nextTaskId, nextAnnotationId, true);
  };
  onPrevTask = async (prevTaskId, prevAnnotationId) => {
    if (isFF(FF_OPTIC_2)) this.saveDraft();
    this.loadTask(prevTaskId, prevAnnotationId, true);
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

    if (!loadNext || this.datamanager.isExplorer) {
      await this.loadTask(taskID, currentAnnotation.pk, true);
    } else {
      await this.loadTask();
    }
    return result;
  }

  /** @private */
  prepareData(annotation, { includeId, draft } = {}) {
    const userGenerate = !annotation.userGenerate || annotation.sentUserGenerate;

    const sessionTime = (new Date() - annotation.loadedDate) / 1000;
    const submittedTime = Number(annotation.leadTime ?? 0);
    const draftTime = Number(this.task.drafts[0]?.lead_time ?? 0);
    const lead_time = sessionTime + submittedTime + draftTime;

    const result = {
      lead_time,
      result: (draft ? annotation.versions.draft : annotation.serializeAnnotation()) ?? [],
      draft_id: annotation.draftId,
      parent_prediction: annotation.parent_prediction,
      parent_annotation: annotation.parent_annotation,
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
    this.lsfInstance?.destroy?.();
    this.lsfInstance = null;
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
