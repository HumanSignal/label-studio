/** @global LSF * /

/**
 * @typedef {{
 *  hiddenColumns?: {
 *    labeling?: string[],
 *    explore?: string[],
 *  },
 *  visibleColumns?: {
 *    labeling?: string[],
 *    explore?: string[],
 *  }
 * }} TableConfig
 */

/**
 * @typedef {{
 * root: HTMLElement,
 * polling: boolean,
 * apiGateway: string | URL,
 * apiEndpoints: import("../utils/api-proxy").Endpoints,
 * apiMockDisabled: boolean,
 * apiHeaders?: Dict<string>,
 * settings: Dict<any>,
 * labelStudio: Dict<any>,
 * env: "development" | "production",
 * mode: "labelstream" | "explorer",
 * table: TableConfig,
 * links: Dict<string|null>,
 * showPreviews: boolean,
 * projectId?: number,
 * datasetId?: number,
 * interfaces: Dict<boolean>,
 * instruments: Dict<any>,
 * toolbar?: string,
 * spinner?: import("react").ReactNode
 * apiTransform?: Record<string, Record<string, Function>
 * tabControls?: { add?: boolean, delete?: boolean, edit?: boolean, duplicate?: boolean, lock?: boolean },
 * AgreementSettingsSummary?: import("react").ComponentType<{ filters: unknown }>,
 * }} DMConfig
 */

import { inject, observer } from "mobx-react";
import { destroy } from "mobx-state-tree";
import { unmountComponentAtNode } from "react-dom";
import { camelCase } from "@humansignal/core/lib/utils/string";
import { instruments } from "../components/DataManager/Toolbar/instruments";
import { APIProxy } from "../utils/api-proxy";
import { objectToMap } from "../utils/helpers";
import { serializeJsonForUrl, deserializeJsonFromUrl } from "@humansignal/core";
import { isDefined } from "../utils/utils";
import { APIConfig } from "./api-config";
import { createApp } from "./app-create";
import { LSFWrapper } from "./lsf-sdk";
import { taskToLSFormat } from "./lsf-utils";

/**
 * Load the editor and project hotkeys before a labeling session starts.
 * Returns the keymap to pass into Label Studio, or null if DM was destroyed
 * while those requests were in flight.
 * @param {{
 *   loadEditor?: () => Promise<unknown>,
 *   beforeLabeling?: () => Promise<unknown>,
 *   keymap?: Record<string, unknown>,
 *   isDestroyed?: () => boolean,
 * }} options
 */
export async function prepareLabelingRuntime({ loadEditor, beforeLabeling, keymap, isDestroyed } = {}) {
  if (loadEditor && !window.LabelStudio) {
    await loadEditor();
  }
  if (isDestroyed?.()) return null;
  if (beforeLabeling) {
    await beforeLabeling();
  }
  if (isDestroyed?.()) return null;

  return {
    ...(keymap ?? {}),
    ...(window.APP_SETTINGS?.editor_keymap ?? {}),
  };
}

export function labelingEditorLoadFailedMessage() {
  const isMac =
    typeof navigator !== "undefined" &&
    (String(navigator.platform).startsWith("Mac") || navigator.platform === "iPhone");

  return `Oops! We're having trouble loading this page. Please refresh the page by pressing ${
    isMac ? "CMD" : "CTRL"
  } + SHIFT + R. If this doesn't work, try closing and reopening your browser.`;
}

const DEFAULT_TOOLBAR =
  "grid-select-all actions columns filters ordering label-button loading-possum error-box | refresh import-button export-button density-toggle grid-size view-toggle";

const prepareInstruments = (instruments) => {
  const result = Object.entries(instruments).map(([name, builder]) => [name, builder({ inject, observer })]);

  return objectToMap(Object.fromEntries(result));
};

export class DataManager {
  /** @type {HTMLElement} */
  root = null;

  /** @type {APIProxy} */
  api = null;

  /** @type {import("./lsf-sdk").LSFWrapper} */
  lsf = null;

  /** @type {Dict} */
  settings = {};

  /** @type {import("../stores/AppStore").AppStore} */
  store = null;

  /** @type {Dict<any>} */
  labelStudioOptions = {};

  /** @type {"development" | "production"} */
  env = "development";

  /** @type {"explorer" | "labelstream"} */
  mode = "explorer";

  /** @type {TableConfig} */
  tableConfig = {};

  /** @type {Dict<string|null>} */
  links = {
    import: "/import",
    export: "/export",
    settings: "./settings",
  };

  /**
   * @private
   * @type {Map<String, Set<Function>>}
   */
  callbacks = new Map();

