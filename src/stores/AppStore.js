import { types, getEnv, flow, getSnapshot } from "mobx-state-tree";

import Task from "./TaskStore";
import CompletionStore from "./CompletionStore";
import Hotkey from "../core/Hotkey";

const UserStore = types.model("UserStore", {
  pk: types.integer,
  firstName: types.string,
  lastName: types.string,
});

const SettingsModel = types
  .model("SettingsModel", {
    enableHotkeys: types.optional(types.boolean, true),
    enablePanelHotkeys: types.optional(types.boolean, true),
    enableTooltips: types.optional(types.boolean, true),
  })
  .actions(self => ({
    toggleHotkeys() {
      self.enableHotkeys = !self.enableHotkeys;
      if (self.enableHotkeys) {
        Hotkey.setScope("main");
      } else {
        Hotkey.setScope("none");
      }
    },

    togglePanelHotkeys() {
      self.enablePanelHotkeys = !self.enablePanelHotkeys;
    },

    toggleTooltips() {
      self.enableTooltips = !self.enableTooltips;
    },
  }));

export default types
  .model("AppStore", {
    config: types.string,

    task: types.maybeNull(Task),
    taskID: types.maybeNull(types.number),

    interfaces: types.array(types.string),

    completionStore: types.optional(CompletionStore, {
      completions: [],
    }),

    projectID: types.integer,

    expert: UserStore,

    debug: types.optional(types.boolean, true),

    settings: types.optional(SettingsModel, {}),

    showingSettings: types.optional(types.boolean, false),
    showingDescription: types.optional(types.boolean, false),
    description: types.maybeNull(types.string),

    isLoading: types.optional(types.boolean, false),
    noTask: types.optional(types.boolean, false),
    labeledSuccess: types.optional(types.boolean, false),
  })
  .views(self => ({
    get fetch() {
      return getEnv(self).fetch;
    },
    get alert() {
      return getEnv(self).alert;
    },
    get post() {
      return getEnv(self).post;
    },
  }))
  .actions(self => {
    function setDescription(text) {
      self.description = text;
    }

    function toggleSettings() {
      self.showingSettings = !self.showingSettings;
    }

    const openDescription = flow(function* openDescription() {
      let url = "/api/projects/" + self.projectID + "/expert_instruction";
      const res = yield self.fetch(url);

      if (res.status === 200) {
        res.text().then(function(text) {
          self.setDescription(text);
        });
      } else {
        self.setDescription("No instructions for this task");
      }

      self.showingDescription = true;
    });

    function closeDescription() {
      self.showingDescription = false;
    }

    function markLoading(loading) {
      self.isLoading = loading;
    }

    function hasInterface(name) {
      return self.interfaces.find(i => name === i);
    }

    const afterCreate = function() {
      if (!self.task) {
        self.loadTask();
      }

      Hotkey.addKey("ctrl+enter", self.sendTask);

      if (self.hasInterface("submit:skip")) Hotkey.addKey("ctrl+space", self.skipTask);

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

    function loadTask() {
      return self.taskID
        ? _loadTask("/api/tasks/" + self.taskID + "/")
        : _loadTask("/api/projects/" + self.projectID + "/next");
    }

    function addTask(json) {
      self.task = Task.create(json);
    }

    function resetState() {
      self.completionStore = CompletionStore.create({ completions: [] });
      const c = self.completionStore.addInitialCompletion();

      self.completionStore.selectCompletion(c.id);
    }

    function addGeneratedCompletion(data) {
      if ("completion_result" in data && !self.hasInterface("predictions:hide")) {
        const c = self.completionStore.selected;
        c.deserializeCompletion(data["completion_result"]);
        c.reinitHistory();
      }
    }

    const _loadTask = flow(function*(url) {
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

              comp.deserializeCompletion(JSON.parse(c.result));
              comp.reinitHistory();
            }
          } else {
            if (self.completionStore.selected)
              self.completionStore.selected.traverseTree(node => node.updateValue && node.updateValue(self));

            self.addGeneratedCompletion(r);
          }
        });
      } catch (err) {
        console.error("Failed to load next task ", err);
      }
    });

    const skipTask = flow(function* skipTask() {
      self.markLoading(true);

      try {
        const json = yield self.post(
          "/api/tasks/" + self.task.id + "/cancel/",
          JSON.stringify({ data: JSON.stringify({ error: "cancelled" }) }),
        );

        self.resetState();
        return loadTask();
      } catch (err) {
        console.error("Failed to skip task ", err);
      }
    });

    const sendTask = flow(function* sendTask() {
      const c = self.completionStore.selected;

      c.beforeSend();

      const res = c.serializeCompletion();

      if (self.hasInterface("submit:check-empty") && res.length === 0) {
        alert("You need to label at least something!");
        return;
      }

      self.markLoading(true);

      try {
        const state = getSnapshot(c);

        const body = JSON.stringify({
          state: JSON.stringify(state),
          result: JSON.stringify(res),
        });

        yield self.post("/api/tasks/" + self.task.id + "/completions/", body);

        if (hasInterface("submit:load")) {
          self.resetState();
          return loadTask();
        } else {
          self.markLoading(false);
          self.labeledSuccess = true;
        }

        delete state.history;
      } catch (err) {
        console.error("Failed to send task ", err);
      }
    });

    /**
     * Function to initilaze completion store
     */
    function initializeStore({ completions }) {
      const { completionStore } = self;
      let generatedCompletions = [];

      if (completions && completions.length) {
        for (var i = 0; i < completions.length; i++) {
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

      if (completionStore.completions.length === 0) {
        const c = self.completionStore.addInitialCompletion();
        self.completionStore.selectCompletion(c.id);

        if (generatedCompletions.length > 0) {
          let data = generatedCompletions[0].result;

          if (typeof generatedCompletions[0].result === "string") {
            data = JSON.parse(generatedCompletions[0].result);
          }

          c.deserializeCompletion(data);

          c.reinitHistory();
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
      markLoading,
      resetState,
      openDescription,
      closeDescription,
      setDescription,
      toggleSettings,
      initializeStore,
      addGeneratedCompletion,
    };
  });
