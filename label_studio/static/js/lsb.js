/*
 * Label Studio Backend - interlayer code that connects example server
 * implmenetation with the frontend part. At the moment it's based on
 * callbacks.
 */

const API_URL = {
  MAIN: "/api",
  TASKS: "/tasks",
  COMPLETIONS: "/completions",
  CANCEL: "/cancel",
  PROJECTS: "/projects",
  NEXT: "/next",
  EXPERT_INSRUCTIONS: "/expert_instruction",
};

const Requests = (function(window) {
  const handleResponse = res => {
    if (res.status !== 200 || res.status !== 201) {
      return res;
    } else {
      return res.json();
    }
  };

  const wrapperRequest = (url, method, headers, body) => {
    return window
      .fetch(url, {
        method: method,
        headers: headers,
        credentials: "include",
        body: body,
      })
      .then(response => handleResponse(response));
  };

  const fetcher = url => {
    return wrapperRequest(url, "GET", { Accept: "application/json" });
  };

  const fetcherAuth = async (url, data) => {
    const response = await window.fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(data.username + ":" + data.password),
      },
      credentials: "same-origin",
    });
    return handleResponse(response);
  };

  const poster = (url, body) => {
    return wrapperRequest(url, "POST", { Accept: "application/json", "Content-Type": "application/json" }, body);
  };

  const patch = (url, body) => {
    return wrapperRequest(
      url,
      "PATCH",
      {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body,
    );
  };

  const remover = (url, body) => {
    return wrapperRequest(
      url,
      "DELETE",
      {
        "Content-Type": "application/json",
      },
      body,
    );
  };

  return {
    fetcher: fetcher,
    poster: poster,
    patch: patch,
    remover: remover,
  };
})(window);

const loadNext = function(ls) {
  var url = `${API_URL.MAIN}${API_URL.PROJECTS}/1${API_URL.NEXT}`;

  try {
    const req = Requests.fetcher(url);

    req.then(function(loadedTask) {
      if (loadedTask instanceof Response && loadedTask.status === 404) {
        ls.setFlags({ isLoading: false, noTask: true });
        return;
      }

      if (loadedTask instanceof Response && loadedTask.status === 403) {
        ls.setFlags({ isLoading: false, noAccess: true });
        return;
      }

      loadedTask.json().then(response => {
        /**
         * Convert received data to string for MST support
         */
        response.data = JSON.stringify(response.data);

        /**
         * Add new data from received task
         */
        ls.resetState();
        ls.assignTask(response);
        ls.initializeStore(_convertTask(response));

        const c = ls.completionStore.addCompletion({ userGenerate: true });
        ls.completionStore.selectCompletion(c.id);

        ls.setFlags({ isLoading: false });

        // getEnv(self).onTaskLoad(self.task);
      });
    });
  } catch (err) {
    console.error("Failed to load next task ", err);
  }
};

const _convertTask = function(task) {
  // converts the task from the server format to the format
  // supported by the LS frontend
  if (!task) return;

  if (task.completions) {
    for (let tc of task.completions) {
      tc.pk = tc.id;
      tc.createdAgo = tc.created_ago;
      tc.createdBy = tc.created_username;
      tc.leadTime = tc.lead_time;
    }
  }

  if (task.predictions) {
    for (let tp of task.predictions) {
      tp.pk = tp.pk;
      tp.createdAgo = tp.created_ago;
      tp.createdBy = tp.model_version;
    }
  }

  return task;
};

const LSB = function(elid, config, task) {
  const _prepData = function(c) {
    const data = c.serializeCompletion();
    const body = JSON.stringify({
      lead_time: (new Date() - c.loadedDate) / 1000, // task execution time
      result: data,
    });

    return body;
  };

  return new LabelStudio(elid, {
    config: config,
    user: { pk: 1, firstName: "Awesome", lastName: "User" },

    task: _convertTask(task),

    interfaces: [
      "basic",
      "panel", // undo, redo, reset panel
      "controls", // all control buttons: skip, submit, update
      "submit", // submit button on controls
      "update", // update button  on controls
      "predictions:menu", // right menu with prediction items
      "completions:menu", // right menu with completion items
      "completions:add-new",
      "completions:delete",
      "side-column", // entity
    ],

    onSubmitCompletion: function(ls, c) {
      ls.setFlags({ isLoading: true });

      const req = Requests.poster(`${API_URL.MAIN}${API_URL.TASKS}/${ls.task.id}${API_URL.COMPLETIONS}/`, _prepData(c));

      req.then(function(httpres) {
        httpres.json().then(function(res) {
          if (res && res.id) c.updatePersonalKey(res.id.toString());

          if (task) {
            ls.setFlags({ isLoading: false });
          } else {
            loadNext(ls);
          }
        });
      });

      return true;
    },

    onUpdateCompletion: function(ls, c) {
      ls.setFlags({ isLoading: true });

      const req = Requests.patch(
        `${API_URL.MAIN}${API_URL.TASKS}/${ls.task.id}${API_URL.COMPLETIONS}/${c.pk}/`,
        _prepData(c),
      );

      req.then(function(httpres) {
        ls.setFlags({ isLoading: false });
      });
    },

    onDeleteCompletion: function(ls, completion) {
      ls.setFlags({ isLoading: true });

      const req = Requests.remover("/api/tasks/" + ls.task.id + "/completions/" + completion.pk + "/");
      req.then(function(httpres) {
        ls.setFlags({ isLoading: false });
      });
    },

    onSkipTask: function(ls, completion) {
      ls.setFlags({ loading: true });

      try {
        const json = Requests.post(
          `${API_URL.MAIN}${API_URL.TASKS}/${self.task.id}${API_URL.CANCEL}`,
          JSON.stringify({ data: JSON.stringify({ error: "cancelled" }) }),
        );

        self.resetState();

        return loadTask();
      } catch (err) {
        console.error("Failed to skip task ", err);
      }
    },

    onGroundTruth: function(ls, c, value) {
      Requests.patch(
        `${API_URL.MAIN}${API_URL.TASKS}/${ls.task.id}${API_URL.COMPLETIONS}/${c.pk}/`,
        JSON.stringify({ honeypot: value }),
      );
    },

    onLabelStudioLoad: function(ls) {
      var self = ls;

      if (!task) {
        ls.setFlags({ isLoading: true });
        loadNext(ls);
      } else {
          if (ls.completionStore.completions.length === 0) {
              var c = ls.completionStore.addCompletion({ userGenerate: true });
              ls.completionStore.selectCompletion(c.id);
          }
      }
    },
  });
};