  /**
   * @private
   * @type {Map<String, Set<Function>>}
   */
  actions = new Map();

  /** @type {Number} */
  apiVersion = 1;

  /** @type {boolean} */
  showPreviews = false;

  /** @type {boolean} */
  polling = true;

  /** @type {boolean} */
  started = false;

  instruments = new Map();

  /**
   * @type {DMConfig.tabControls}
   */
  tabControls = {
    add: true,
    delete: true,
    edit: true,
    duplicate: true,
    lock: true,
  };

  /** @type {"dm" | "labelops"} */
  type = "dm";

  /** @type {string} */
  role = null;

  /**
   * Constructor
   * @param {DMConfig} config
   */
  constructor(config) {
    this.root = config.root;
    this.project = config.project;
    this.projectId = config.projectId ?? this?.project?.id;
    this.dataset = config.dataset;
    this.datasetId = config.datasetId;
    this.settings = config.settings;
    this.labelStudioOptions = config.labelStudio;
    this.env = config.env ?? process.env.NODE_ENV ?? this.env;
    this.mode = config.mode ?? this.mode;
    this.tableConfig = config.table ?? {};
    this.apiVersion = config?.apiVersion ?? 1;
    this.links = Object.assign(this.links, config.links ?? {});
    this.showPreviews = config.showPreviews ?? false;
    this.polling = config.polling;
    this.toolbar = config.toolbar ?? DEFAULT_TOOLBAR;
    this.spinner = config.spinner;
    this.spinnerSize = config.spinnerSize;
    this.instruments = prepareInstruments(config.instruments ?? {});
    this.apiTransform = config.apiTransform ?? {};
    this.preload = config.preload ?? {};
    this.role = config.role ?? null;
    this.interfaces = objectToMap({
      tabs: true,
      toolbar: true,
      import: true,
      export: true,
      labelButton: true,
      backButton: true,
      labelingHeader: true,
      groundTruth: false,
      instruction: false,
      autoAnnotation: false,
      ...config.interfaces,
    });

    this.api = new APIProxy(
      this.apiConfig({
        apiGateway: config.apiGateway,
        apiEndpoints: config.apiEndpoints,
        apiMockDisabled: config.apiMockDisabled,
        apiSharedParams: config.apiSharedParams,
        apiHeaders: config.apiHeaders,
      }),
    );

    Object.assign(this.tabControls, config.tabControls ?? {});

    // Store enterprise-host callbacks and components (LSE); OSS Data Manager does not set these.
    this.onViewAnalytics = config.onViewAnalytics;
    this.onViewReviewerAnalytics = config.onViewReviewerAnalytics;
    this.RowContextMenuComponent = config.RowContextMenuComponent;
    /** LSE only: rich agreement header tooltip (`filters` prop). OSS uses built-in plain summary. */
    this.AgreementSettingsSummary = config.AgreementSettingsSummary ?? null;

    this.updateActions(config.actions);

    this.type = config.type ?? "dm";
    this.explorerPreload = config.explorerPreload ?? null;

    this.initApp();
  }

  get isExplorer() {
    return this.mode === "labeling";
  }

  get isLabelStream() {
    return this.mode === "labelstream";
  }

  get projectId() {
    return (this._projectId = this._projectId ?? this.root?.dataset?.projectId);
  }

  set projectId(value) {
    this._projectId = value;
  }

  apiConfig({ apiGateway, apiEndpoints, apiMockDisabled, apiSharedParams, apiHeaders }) {
    const config = Object.assign({}, APIConfig);

    config.gateway = apiGateway ?? config.gateway;
    config.mockDisabled = apiMockDisabled;
    config.commonHeaders = apiHeaders;

    Object.assign(config.endpoints, apiEndpoints ?? {});
    const sharedParams = {};

    if (!isNaN(this.projectId)) {
      sharedParams.project = this.projectId;
    }
    if (!isNaN(this.datasetId)) {
      sharedParams.dataset = this.datasetId;
    }
    Object.assign(config, {
      sharedParams: {
        ...sharedParams,
        ...(apiSharedParams ?? {}),
      },
    });

    return config;
  }

  /**
   * @param {import("../stores/Action.js").Action} action
   */
  addAction(action, callback) {
    const { id } = action;

    if (!id) throw new Error("Action must provide a unique ID");

    this.actions.set(id, { action, callback });

    const actions = Array.from(this.actions.values()).map(({ action }) => action);

    this.store?.setActions(actions);
  }

  removeAction(id) {
    this.actions.delete(id);
    this.store.removeAction(id);
  }

  getAction(id) {
    return this.actions.get(id)?.callback;
  }

  installActions() {
    this.actions.forEach(({ action, callback }) => {
      this.addAction(action, callback);
    });
  }

