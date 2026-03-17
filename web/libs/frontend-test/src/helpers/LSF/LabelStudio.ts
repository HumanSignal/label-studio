import { fixLSParams } from "@humansignal/frontend-test/helpers/utils/fixLSParams";
import { expect } from "chai";
import { ImageView } from "./ImageView";

type LSParams = Record<string, any>;

class LSParamsBuilder {
  params: LSParams = {
    config: "<View></View>",
    interfaces: [
      "panel",
      "update",
      "submit",
      "skip",
      "controls",
      "infobar",
      "topbar",
      "instruction",
      "side-column",
      "ground-truth",
      "annotations:tabs",
      "annotations:menu",
      "annotations:current",
      "annotations:add-new",
      "annotations:delete",
      "annotations:view-all",
      "annotations:copy-link",
      "predictions:tabs",
      "predictions:menu",
      "auto-annotation",
      "edit-history",
    ],
    task: {
      id: 1,
      data: {},
      annotations: [],
      predictions: [],
    },
  };
  private _localStorageItems: Record<string, any> = {};
  private ls: typeof LabelStudio = null;

  constructor(ls: typeof LabelStudio) {
    this.ls = ls;
  }

  init(beforeLoadCallback?: (win: Cypress.AUTWindow) => void) {
    this.ls.init(this.params, (win) => {
      Object.entries(this._localStorageItems).forEach(([key, value]) => {
        win.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      });
      beforeLoadCallback?.(win);
    });
  }

  private get _task() {
    if (!this.params.task) {
      this.params.task = {
        id: 1,
      };
    }
    return this.params.task;
  }

  private get _annotations() {
    const task = this._task;

    if (!task.annotations) {
      task.annotations = [];
    }
    return task.annotations;
  }

  private get _predictions() {
    const task = this._task;

    if (!task.predictions) {
      task.predictions = [];
    }
    return task.predictions;
  }

  config(config) {
    this.params.config = config;
    return this;
  }
  data(data) {
    this.params.task.data = data;
    return this;
  }
  task(task) {
    this.params.task = task;
    return this;
  }
  annotations(annotations) {
    this._task.annotations = annotations;
    return this;
  }
  withAnnotation(annotation) {
    this._annotations.push(annotation);
    return this;
  }
  withPrediction(prediction) {
    this._predictions.push(prediction);
    return this;
  }
  withResult(result) {
    this._annotations.push({
      id: this._annotations.length + 1001,
      result,
    });
    return this;
  }
  interfaces(interfaces) {
    this.params.interfaces = interfaces;
    return this;
  }
  withInterface(interfaceName: string) {
    if (this.params.interfaces.indexOf(interfaceName) < 0) {
      this.params.interfaces.push(interfaceName);
    }
    return this;
  }
  withoutInterface(interfaceName: string) {
    const idx = this.params.interfaces.indexOf(interfaceName);
    const isExist = idx >= 0;

    if (isExist) {
      this.params.interfaces.splice(idx, 1);
    }
    return this;
  }

  eventListeners(eventListeners) {
    this.params.eventListeners = eventListeners;
    return this;
  }

  withEventListener(eventName, listener) {
    if (!this.params.eventListeners) this.params.eventListeners = {};
    this.params.eventListeners[eventName] = listener;
    return this;
  }

  withParam(paramName, paramValue) {
    this.params[paramName] = paramValue;
    return this;
  }
  localStorageItems(items) {
    this._localStorageItems = items;
    return this;
  }
  withLocalStorageItem(key, value) {
    this._localStorageItems[key] = value;
    return this;
  }
}

