import { destroy, flow, types } from "mobx-state-tree";
import { Modal } from "../components/Common/Modal/Modal";
import { FF_DEV_2887, FF_LOPS_E_3, isFF } from "../utils/feature-flags";
import { History } from "../utils/history";
import { isDefined } from "../utils/utils";
import { Action } from "./Action";
import * as DataStores from "./DataStores";
import { DynamicModel, registerModel } from "./DynamicModel";
import { TabStore } from "./Tabs";
import { CustomJSON } from "./types";
import { User } from "./Users";
import { ActivityObserver } from "../utils/ActivityObserver";

/**
 * @type {ActivityObserver | null}
 */
let networkActivity = null;

const PROJECTS_FETCH_PERIOD = 10 * 1000; // 10 seconds

export const AppStore = types
  .model("AppStore", {
    mode: types.optional(types.enumeration(["explorer", "labelstream", "labeling"]), "explorer"),

    viewsStore: types.optional(TabStore, {
      views: [],
    }),

    project: types.optional(CustomJSON, {}),

    loading: types.optional(types.boolean, false),

    loadingData: false,

    users: types.optional(types.array(User), []),

    taskStore: types.optional(
      types.late(() => {
        return DynamicModel.get("tasksStore");
      }),
      {},
    ),

    annotationStore: types.optional(
      types.late(() => {
        return DynamicModel.get("annotationsStore");
      }),
      {},
    ),

    availableActions: types.optional(types.array(Action), []),

    serverError: types.map(CustomJSON),

    crashed: false,

    interfaces: types.map(types.boolean),

    toolbar: types.string,
  })
  .views((self) => ({
    /** @returns {import("../sdk/dm-sdk").DataManager} */
    get SDK() {
      return self._sdk;
    },

    /** @returns {import("../sdk/lsf-sdk").LSFWrapper} */
    get LSF() {
      return self.SDK.lsf;
    },

    /** @returns {import("../utils/api-proxy").APIProxy} */
    get API() {
      return self.SDK.api;
    },

    get apiVersion() {
      return self.SDK.apiVersion;
    },

    get isLabeling() {
      return !!self.dataStore?.selected || self.isLabelStreamMode || self.mode === "labeling";
    },

    get isLabelStreamMode() {
      return self.mode === "labelstream";
    },

    get isExplorerMode() {
      return self.mode === "explorer" || self.mode === "labeling";
    },

    get currentView() {
      return self.viewsStore.selected;
    },

    get dataStore() {
      switch (self.target) {
        case "tasks":
          return self.taskStore;
        case "annotations":
          return self.annotationStore;
        default:
          return null;
      }
    },

    get target() {
      return self.viewsStore.selected?.target ?? "tasks";
    },

    get labelingIsConfigured() {
      return self.project?.config_has_control_tags === true;
    },

    get labelingConfig() {
      return self.project.label_config_line ?? self.project.label_config;
    },

    get showPreviews() {
      return self.SDK.showPreviews;
    },

    get currentSelection() {
      return self.currentView.selected.snapshot;
    },

    get currentFilter() {
      return self.currentView.filterSnposhot;
    },
  }))
  .volatile(() => ({
    needsDataFetch: false,
    projectFetch: false,
    requestsInFlight: new Map(),
  }))
  .actions((self) => ({
    startPolling() {
      if (self._poll) return;
      if (self.SDK.polling === false) return;

      const poll = async (self) => {
        if (networkActivity.active) await self.fetchProject({ interaction: "timer" });
        self._poll = setTimeout(() => poll(self), PROJECTS_FETCH_PERIOD);
      };

      poll(self);
    },

    afterCreate() {
      networkActivity?.destroy();
      networkActivity = new ActivityObserver();
    },

    beforeDestroy() {
      clearTimeout(self._poll);
      window.removeEventListener("popstate", self.handlePopState);
      networkActivity.destroy();
    },

    setMode(mode) {
      self.mode = mode;
    },

    setActions(actions) {
      if (!Array.isArray(actions)) throw new Error("Actions must be an array");
      self.availableActions = actions;
    },

    removeAction(id) {
      const action = self.availableActions.find((action) => action.id === id);

      if (action) destroy(action);
    },

    interfaceEnabled(name) {
      return self.interfaces.get(name) === true;
    },

    enableInterface(name) {
      if (!self.interfaces.has(name)) {
        console.warn(`Unknown interface ${name}`);
      } else {
        self.interfaces.set(name, true);
      }
    },

    disableInterface(name) {
      if (!self.interfaces.has(name)) {
        console.warn(`Unknown interface ${name}`);
      } else {
        self.interfaces.set(name, false);
      }
    },

    setToolbar(toolbarString) {
      self.toolbar = toolbarString;
    },

    setTask: flow(function* ({ taskID, annotationID, pushState }) {
      if (pushState !== false) {
        History.navigate({ task: taskID, annotation: annotationID ?? null, interaction: null });
      }

      if (!isDefined(taskID)) return;

      self.loadingData = true;

      if (self.mode === "labelstream") {
        yield self.taskStore.loadNextTask({
          select: !!taskID && !!annotationID,
        });
      }

      if (annotationID !== undefined) {
        self.annotationStore.setSelected(annotationID);
      } else {
        self.taskStore.setSelected(taskID);

        yield self.taskStore.loadTask(taskID, {
          select: !!taskID && !!annotationID,
        });

        const annotation = self.LSF?.currentAnnotation;
        const id = annotation?.pk ?? annotation?.id;

        self.LSF?.setLSFTask(self.taskStore.selected, id);

        self.loadingData = false;
      }
    }),

    unsetTask(options) {
      try {
        self.annotationStore.unset();
        self.taskStore.unset();
      } catch (e) {
        /* Something weird */
      }

      if (options?.pushState !== false) {
        History.navigate({ task: null, annotation: null });
      }
    },

    unsetSelection() {
      self.annotationStore.unset({ withHightlight: true });
      self.taskStore.unset({ withHightlight: true });
    },

    createDataStores() {
      const grouppedColumns = self.viewsStore.columns.reduce((res, column) => {
        res.set(column.target, res.get(column.target) ?? []);
        res.get(column.target).push(column);
        return res;
      }, new Map());

      grouppedColumns.forEach((columns, target) => {
        const dataStore = DataStores[target].create?.(columns);

        if (dataStore) registerModel(`${target}Store`, dataStore);
      });
    },

    startLabelStream(options = {}) {
      if (!self.confirmLabelingConfigured()) return;

      const nextAction = () => {
        self.SDK.setMode("labelstream");

        if (options?.pushState !== false) {
          History.navigate({ labeling: 1 });
        }
      };

      if (isFF(FF_DEV_2887) && self.LSF?.lsf?.annotationStore?.selected?.commentStore?.hasUnsaved) {
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

      nextAction();
    },

    startLabeling(item, options = {}) {
      if (!self.confirmLabelingConfigured()) return;

      if (self.dataStore.loadingItem) return;

      const nextAction = () => {
        self.SDK.setMode("labeling");

        if (item && !item.isSelected) {
          const labelingParams = {
            pushState: options?.pushState,
          };

          if (isDefined(item.task_id)) {
            Object.assign(labelingParams, {
              annotationID: item.id,
              taskID: item.task_id,
            });
          } else {
            Object.assign(labelingParams, {
              taskID: item.id,
            });
          }

          self.setTask(labelingParams);
        } else {
          self.closeLabeling();
        }
      };

      if (isFF(FF_DEV_2887) && self.LSF?.lsf?.annotationStore?.selected?.commentStore?.hasUnsaved) {
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

      nextAction();
    },

    confirmLabelingConfigured() {
      if (!self.labelingIsConfigured) {
        Modal.confirm({
          title: "You're almost there!",
          body: "Before you can annotate the data, set up labeling configuration",
          onOk() {
            self.SDK.invoke("settingsClicked");
          },
          okText: "Go to setup",
        });
        return false;
      }
      return true;
    },

    closeLabeling(options) {
      const { SDK } = self;

      self.unsetTask(options);

      let viewId;
      const tabFromURL = History.getParams().tab;

      if (isDefined(self.currentView)) {
        viewId = self.currentView.tabKey;
      } else if (isDefined(tabFromURL)) {
        viewId = tabFromURL;
      } else if (isDefined(self.viewsStore)) {
        viewId = self.viewsStore.views[0]?.tabKey;
      }

      if (isDefined(viewId)) {
        History.forceNavigate({ tab: viewId });
      }

      SDK.setMode("explorer");
      SDK.destroyLSF();
    },

    handlePopState: (({ state }) => {
      const { tab, task, annotation, labeling } = state ?? {};

      if (tab) {
        const tabId = Number.parseInt(tab);

        self.viewsStore.setSelected(Number.isNaN(tabId) ? tab : tabId, {
          pushState: false,
          createDefault: false,
        });
      }

      if (task) {
        const params = {};

        if (annotation) {
          params.task_id = Number.parseInt(task);
          params.id = Number.parseInt(annotation);
        } else {
          params.id = Number.parseInt(task);
        }

        self.startLabeling(params, { pushState: false });
      } else if (labeling) {
        self.startLabelStream({ pushState: false });
      } else {
        self.closeLabeling({ pushState: false });
      }
    }).bind(self),

    resolveURLParams() {
      window.addEventListener("popstate", self.handlePopState);
    },

    setLoading(value) {
      self.loading = value;
    },

    fetchProject: flow(function* (options = {}) {
      self.projectFetch = options.force === true;

      const isTimer = options.interaction === "timer";
      const params =
        options && options.interaction
          ? {
              interaction: options.interaction,
              ...(isTimer
                ? {
                    include: [
                      "task_count",
                      "task_number",
                      "annotation_count",
                      "num_tasks_with_annotations",
                      "queue_total",
                    ].join(","),
                  }
                : null),
            }
          : null;

      try {
        const newProject = yield self.apiCall("project", params);
        const projectLength = Object.entries(self.project ?? {}).length;

        self.needsDataFetch =
          options.force !== true && projectLength > 0
            ? self.project.task_count !== newProject.task_count ||
              self.project.task_number !== newProject.task_number ||
              self.project.annotation_count !== newProject.annotation_count ||
              self.project.num_tasks_with_annotations !== newProject.num_tasks_with_annotations
            : false;

        if (options.interaction === "timer") {
          self.project = Object.assign(self.project ?? {}, newProject);
        } else if (JSON.stringify(newProject ?? {}) !== JSON.stringify(self.project ?? {})) {
          self.project = newProject;
        }
        if (isFF(FF_LOPS_E_3)) {
          const itemType = self.SDK.type === "DE" ? "dataset" : "project";

          self.SDK.invoke(`${itemType}Updated`, self.project);
        }
      } catch {
        self.crash();
        return false;
      }
      self.projectFetch = false;
      return true;
    }),

    fetchActions: flow(function* () {
      const serverActions = yield self.apiCall("actions");

      const actions = (serverActions ?? []).map((action) => {
        return [action, undefined];
      });

      self.SDK.updateActions(actions);
    }),

    fetchUsers: flow(function* () {
      const list = yield self.apiCall("users");

      self.users.push(...list);
    }),

    fetchData: flow(function* ({ isLabelStream } = {}) {
      self.setLoading(true);

      const { tab, task, labeling, query } = History.getParams();

      self.viewsStore.fetchColumns();

      const requests = [self.fetchProject(), self.fetchUsers()];

      if (!isLabelStream || (self.project?.show_annotation_history && task)) {
        if (self.SDK.type === "dm") {
          requests.push(self.fetchActions());
        }

        if (self.SDK.settings?.onlyVirtualTabs && self.project?.show_annotation_history && !task) {
          requests.push(
            self.viewsStore.addView(
              {
                virtual: true,
                projectId: self.SDK.projectId,
                tab,
              },
              { autosave: false, reload: false },
            ),
          );
        } else if (self.SDK.type === "labelops") {
          requests.push(
            self.viewsStore.addView(
              {
                virtual: false,
                projectId: self.SDK.projectId,
                tab,
              },
              { autosave: false, autoSelect: true, reload: true },
            ),
          );
        } else {
          requests.push(self.viewsStore.fetchTabs(tab, task, labeling));
        }
      } else if (isLabelStream && !!tab) {
        const { selectedItems } = JSON.parse(decodeURIComponent(query ?? "{}"));

        requests.push(self.viewsStore.fetchSingleTab(tab, selectedItems ?? {}));
      }

      const [projectFetched] = yield Promise.all(requests);

      if (projectFetched) {
        self.resolveURLParams();

        self.setLoading(false);

        self.startPolling();
      }
    }),

    /**
     * Main API calls provider for the whole application.
     * `params` are used both for var substitution and query params if var is unknown:
     * `{ project: 123, order: "desc" }` for method `"tasks": "/project/:pk/tasks"`
     * will produce `/project/123/tasks?order=desc` url
     * @param {string} methodName one of the methods in api-config
     * @param {object} params url vars and query string params
     * @param {object} body for POST/PATCH requests
     * @param {{ errorHandler?: fn, headers?: object, allowToCancel?: boolean }} [options] additional options like errorHandler
     */
    apiCall: flow(function* (methodName, params, body, options) {
      const isAllowCancel = options?.allowToCancel;
      const controller = new AbortController();
      const signal = controller.signal;
      const apiTransform = self.SDK.apiTransform?.[methodName];
      const requestParams = apiTransform?.params?.(params) ?? params ?? {};
      const requestBody = apiTransform?.body?.(body) ?? body ?? {};
      const requestHeaders = apiTransform?.headers?.(options?.headers) ?? options?.headers ?? {};
      const requestKey = `${methodName}_${JSON.stringify(params || {})}`;

      if (isAllowCancel) {
        requestHeaders.signal = signal;
        if (self.requestsInFlight.has(requestKey)) {
          /* if already in flight cancel the first in favor of new one */
          self.requestsInFlight.get(requestKey).abort();
          console.log(`Request ${requestKey} canceled`);
        }
        self.requestsInFlight.set(requestKey, controller);
      }
      const result = yield self.API[methodName](requestParams, {
        headers: requestHeaders,
        body: requestBody.body ?? requestBody,
        options,
      });

      if (isAllowCancel) {
        result.isCanceled = signal.aborted;
        self.requestsInFlight.delete(requestKey);
      }
      if (result.error && result.status !== 404 && !signal.aborted) {
        if (options?.errorHandler?.(result)) {
          return result;
        }

        if (result.response) {
          try {
            self.serverError.set(methodName, {
              error: "Something went wrong",
              response: result.response,
            });
          } catch {
            // ignore
          }
        }

        console.warn({
          message: "Error occurred when loading data",
          description: result?.response?.detail ?? result.error,
        });

        self.SDK.invoke("error", result);

        // notification.error({
        //   message: "Error occurred when loading data",
        //   description: result?.response?.detail ?? result.error,
        // });
      } else {
        try {
          self.serverError.delete(methodName);
        } catch {
          // ignore
        }
      }

      return result;
    }),

    invokeAction: flow(function* (actionId, options = {}) {
      const view = self.currentView ?? {};

      const needsLock = self.availableActions.findIndex((a) => a.id === actionId) >= 0;

      const { selected } = view;
      const actionCallback = self.SDK.getAction(actionId);

      if (view && needsLock && !actionCallback) view.lock();

      const labelStreamMode = localStorage.getItem("dm:labelstream:mode");

      // @todo this is dirty way to sync across nested apps
      // don't apply filters for "all" on "next_task"
      const actionParams = {
        ordering: view.ordering,
        selectedItems: selected?.snapshot ?? { all: false, included: [] },
        filters: {
          conjunction: view.conjunction ?? "and",
          items: view.serializedFilters ?? [],
        },
      };

      if (actionId === "next_task") {
        const isSelectAll = actionParams.selectedItems.all === true;
        const isAllLabelStreamMode = labelStreamMode === "all";
        const isFilteredLabelStreamMode = labelStreamMode === "filtered";
        if (isAllLabelStreamMode && !isSelectAll) {
          delete actionParams.filters;

          if (actionParams.selectedItems.all === false && actionParams.selectedItems.included.length === 0) {
            delete actionParams.selectedItems;
            delete actionParams.ordering;
          }
        } else if (isFilteredLabelStreamMode) {
          delete actionParams.selectedItems;
        }
      }

      if (actionCallback instanceof Function) {
        return actionCallback(actionParams, view);
      }

      const requestParams = {
        id: actionId,
      };

      if (isDefined(view.id) && !view?.virtual) {
        requestParams.tabID = view.id;
      }

      if (options.body) {
        Object.assign(actionParams, options.body);
      }

      const result = yield self.apiCall("invokeAction", requestParams, {
        body: actionParams,
      });

      if (result.reload) {
        self.SDK.reload();
        return;
      }

      if (options.reload !== false) {
        yield view.reload();
        self.fetchProject();
        view.clearSelection();
      }

      view?.unlock?.();

      return result;
    }),

    crash() {
      self.destroy();
      self.crashed = true;
      self.SDK.invoke("crash");
    },

    destroy() {
      if (self.taskStore) {
        self.taskStore?.clear();
        self.taskStore = undefined;
      }

      if (self.annotationStore) {
        self.annotationStore?.clear();
        self.annotationStore = undefined;
      }

      clearTimeout(self._poll);
    },
  }));