  updateActions(actions) {
    if (!Array.isArray(actions)) return;

    actions.forEach(([action, callback]) => {
      if (!isDefined(action.id)) {
        throw new Error("Every action must provide a unique ID");
      }
      this.addAction(action, callback);
    });
  }

  registerInstrument(name, initializer) {
    if (instruments[name]) {
      return console.warn(`Can't override native instrument ${name}`);
    }

    this.instruments.set(
      name,
      initializer({
        store: this.store,
        observer,
        inject,
      }),
    );

    this.store.updateInstruments();
  }

  /**
   * Assign an event handler
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    if (this.lsf && eventName.startsWith("lsf:")) {
      const evt = camelCase(eventName.replace(/^lsf:/, ""));

      this.lsf?.lsfInstance?.on(evt, callback);
    }

    const events = this.getEventCallbacks(eventName);

    events.add(callback);
    this.callbacks.set(eventName, events);
  }

  /**
   * Remove an event handler
   * If no callback provided, all assigned callbacks will be removed
   * @param {string} eventName
   * @param {Function?} callback
   */
  off(eventName, callback) {
    if (this.lsf && eventName.startsWith("lsf:")) {
      const evt = camelCase(eventName.replace(/^lsf:/, ""));

      this.lsf?.lsfInstance?.off(evt, callback);
    }

    const events = this.getEventCallbacks(eventName);

    if (callback) {
      events.delete(callback);
    } else {
      events.clear();
    }
  }

  removeAllListeners() {
    const lsfEvents = Array.from(this.callbacks.keys()).filter((evt) => evt.startsWith("lsf:"));

    lsfEvents.forEach((evt) => {
      const callbacks = Array.from(this.getEventCallbacks(evt));
      const eventName = camelCase(evt.replace(/^lsf:/, ""));

      callbacks.forEach((clb) => this.lsf?.lsfInstance?.off(eventName, clb));
    });

    this.callbacks.clear();
  }

  /**
   * Check if an event has at least one handler
   * @param {string} eventName Name of the event to check
   */
  hasHandler(eventName) {
    return this.getEventCallbacks(eventName).size > 0;
  }

  /**
   * Check if interface is enabled
   * @param {string} name Name of the interface
   */
  interfaceEnabled(name) {
    return this.store.interfaceEnabled(name);
  }

  /**
   *
   * @param {"explorer" | "labelstream"} mode
   */
  setMode(mode) {
    const modeChanged = mode !== this.mode;

    this.mode = mode;
    this.store.setMode(mode);

    if (modeChanged) this.invoke("modeChanged", this.mode);
  }

  /**
   * Invoke handlers assigned to an event
   * @param {string} eventName
   * @param {any[]} args
   */
  async invoke(eventName, ...args) {
    if (eventName.startsWith("lsf:")) return;

    this.getEventCallbacks(eventName).forEach((callback) => callback.apply(this, args));
  }

  /**
   * Get callbacks set for a particular event
   * @param {string} eventName
   */
  getEventCallbacks(eventName) {
    return this.callbacks.get(eventName) ?? new Set();
  }

  /** @private */
  async initApp() {
    const store = await this._createApp(this.root, this);
    if (this._destroyed) {
      this._discardCreatedApp(store);
      return;
    }
    this.store = store;
    this.invoke("ready", [this]);
  }

  /** @private */
  _createApp(root, datamanager) {
    return createApp(root, datamanager);
  }

  /** @private Drop a store created after destroy() so its poll / render cannot leak. */
  _discardCreatedApp(store) {
    try {
      unmountComponentAtNode(this.root);
    } catch (err) {
      console.error("initApp: unmount leftover app failed", err);
    }
    if (typeof window !== "undefined" && window.DM === store) {
      window.DM = null;
    }
    if (store) {
      try {
        destroy(store);
      } catch (err) {
        console.error("initApp: destroy leftover store failed", err);
      }
    }
  }

  initLSF(element) {
    if (this.lsf) return this._lsfInit;
    if (this._lsfInit) return this._lsfInit;

    const generation = {};
    this._lsfGeneration = generation;
    const isStale = () => this._lsfGeneration !== generation;
    this._lsfInit = (async () => {
      // Do not create a second editor while the previous one is saving its
      // draft and tearing down.
      if (this._destroyLSFInFlight) await this._destroyLSFInFlight;
      if (this._destroyed || isStale()) return;
      return this._initLSF(element, isStale);
    })();
    return this._lsfInit;
  }