export const LabelStudio = {
  /**
   * Initializes LabelStudio instance with given configuration
   */
  init(params: LSParams, beforeLoadCallback?: (win: Cypress.AUTWindow) => void) {
    cy.log("Initialize LSF");

    // Make it part of the Cypress chain to allow run init more than once
    cy.wrap(null).then(() => {
      const windowLoadCallback = (win: Cypress.AUTWindow) => {
        win.DEFAULT_LSF_INIT = false;
        win.LSF_CONFIG = {
          interfaces: [
            "panel",
            "update",
            "submit",
            "skip",
            "controls",
            "infobar",
            "topbar",
            "instruction",
            "side-column",
            "ground-truth",
            "annotations:tabs",
            "annotations:menu",
            "annotations:current",
            "annotations:add-new",
            "annotations:delete",
            "annotations:view-all",
            "annotations:copy-link",
            "predictions:tabs",
            "predictions:menu",
            "auto-annotation",
            "edit-history",
          ],
          ...params,
        };
        beforeLoadCallback?.(win);

        Cypress.off("window:before:load", windowLoadCallback);
      };

      Cypress.on("window:before:load", windowLoadCallback);

      const defaultCpuThrottling = Cypress.env("DEFAULT_CPU_THROTTLING");
      const defaultNetworkThrottling = Cypress.env("DEFAULT_NETWORK_THROTTLING");

      if (defaultCpuThrottling) {
        cy.resetCPU();
      }
      if (defaultNetworkThrottling) {
        cy.resetNetwork();
      }

      cy.visit("/").then((win) => {
        if (defaultCpuThrottling) {
          cy.throttleCPU(defaultCpuThrottling);
        }
        if (defaultNetworkThrottling) {
          // Parse network throttling preset
          switch (defaultNetworkThrottling) {
            case "slow3g":
              cy.setSlow3GNetwork();
              break;
            case "fast3g":
              cy.setFast3GNetwork();
              break;
            case "4g":
              cy.set4GNetwork();
              break;
            default:
              cy.log(`Unknown network throttling preset: ${defaultNetworkThrottling}`);
          }
        }
        cy.log(`Default feature flags set ${JSON.stringify(win.APP_SETTINGS.feature_flags, null, "  ")}`);
        const labelStudio = new win.LabelStudio("label-studio", fixLSParams(win.LSF_CONFIG, win));

        if (win.LSF_CONFIG.eventListeners) {
          for (const [event, listener] of Object.entries(win.LSF_CONFIG.eventListeners)) {
            labelStudio.on(event, listener);
          }
        }
        expect(win.LabelStudio.instances.size).to.be.equal(1);
        cy.get(".lsf-editor").should("be.visible");
        cy.log("Label Studio initialized");
      });
    });
  },

  params() {
    return new LSParamsBuilder(this);
  },

  /**
   * Exports current result from LabelStudio's selected annotationStore
   */
  serialize() {
    return cy.window().then((win) => {
      return win.Htx.annotationStore.selected.serializeAnnotation();
    });
  },

  /**
   * Wait until the objects are ready for interactions
   * It uses inner logic of LabelStudio's object tag models
   */
  waitForObjectsReady() {
    cy.window().then((win) => {
      return new Promise((resolve) => {
        const watchObjectsReady = () => {
          const isReady = win.Htx.annotationStore.selected.objects.every((object) => object.isReady);

          if (isReady) {
            resolve(true);
          } else {
            setTimeout(watchObjectsReady, 16);
          }
        };

        watchObjectsReady();
      });
    });
  },

  /**
   * Wait for objects ready and then for the image view (image loaded and Konva canvas).
   * Use in image-based specs to avoid repeating waitForObjectsReady + ImageView.waitForImage.
   */
  waitForImageReady() {
    this.waitForObjectsReady();
    ImageView.waitForImage();
  },

  /**
   * Set feature flags on navigation
   */
  setFeatureFlagsOnPageLoad(flags: Record<string, boolean>) {
    Cypress.on("window:before:load", (win) => {
      win.FEATURE_FLAGS = flags;
    });
  },

  /**
   * Add new settings to previously set feature flags on navigation.
   * Sets both FEATURE_FLAGS and APP_SETTINGS.feature_flags so that @humansignal/core
   * (which reads APP_SETTINGS.feature_flags at module load time) sees the flags.
   */
  addFeatureFlagsOnPageLoad(flags: Record<string, boolean>) {
    Cypress.on("window:before:load", (win) => {
      win.FEATURE_FLAGS = {
        ...(win.FEATURE_FLAGS || {}),
        ...flags,
      };
      win.APP_SETTINGS = win.APP_SETTINGS ?? {};
      win.APP_SETTINGS.feature_flags = {
        ...(win.APP_SETTINGS.feature_flags ?? {}),
        ...(win.FEATURE_FLAGS ?? {}),
        ...flags,
      };
    });
  },

  /**
   * Toggle feature flags on and off
   */
  setFeatureFlags(flags: Record<string, boolean>) {
    cy.log("Setting feature flags");
    cy.window().then((win) => {
      win.APP_SETTINGS = win.APP_SETTINGS ?? {};
      win.APP_SETTINGS.feature_flags = {
        ...(win.APP_SETTINGS.feature_flags ?? {}),
        ...flags,
      };
      console.log(win.APP_SETTINGS);
    });
  },

  /**
   * Assers if the feature flag's state matches a given state
   * Checks for enabled flags by default
   */
  shouldHaveFeatureFlag(flagName: string, enabled = true) {
    return this.getFeatureFlag(flagName).then((flagValue) => {
      expect(flagValue).to.be.eq(enabled);
    });
  },

  /**
   * Returns Cypress wrapper around a feature flag value.
   * Allows performing asserions on it using `.should()`
   */
  featureFlag(flagName: string) {
    return this.getFeatureFlag(flagName).then((flagValue) => {
      return flagValue;
    });
  },

  /**
   * Returns a value of a specific feature flag
   */
  getFeatureFlag(flagName: string) {
    return cy.window().then((win) => {
      const featureFlags = (win.APP_SETTINGS?.feature_flags ?? {}) as Record<string, boolean>;

      const flagValue =
        flagName in featureFlags ? featureFlags[flagName] : window.APP_SETTINGS?.feature_flags_default_value === true;

      return flagValue;
    });
  },
};
