import { types, getEnv, flow, getSnapshot } from "mobx-state-tree";

import Task from "./TaskStore";
import Project from "./ProjectStore";
import User from "./UserStore";
import Settings from "./SettingsStore";
import CompletionStore from "./CompletionStore";
import Hotkey from "../core/Hotkey";
import { API_URL } from "../constants/Api";
import Utils from "../utils";

import InfoModal from "../components/Infomodal/Infomodal";

export default types
  .model("AppStore", {
    /**
     * XML config
     */
    config: types.string,

    /**
     * Task with data, id and project
     */
    task: types.maybeNull(Task),

    project: types.maybeNull(Project),

    /**
     * Interfaces for configure Label Studio
     */
    interfaces: types.array(types.string),
    /**
     * Flag fo labeling of tasks
     */
    explore: types.optional(types.boolean, false),

    /**
     * Completions Store
     */
    completionStore: types.optional(CompletionStore, {
      completions: [],
      predictions: [],
    }),

    /**
     * Expert of Label Studio
     */
    expert: User,

    /**
     * Debug for development environment
     */
    debug: types.optional(types.boolean, true),

    /**
     * Settings of Label Studio
     */
    settings: types.optional(Settings, {}),

    apiCalls: types.optional(types.boolean, true),

    /**
     * Flag for settings
     */
    showingSettings: types.optional(types.boolean, false),
    /**
     * Flag
     * Description of task in Label Studio
     */
    showingDescription: types.optional(types.boolean, false),
    /**
     * Data of description flag
     */
    description: types.optional(types.string, "No description"),
    /**
     * Loading of Label Studio
     */
    isLoading: types.optional(types.boolean, false),
    /**
     * Flag for disable task in Label Studio
     */
    noTask: types.optional(types.boolean, false),
    /**
     * Finish of labeling
     */
    labeledSuccess: types.optional(types.boolean, false),
  })
  .views(self => ({
    /**
     * Get fetch request
     */
    get fetch() {
      return getEnv(self).fetch;
    },
    /**
     * Get alert
     */
    get alert() {
      return getEnv(self).alert;
    },
    /**
     * Get pot request
     */
    get post() {
      return getEnv(self).post;
    },
  }))
  .actions(self => {
    /**
     * Update settings display state
     */
    function toggleSettings() {
      self.showingSettings = !self.showingSettings;
    }

    /**
     * Update description display state
     */
    function toggleDescription() {
      self.showingDescription = !self.showingDescription;
    }

    /**
     * Function of loading
     */
    function markLoading(loading) {
      self.isLoading = loading;
    }

    /**
     * Check for interfaces
     * @param {string} name
     * @returns {string | undefined}
     */
    function hasInterface(name) {
      return self.interfaces.find(i => name === i);
    }

    /**
     * Function
     */
    const afterCreate = function() {
      self.loadTask();

      /**
       * Hotkey for submit
       */
      Hotkey.addKey("ctrl+enter", self.sendTask);

      /**
       * Hotkey for skip task
       */
      if (self.hasInterface("skip")) Hotkey.addKey("ctrl+space", self.skipTask);

      /**
       * Hotkey for update completion
       */
      if (self.hasInterface("update")) Hotkey.addKey("alt+enter", self.updateTask);

      /**
       * Hotkey for delete
       */
      Hotkey.addKey("ctrl+backspace", function() {
        const { selected } = self.completionStore;
        selected.deleteAllRegions();
      });

      Hotkey.addKey("ctrl+z", function() {
        const { history } = self.completionStore.selected;
        history && history.canUndo && history.undo();
      });

      Hotkey.addKey("escape", function() {
        const c = self.completionStore.selected;
        if (c && c.relationMode) {
          c.stopRelationMode();
        }
      });

      Hotkey.addKey("backspace", function() {
        const c = self.completionStore.selected;
        if (c && c.highlightedNode) {
          c.highlightedNode.deleteRegion();
        }
      });
    };

    /**
     * Load task from API
     */
    function loadTask() {
      if (self.task && self.task.load && self.task.id) {
        return loadTaskAPI(`${API_URL.MAIN}${API_URL.TASKS}/${self.task.id}/`);
      } else if (self.explore && self.project && self.project.id) {
        return loadTaskAPI(`${API_URL.MAIN}${API_URL.PROJECTS}/${self.project.id}${API_URL.NEXT}`);
      }
    }

    /**
     *
     * @param {*} taskObject
     */
    function addTask(taskObject) {
      if (taskObject && !Utils.Checkers.isString(taskObject.data)) {
        taskObject = {
          ...taskObject,
          [taskObject.data]: JSON.stringify(taskObject.data),
        };
      }
      self.task = Task.create(taskObject);
    }

    /**
     * Reset completion store
     */
    function resetState() {
      self.completionStore = CompletionStore.create({ completions: [] });
      const c = self.completionStore.addInitialCompletion();

      self.completionStore.selectCompletion(c.id);
    }

    /**
     * Load task from API
     */
    const loadTaskAPI = flow(function*(url) {
      try {
        const res = yield self.fetch(url);

        if (res instanceof Response && res.status === 404) {
          self.markLoading(false);
          self.noTask = true;
          return;
        }

        res.json().then(function(r) {
          r.data = JSON.stringify(r.data);

          self.addTask(r);
          self.markLoading(false);

          if (self.hasInterface("completions") && r.completions) {
            self.completionStore.destroyCompletion(self.completionStore.selected);

            for (var i = 0; i < r.completions.length; i++) {
              const c = r.completions[i];

              if (c.was_cancelled === true) continue;

              const comp = self.completionStore.addSavedCompletion(c);
              comp.traverseTree(node => node.updateValue && node.updateValue(self));
              self.completionStore.selectCompletion(comp.id);
              comp.deserializeCompletion(c.result);
              comp.reinitHistory();
            }
          } else {
            if (self.completionStore.selected)
              self.completionStore.selected.traverseTree(node => node.updateValue && node.updateValue(self));

            // self.addGeneratedCompletion(r);
          }

          if (self.hasInterface("predictions") && r.predictions) {
            if (r.predictions && r.predictions.length) {
              for (let i = 0; i < r.predictions.length; i++) {
                const pred = self.completionStore.addPrediction(r.predictions[i]);
                pred.traverseTree(node => node.updateValue && node.updateValue(self));
                self.completionStore.selectPrediction(pred.id);
                pred.deserializeCompletion(r.predictions[i].result);
                pred.reinitHistory();
              }
            }
          }
        });
      } catch (err) {
        console.error("Failed to load next task ", err);
      }
    });

    /**
     * Skip current task
     */
    const skipTask = flow(function* skipTask() {
      getEnv(self).skipTask();

      if (getEnv(self).apiCalls) {
        self.markLoading(true);

        try {
          const json = yield self.post(
            `${API_URL.MAIN}${API_URL.TASKS}/${self.task.id}${API_URL.CANCEL}`,
            JSON.stringify({ data: JSON.stringify({ error: "cancelled" }) }),
          );

          self.resetState();

          return loadTask();
        } catch (err) {
          console.error("Failed to skip task ", err);
        }
      } else {
        InfoModal.warning("This mode without API calls.");
      }
    });

    /**
     * Wrapper of completion send
     * @param {string} requestType
     */
    const sendToServer = requestType => {
      return flow(function*() {
        const c = self.completionStore.selected;

        c.beforeSend();

        const savedCompletions = c.serializeCompletion();

        /**
         * Check for pending completions
         */
        if (self.hasInterface("check-empty") && savedCompletions.length === 0) {
          InfoModal.warning("You need to label at least something!");
          return;
        }

        /**
         * Loading will be true
         */
        self.markLoading(true);

        try {
          const body = JSON.stringify({
            lead_time: (new Date() - c.loadedDate) / 1000, // task execution time
            result: savedCompletions, // array with completions
          });

          if (requestType === "update_result") {
            getEnv(self).updateCompletion(JSON.parse(body));

            if (self.apiCalls) {
              yield getEnv(self).patch(
                `${API_URL.MAIN}${API_URL.TASKS}/${self.task.id}${API_URL.COMPLETIONS}/${c.pk}/`,
                body,
              );
            }
          } else if (requestType === "post_result") {
            getEnv(self).submitCompletion(JSON.parse(body));

            if (self.apiCalls) {
              const responseCompletion = yield self.post(
                `${API_URL.MAIN}${API_URL.TASKS}/${self.task.id}${API_URL.COMPLETIONS}/`,
                body,
              );

              const data = yield responseCompletion.json();
              if (data && data.id) {
                self.completionStore.selected.updatePersonalKey(data.id.toString());
              }
            }
          }

          if (hasInterface("load")) {
            self.resetState();
            return loadTask();
          } else {
            self.markLoading(false);
            self.completionStore.selected.sendUserGenerate();

            if (self.explore && self.project.id) {
              self.labeledSuccess = true;
            }
          }

          // delete state.history;
        } catch (err) {
          console.error("Failed to send task ", err);
        }
      });
    };

    /**
     * Update current completion
     */
    const updateTask = sendToServer("update_result");

    /**
     * Send current completion
     */
    const sendTask = sendToServer("post_result");

    /**
     * Function to initilaze completion store
     */
    function initializeStore({ completions, predictions }) {
      /**
       * Array of generated completions
       */
      let generatedCompletions = [];

      if (predictions && predictions.length) {
        for (let i = 0; i < predictions.length; i++) {
          const pred = self.completionStore.addPrediction(predictions[i]);
          pred.traverseTree(node => node.updateValue && node.updateValue(self));
          self.completionStore.selectPrediction(pred.id);

          pred.deserializeCompletion(predictions[i].result);
          pred.reinitHistory();
        }
      }

      /**
       * Completions in initialize
       */
      if (completions && completions.length) {
        for (let i = 0; i < completions.length; i++) {
          const itemOfCompletion = completions[i];

          /**
           * If user skip task, we skip completion state
           */
          if (itemOfCompletion.was_cancelled === true) continue;

          /**
           * Add to array new completion
           */
          generatedCompletions.push(itemOfCompletion);
        }
      }

      if (!completions || completions.length === 0) {
        const c = self.completionStore.addInitialCompletion();
        self.completionStore.selectCompletion(c.id);

        if (generatedCompletions.length > 0) {
          self.completionStore.destroyCompletion(self.completionStore.selected);

          for (let iC = 0; iC < generatedCompletions.length; iC++) {
            const comp = self.completionStore.addSavedCompletion(generatedCompletions[iC]);
            comp.traverseTree(node => node.updateValue && node.updateValue(self));
            self.completionStore.selectCompletion(comp.id);

            comp.deserializeCompletion(generatedCompletions[iC].result);
            comp.reinitHistory();
          }
        }
      } else {
        for (let iC = 0; iC < generatedCompletions.length; iC++) {
          const comp = self.completionStore.addSavedCompletion(generatedCompletions[iC]);
          comp.traverseTree(node => node.updateValue && node.updateValue(self));
          self.completionStore.selectCompletion(comp.id);

          comp.deserializeCompletion(generatedCompletions[iC].result);
          comp.reinitHistory();
        }
      }
    }

    return {
      afterCreate,
      loadTask,
      addTask,
      hasInterface,
      skipTask,
      sendTask,
      updateTask,
      markLoading,
      resetState,
      toggleSettings,
      toggleDescription,
      initializeStore,
    };
  });