  async _initLSF(element, isStale = () => false) {
    const options = this.labelStudioOptions ?? {};

    try {
      const keymap = await prepareLabelingRuntime({
        loadEditor: options.loadEditor,
        beforeLabeling: options.beforeLabeling,
        keymap: options.keymap,
        isDestroyed: () => this._destroyed === true || isStale(),
      });

      if (!keymap || this._destroyed || isStale()) return;

      this.lsf = new LSFWrapper(this, element, {
        ...options,
        keymap,
        task: this.store.taskStore.selected,
        preload: this.preload,
        isLabelStream: this.mode === "labelstream",
      });
    } catch (err) {
      if (isStale() || this._destroyed) return;
      console.error("Failed to load labeling editor", err);
      this._lsfInit = undefined;
      this._lsfGeneration = null;
      this.invoke("toast", {
        message: labelingEditorLoadFailedMessage(),
        type: "error",
        duration: -1,
      });
    }
  }

  /**
   * Initialize LSF or use already initialized instance.
   * Render LSF interface and load task for labeling.
   * @param {HTMLElement} element Root element LSF will be rendered into
   * @param {import("../stores/Tasks").TaskModel} task
   */
  async startLabeling() {
    if (this._lsfInit) await this._lsfInit;
    if (!this.lsf) return;

    const [task, annotation] = [this.store.taskStore.selected, this.store.annotationStore.selected];

    const isLabelStream = this.mode === "labelstream";
    const taskExists = isDefined(this.lsf.task) && isDefined(task);
    const taskSelected = this.lsf.task?.id === task?.id;

    // do nothing if the task is already selected
    if (taskExists && taskSelected) {
      return;
    }

    if (!isLabelStream && (!taskSelected || isDefined(annotation))) {
      // When opening a task from Data Manager rows (without explicit annotation),
      // let LSF pick the default annotation from the loaded task payload.
      const annotationID = annotation?.id;

      // this.lsf.loadTask(task.id, annotationID);
      this.lsf.selectTask(task, annotationID);
    }
  }

  async destroyLSF() {
    if (this._destroyLSFInFlight) return this._destroyLSFInFlight;

    this._destroyLSFInFlight = this._destroyLSFImpl();
    return this._destroyLSFInFlight;
  }

  async _destroyLSFImpl() {
    const lsf = this.lsf;
    this._lsfGeneration = null;
    this._lsfInit = undefined;
    this.lsf = undefined;

    try {
      // A failed draft save (network error, page teardown) must never abort
      // teardown: skipping lsf.destroy() leaves a fully alive second editor
      // (store, message listeners, autosave) parked on the old task, which then
      // absorbs postMessage mutations meant for the next session.
      try {
        await lsf?.saveDraft?.();
      } catch (err) {
        console.error("destroyLSF: saveDraft failed, continuing teardown", err);
      }
      try {
        await this.invoke("beforeLsfDestroy", this, lsf?.lsfInstance);
      } catch (err) {
        console.error("destroyLSF: beforeLsfDestroy failed, continuing teardown", err);
      }
      try {
        lsf?.destroy();
      } catch (err) {
        console.error("destroyLSF: lsf.destroy failed, continuing teardown", err);
      }
    } finally {
      this._destroyLSFInFlight = null;
    }
  }

  async destroy(detachCallbacks = true) {
    this._destroyed = true;
    await this.destroyLSF();
    this._lsfInit = undefined;
    unmountComponentAtNode(this.root);

    if (this.store) {
      destroy(this.store);
    }

    if (detachCallbacks) {
      this.callbacks.forEach((callbacks) => callbacks.clear());
      this.callbacks.clear();
    } else {
      // reload() reuses this instance; keep labeling init allowed after teardown.
      this._destroyed = false;
    }
  }

  async reload() {
    await this.destroy(false);
    await this.initApp();
    this.installActions();
  }

  async apiCall(...args) {
    return this.store.apiCall(...args);
  }

  getInstrument(name) {
    return instruments[name] ?? this.instruments.get(name) ?? null;
  }

  hasInterface(name) {
    return this.interfaces.get(name) === true;
  }

  get toolbarInstruments() {
    const sections = this.toolbar.split("|").map((s) => s.trim());

    const instrumentsList = sections.map((section) => {
      return section.split(" ").filter((instrument) => {
        const nativeInstrument = !!instruments[instrument];
        const customInstrument = !!this.instruments.has(instrument);

        if (!nativeInstrument && !customInstrument) {
          console.warn(`Unknwown instrument detected: ${instrument}. Did you forget to register it?`);
        }

        return nativeInstrument || customInstrument;
      });
    });

    return instrumentsList;
  }
  static urlJSON = { serializeJsonForUrl, deserializeJsonFromUrl };
  static taskToLSFormat = taskToLSFormat;
}
